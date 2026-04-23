-- ============================================================================
-- Seed inicial: barberos, servicios, horarios y productos
-- Idempotente: usa upsert por slug/name
-- ============================================================================

insert into public.barbers (name, slug, role, initials, hue, rating)
values
  ('Tomás', 'tomas', 'Senior · 8 años', 'TM',  55, 4.9),
  ('Iván',  'ivan',  'Barbero · 4 años','IV', 200, 4.8),
  ('Lucas', 'lucas', 'Barbero · 2 años','LC', 120, 4.7)
on conflict (slug) do update set
  name = excluded.name,
  role = excluded.role,
  initials = excluded.initials,
  hue = excluded.hue,
  rating = excluded.rating;

insert into public.services (name, description, duration_mins, price)
values
  ('Corte de pelo',     'Corte clásico o moderno',                30,  8500),
  ('Arreglo de barba',  'Diseño y perfilado',                     20,  5500),
  ('Corte + Barba',     'Combo completo',                         50, 12500),
  ('Diseño · Navaja',   'Detalles con navaja',                    30,  7000)
on conflict do nothing;

-- Schedules: Lunes a Sábado 10:00–20:00 para los 3 barberos
do $$
declare
  b record;
  d int;
begin
  for b in select id from public.barbers loop
    for d in 1..6 loop
      insert into public.schedules (barber_id, day_of_week, start_time, end_time, is_working)
      values (b.id, d, '10:00', '20:00', true)
      on conflict (barber_id, day_of_week) do nothing;
    end loop;
    -- Domingo cerrado
    insert into public.schedules (barber_id, day_of_week, start_time, end_time, is_working)
    values (b.id, 0, '10:00', '20:00', false)
    on conflict (barber_id, day_of_week) do nothing;
  end loop;
end $$;

insert into public.products (name, price, stock)
values
  ('Pomada Mate',  6200, 14),
  ('Cera Fuerte',  5800,  9),
  ('Shampoo Barba',7400,  6),
  ('Aceite Barba', 5200, 11),
  ('Peine madera', 3200, 22)
on conflict do nothing;
