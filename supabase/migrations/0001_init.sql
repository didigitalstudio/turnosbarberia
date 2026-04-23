-- ============================================================================
-- El Estudio BarberShop — initial schema + RLS
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ENUMs
do $$ begin
  create type appointment_status as enum ('pending','confirmed','in_progress','completed','cancelled','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_type as enum ('service','product');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('efectivo','transferencia','debito','credito');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- profiles (1:1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  phone       text,
  email       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- barbers
-- ============================================================================
create table if not exists public.barbers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  role        text,
  initials    text not null,
  hue         int  not null default 55,
  bio         text,
  is_active   boolean not null default true,
  rating      numeric(2,1) not null default 5.0,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- services
-- ============================================================================
create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  duration_mins int  not null check (duration_mins > 0),
  price         numeric(10,2) not null check (price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- schedules (working hours per barber per weekday)
-- ============================================================================
create table if not exists public.schedules (
  id          uuid primary key default gen_random_uuid(),
  barber_id   uuid not null references public.barbers(id) on delete cascade,
  day_of_week int  not null check (day_of_week between 0 and 6),
  start_time  text not null,
  end_time    text not null,
  is_working  boolean not null default true,
  unique(barber_id, day_of_week)
);

-- ============================================================================
-- appointments
-- ============================================================================
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete set null,
  barber_id       uuid not null references public.barbers(id) on delete restrict,
  service_id      uuid not null references public.services(id) on delete restrict,
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text not null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          appointment_status not null default 'pending',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists appointments_barber_starts_idx on public.appointments(barber_id, starts_at);
create index if not exists appointments_profile_idx on public.appointments(profile_id);
create index if not exists appointments_starts_idx on public.appointments(starts_at);

-- prevent overlapping appointments per barber (excluding cancelled)
create extension if not exists btree_gist;

alter table public.appointments
  drop constraint if exists appointments_no_overlap;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status not in ('cancelled','no_show'));

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists touch_appointments on public.appointments;
create trigger touch_appointments
  before update on public.appointments
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- products
-- ============================================================================
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(10,2) not null,
  stock       int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- sales (caja)
-- ============================================================================
create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  type            sale_type not null,
  appointment_id  uuid references public.appointments(id) on delete set null,
  product_id      uuid references public.products(id) on delete set null,
  amount          numeric(10,2) not null,
  payment_method  payment_method not null default 'efectivo',
  customer_name   text,
  created_at      timestamptz not null default now()
);

create index if not exists sales_created_idx on public.sales(created_at);

-- ============================================================================
-- helpers
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.barbers       enable row level security;
alter table public.services      enable row level security;
alter table public.schedules     enable row level security;
alter table public.appointments  enable row level security;
alter table public.products      enable row level security;
alter table public.sales         enable row level security;

-- profiles: user reads/updates own row, admin reads all
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles admin read"  on public.profiles;
create policy "profiles self read"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles self update"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles admin read"
  on public.profiles for select using (public.is_admin());

-- barbers/services/schedules: public read for booking flow
drop policy if exists "barbers public read"   on public.barbers;
drop policy if exists "services public read"  on public.services;
drop policy if exists "schedules public read" on public.schedules;
create policy "barbers public read"
  on public.barbers for select using (true);
create policy "services public read"
  on public.services for select using (true);
create policy "schedules public read"
  on public.schedules for select using (true);

-- only admin can mutate barbers/services/schedules
drop policy if exists "barbers admin write"   on public.barbers;
drop policy if exists "services admin write"  on public.services;
drop policy if exists "schedules admin write" on public.schedules;
create policy "barbers admin write"
  on public.barbers for all using (public.is_admin()) with check (public.is_admin());
create policy "services admin write"
  on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy "schedules admin write"
  on public.schedules for all using (public.is_admin()) with check (public.is_admin());

-- appointments: anyone (even guest) can insert; users see/cancel their own; admin sees all
drop policy if exists "appointments insert anon"  on public.appointments;
drop policy if exists "appointments self read"    on public.appointments;
drop policy if exists "appointments self update"  on public.appointments;
drop policy if exists "appointments admin read"   on public.appointments;
drop policy if exists "appointments admin write"  on public.appointments;
create policy "appointments insert anon"
  on public.appointments for insert
  with check (true);
create policy "appointments self read"
  on public.appointments for select
  using (auth.uid() = profile_id);
create policy "appointments self update"
  on public.appointments for update
  using (auth.uid() = profile_id and starts_at > now());
create policy "appointments admin read"
  on public.appointments for select using (public.is_admin());
create policy "appointments admin write"
  on public.appointments for all using (public.is_admin()) with check (public.is_admin());

-- products & sales: admin only (shop side)
drop policy if exists "products admin"  on public.products;
drop policy if exists "products read"   on public.products;
drop policy if exists "sales admin"     on public.sales;
create policy "products read"
  on public.products for select using (true);
create policy "products admin"
  on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "sales admin"
  on public.sales for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- realtime publication (for live agenda updates)
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.appointments;
exception when duplicate_object then null;
when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.sales;
exception when duplicate_object then null;
when others then null;
end $$;
