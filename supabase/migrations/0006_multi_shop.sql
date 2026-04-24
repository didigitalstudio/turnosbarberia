-- ============================================================================
-- TurnosBarbería — Multi-sede: un user puede administrar N shops.
--
-- Introduce un pivot `shop_members(profile_id, shop_id, role)` para soportar
-- el "Plan Pro con sedes ilimitadas". `profiles.shop_id` sigue siendo la sede
-- "actual" (seleccionada) del user para mantener compat con el resto de las
-- policies que usan `current_shop_id()`.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- shop_members: pivot con rol.
-- ---------------------------------------------------------------------------
create table if not exists public.shop_members (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  shop_id    uuid not null references public.shops(id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner','admin')),
  created_at timestamptz not null default now(),
  primary key (profile_id, shop_id)
);

create index if not exists shop_members_shop_idx    on public.shop_members(shop_id);
create index if not exists shop_members_profile_idx on public.shop_members(profile_id);

alter table public.shop_members enable row level security;

-- Un user ve los miembros de los shops que administra (el suyo actual) + sus
-- propias filas (para listar todas sus sedes).
drop policy if exists "shop_members self read" on public.shop_members;
create policy "shop_members self read"
  on public.shop_members for select
  using (profile_id = auth.uid() or shop_id = public.current_shop_id());

-- ---------------------------------------------------------------------------
-- Backfill: para cada profile con shop_id, crear una fila owner.
-- ---------------------------------------------------------------------------
insert into public.shop_members (profile_id, shop_id, role)
  select id, shop_id, 'owner'
  from public.profiles
  where shop_id is not null
  on conflict (profile_id, shop_id) do nothing;

-- Además: owners que crearon shops pero no tienen shop_id en profile (edge
-- case) también entran como miembros via shops.owner_id.
insert into public.shop_members (profile_id, shop_id, role)
  select owner_id, id, 'owner'
  from public.shops
  where owner_id is not null
  on conflict (profile_id, shop_id) do nothing;

-- ---------------------------------------------------------------------------
-- Trigger: al crear un shop, insertar al owner en shop_members y setear
-- profile.shop_id = nuevo shop (para que sea la sede "actual").
--
-- NOTA: este REESCRIBE el trigger handle_new_shop() de 0003. Es intencional:
-- el comportamiento anterior (is_admin + shop_id del profile) se preserva y
-- se suma el insert en shop_members.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_shop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.shop_members (profile_id, shop_id, role)
      values (new.owner_id, new.id, 'owner')
      on conflict do nothing;
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

-- ---------------------------------------------------------------------------
-- RPC: cambiar el shop "actual" del user.
-- Valida que sea miembro del shop destino.
-- ---------------------------------------------------------------------------
create or replace function public.switch_current_shop(target_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.shop_members
    where profile_id = auth.uid() and shop_id = target_shop_id
  ) then
    raise exception 'No sos miembro de ese shop';
  end if;
  update public.profiles set shop_id = target_shop_id where id = auth.uid();
end $$;

grant execute on function public.switch_current_shop(uuid) to authenticated;
