-- ============================================================================
-- TurnosBarbería — multi-tenant: introduce `shops` and scope all data by shop_id.
--
-- Safe to re-run: uses `if not exists` / `drop policy if exists` / conditional
-- backfill to the demo shop when previous rows had no shop_id.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- shops
-- ---------------------------------------------------------------------------
create table if not exists public.shops (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  address     text,
  phone       text,
  timezone    text not null default 'America/Argentina/Buenos_Aires',
  owner_id    uuid references auth.users(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists shops_owner_idx on public.shops(owner_id);

-- Demo shop (idempotent upsert). Every pre-existing row is backfilled to this.
insert into public.shops (slug, name, address, timezone)
values ('demo', 'Barbería Demo', null, 'America/Argentina/Buenos_Aires')
on conflict (slug) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- profiles.shop_id  (qué shop administra este user, si es admin)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists shop_id uuid references public.shops(id) on delete set null;

create index if not exists profiles_shop_idx on public.profiles(shop_id);

-- ---------------------------------------------------------------------------
-- Add shop_id to all domain tables, backfill to the demo shop, then NOT NULL.
-- ---------------------------------------------------------------------------
do $$
declare demo_id uuid;
begin
  select id into demo_id from public.shops where slug = 'demo';

  -- barbers
  alter table public.barbers
    add column if not exists shop_id uuid references public.shops(id) on delete cascade;
  update public.barbers set shop_id = demo_id where shop_id is null;
  alter table public.barbers alter column shop_id set not null;

  -- services
  alter table public.services
    add column if not exists shop_id uuid references public.shops(id) on delete cascade;
  update public.services set shop_id = demo_id where shop_id is null;
  alter table public.services alter column shop_id set not null;

  -- schedules (redundante vía barber, pero lo duplicamos para que RLS sea directa)
  alter table public.schedules
    add column if not exists shop_id uuid references public.shops(id) on delete cascade;
  update public.schedules s
    set shop_id = b.shop_id
    from public.barbers b
    where s.barber_id = b.id and s.shop_id is null;
  alter table public.schedules alter column shop_id set not null;

  -- appointments
  alter table public.appointments
    add column if not exists shop_id uuid references public.shops(id) on delete cascade;
  update public.appointments set shop_id = demo_id where shop_id is null;
  alter table public.appointments alter column shop_id set not null;

  -- products
  alter table public.products
    add column if not exists shop_id uuid references public.shops(id) on delete cascade;
  update public.products set shop_id = demo_id where shop_id is null;
  alter table public.products alter column shop_id set not null;

  -- sales
  alter table public.sales
    add column if not exists shop_id uuid references public.shops(id) on delete cascade;
  update public.sales set shop_id = demo_id where shop_id is null;
  alter table public.sales alter column shop_id set not null;

  -- Profiles con is_admin=true y sin shop_id → backfill al demo, para que los
  -- dueños existentes sigan viendo la misma data.
  update public.profiles set shop_id = demo_id where is_admin and shop_id is null;
end $$;

-- ---------------------------------------------------------------------------
-- Scope unique constraints by shop_id.
-- barbers.slug era único global; ahora debe ser único por shop.
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.barbers drop constraint if exists barbers_slug_key;
exception when undefined_object then null; end $$;

create unique index if not exists barbers_shop_slug_uniq
  on public.barbers (shop_id, slug);

-- ---------------------------------------------------------------------------
-- Indexes para queries por shop (agenda, caja, etc.)
-- ---------------------------------------------------------------------------
create index if not exists appointments_shop_starts_idx on public.appointments(shop_id, starts_at);
create index if not exists sales_shop_created_idx       on public.sales(shop_id, created_at);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_shop_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select shop_id from public.profiles where id = auth.uid();
$$;

-- Mantener compat: is_admin() sigue respondiendo bool.
-- (Ya existe en 0001; no la redefinimos.)

-- ---------------------------------------------------------------------------
-- RLS: rehacer policies para que todo lo admin-side esté gateado por shop_id.
-- ---------------------------------------------------------------------------

-- shops: public select (clientes consultan por slug); admin escribe solo el propio.
alter table public.shops enable row level security;
drop policy if exists "shops public read" on public.shops;
drop policy if exists "shops owner write" on public.shops;
create policy "shops public read"
  on public.shops for select using (true);
create policy "shops owner write"
  on public.shops for all
  using (owner_id = auth.uid() or id = public.current_shop_id())
  with check (owner_id = auth.uid() or id = public.current_shop_id());

-- barbers/services/schedules: public read sigue libre (reserva abierta);
-- write requiere admin AND su shop.
drop policy if exists "barbers admin write"   on public.barbers;
drop policy if exists "services admin write"  on public.services;
drop policy if exists "schedules admin write" on public.schedules;
create policy "barbers admin write"
  on public.barbers for all
  using (public.is_admin() and shop_id = public.current_shop_id())
  with check (public.is_admin() and shop_id = public.current_shop_id());
create policy "services admin write"
  on public.services for all
  using (public.is_admin() and shop_id = public.current_shop_id())
  with check (public.is_admin() and shop_id = public.current_shop_id());
create policy "schedules admin write"
  on public.schedules for all
  using (public.is_admin() and shop_id = public.current_shop_id())
  with check (public.is_admin() and shop_id = public.current_shop_id());

-- appointments: reemplazamos las policies admin para scopear por shop.
-- insert anon queda igual (cualquiera puede crear un turno pasando shop_id).
-- self read/update quedan igual (por profile_id).
drop policy if exists "appointments admin read"  on public.appointments;
drop policy if exists "appointments admin write" on public.appointments;
create policy "appointments admin read"
  on public.appointments for select
  using (public.is_admin() and shop_id = public.current_shop_id());
create policy "appointments admin write"
  on public.appointments for all
  using (public.is_admin() and shop_id = public.current_shop_id())
  with check (public.is_admin() and shop_id = public.current_shop_id());

-- products/sales admin: scopear por shop.
drop policy if exists "products admin" on public.products;
drop policy if exists "sales admin"    on public.sales;
create policy "products admin"
  on public.products for all
  using (public.is_admin() and shop_id = public.current_shop_id())
  with check (public.is_admin() and shop_id = public.current_shop_id());
create policy "sales admin"
  on public.sales for all
  using (public.is_admin() and shop_id = public.current_shop_id())
  with check (public.is_admin() and shop_id = public.current_shop_id());

-- ---------------------------------------------------------------------------
-- Trigger: cuando se crea un shop, el owner_id queda como admin de ese shop.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_shop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    update public.profiles
      set is_admin = true, shop_id = new.id
      where id = new.owner_id;
  end if;
  return new;
end $$;

drop trigger if exists on_shop_created on public.shops;
create trigger on_shop_created
  after insert on public.shops
  for each row execute function public.handle_new_shop();
