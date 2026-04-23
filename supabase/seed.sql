-- ============================================================================
-- Seed de datos demo: barberos, servicios, horarios y productos
-- Todo scopeado al shop con slug='demo' (creado por 0003_multi_tenant.sql).
-- Idempotente.
-- ============================================================================

do $$
declare demo_id uuid;
begin
  select id into demo_id from public.shops where slug = 'demo';
  if demo_id is null then
    raise exception 'Demo shop missing: run 0003_multi_tenant.sql before seeding';
  end if;

  -- Barberos
  insert into public.barbers (shop_id, name, slug, role, initials, hue, rating)
  values
    (demo_id, 'Tomás', 'tomas', 'Senior · 8 años', 'TM',  55, 4.9),
    (demo_id, 'Iván',  'ivan',  'Barbero · 4 años','IV', 200, 4.8),
    (demo_id, 'Nico',  'nico',  'Barbero · 2 años','NC', 120, 4.7)
  on conflict (shop_id, slug) do update set
    name = excluded.name,
    role = excluded.role,
    initials = excluded.initials,
    hue = excluded.hue,
    rating = excluded.rating;

  -- Servicios (idempotente por shop_id + name)
  insert into public.services (shop_id, name, description, duration_mins, price)
  select demo_id, v.name, v.description, v.duration_mins, v.price
  from (values
    ('Corte de pelo',     'Corte clásico o moderno', 30,  8500::numeric),
    ('Arreglo de barba',  'Diseño y perfilado',      20,  5500::numeric),
    ('Corte + Barba',     'Combo completo',          50, 12500::numeric),
    ('Diseño · Navaja',   'Detalles con navaja',     30,  7000::numeric)
  ) as v(name, description, duration_mins, price)
  where not exists (
    select 1 from public.services s
    where s.shop_id = demo_id and s.name = v.name
  );

  -- Schedules (lun-sáb 10:00-20:00; domingo cerrado)
  declare b record; d int;
  begin
    for b in select id from public.barbers where shop_id = demo_id loop
      for d in 1..6 loop
        insert into public.schedules (shop_id, barber_id, day_of_week, start_time, end_time, is_working)
        values (demo_id, b.id, d, '10:00', '20:00', true)
        on conflict (barber_id, day_of_week) do nothing;
      end loop;
      insert into public.schedules (shop_id, barber_id, day_of_week, start_time, end_time, is_working)
      values (demo_id, b.id, 0, '10:00', '20:00', false)
      on conflict (barber_id, day_of_week) do nothing;
    end loop;
  end;

  -- Productos (idempotente por shop_id + name)
  insert into public.products (shop_id, name, price, stock)
  select demo_id, v.name, v.price, v.stock
  from (values
    ('Pomada Mate',  6200::numeric, 14),
    ('Cera Fuerte',  5800::numeric,  9),
    ('Shampoo Barba',7400::numeric,  6),
    ('Aceite Barba', 5200::numeric, 11),
    ('Peine madera', 3200::numeric, 22)
  ) as v(name, price, stock)
  where not exists (
    select 1 from public.products p
    where p.shop_id = demo_id and p.name = v.name
  );
end $$;
