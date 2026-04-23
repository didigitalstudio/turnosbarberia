-- Re-aplica nombres y descripciones con encoding UTF-8 correcto.
-- Idempotente.

update public.barbers set name = 'Tomás', role = 'Senior · 8 años' where slug = 'tomas';
update public.barbers set name = 'Iván',  role = 'Barbero · 4 años' where slug = 'ivan';
update public.barbers set                   role = 'Barbero · 2 años' where slug = 'lucas';

update public.services set name = 'Arreglo de barba',
                           description = 'Diseño y perfilado'
  where name like 'Arreglo%';
update public.services set name = 'Diseño · Navaja',
                           description = 'Detalles con navaja'
  where name like 'Dise%Navaja';
