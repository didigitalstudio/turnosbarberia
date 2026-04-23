'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { DEMO, DEMO_NOTE, DEMO_SALE_TAG } from '@/lib/demo';

type Role = 'cliente' | 'dueno';

export async function enterDemo(role: Role) {
  const account = DEMO[role];
  const admin = createAdminClient();

  // 1. Ensure user exists
  let userId: string | null = null;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u: any) => u.email === account.email);
  if (existing) {
    userId = existing.id;
    // Make sure password matches our known one (in case it was changed)
    await admin.auth.admin.updateUserById(existing.id, { password: account.password, email_confirm: true });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { name: account.name, phone: account.phone }
    });
    if (error) return { error: 'No se pudo crear cuenta demo: ' + error.message };
    userId = data.user.id;
  }

  // 2. Upsert profile (set is_admin for dueño)
  await admin.from('profiles').upsert({
    id: userId!,
    name: account.name,
    email: account.email,
    phone: account.phone,
    is_admin: role === 'dueno'
  });

  // 3. Refresh demo data if needed
  const seedErr = await ensureDemoData();
  if (seedErr) return { error: seedErr };

  // 4. Sign in (cookies set by createClient)
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password
  });
  if (error) return { error: 'No se pudo iniciar sesión demo: ' + error.message };

  revalidatePath('/', 'layout');
  redirect(role === 'dueno' ? '/shop' : '/');
}

// ─────────────────────────────────────────────────────────────────────────────
// ensureDemoData — idempotent. Reseeds today's data if missing.
// Cleans up demo records older than 7 days.
// ─────────────────────────────────────────────────────────────────────────────

async function ensureDemoData(): Promise<string | null> {
  const admin = createAdminClient();
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 86400000);

  // Cleanup demo data older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  await admin.from('appointments').delete().like('notes', `${DEMO_NOTE}%`).lt('starts_at', sevenDaysAgo);
  await admin.from('sales').delete().like('customer_name', `%${DEMO_SALE_TAG}`).lt('created_at', sevenDaysAgo);

  // Already seeded for today?
  const { count } = await admin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .like('notes', `${DEMO_NOTE}%`)
    .gte('starts_at', today.toISOString())
    .lt('starts_at', tomorrow.toISOString());
  if ((count ?? 0) >= 8) return null;

  // Wipe partial demo data for today/future to avoid overlap conflicts
  await admin.from('appointments').delete().like('notes', `${DEMO_NOTE}%`).gte('starts_at', today.toISOString());
  await admin.from('sales').delete().like('customer_name', `%${DEMO_SALE_TAG}`).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString());

  // Lookups
  const [{ data: barbers }, { data: services }, { data: clienteProfile }, { data: products }] = await Promise.all([
    admin.from('barbers').select('id, slug').order('created_at'),
    admin.from('services').select('id, name, duration_mins, price'),
    admin.from('profiles').select('id').eq('email', DEMO.cliente.email).maybeSingle(),
    admin.from('products').select('id, name, price')
  ]);

  if (!barbers || barbers.length === 0 || !services || services.length === 0) {
    return 'Faltan barberos/servicios. Aplicá el seed inicial primero.';
  }

  const findBarber  = (slug: string) => (barbers as any[]).find(b => b.slug === slug)?.id as string | undefined;
  const findService = (name: string) => (services as any[]).find(s => s.name === name) as { id: string; duration_mins: number; price: number } | undefined;
  const findProduct = (name: string) => (products as any[] || []).find(p => p.name === name) as { id: string; price: number } | undefined;
  const clienteId = (clienteProfile as any)?.id || null;

  // ───── Today's shop agenda (10 turnos, no se solapan por barbero) ─────
  type Seed = { time: string; barber: string; service: string; name: string; status: string; clientLink?: boolean };
  const seeds: Seed[] = [
    { time: '10:00', barber: 'tomas', service: 'Corte + Barba',     name: 'Matías R.',  status: 'completed' },
    { time: '10:30', barber: 'ivan',  service: 'Corte de pelo',     name: 'Fede L.',    status: 'completed' },
    { time: '11:00', barber: 'lucas', service: 'Arreglo de barba',  name: 'Juan P.',    status: 'in_progress' },
    { time: '11:30', barber: 'tomas', service: 'Corte de pelo',     name: 'Santi G.',   status: 'confirmed' },
    { time: '12:00', barber: 'ivan',  service: 'Diseño · Navaja',   name: 'Nacho V.',   status: 'confirmed' },
    { time: '14:00', barber: 'tomas', service: 'Corte + Barba',     name: 'Bruno A.',   status: 'confirmed' },
    { time: '14:30', barber: 'lucas', service: 'Corte de pelo',     name: 'Pedro M.',   status: 'confirmed' },
    { time: '15:30', barber: 'ivan',  service: 'Corte de pelo',     name: 'Joaquín D.', status: 'confirmed' },
    { time: '16:00', barber: 'tomas', service: 'Arreglo de barba',  name: 'Agustín B.', status: 'confirmed' },
    { time: '17:00', barber: 'lucas', service: 'Corte + Barba',     name: 'Martín K.',  status: 'confirmed' }
  ];

  // Demo client's own upcoming appointment today (different time so no conflict with above)
  if (clienteId) {
    seeds.push({ time: '18:30', barber: 'tomas', service: 'Corte + Barba', name: DEMO.cliente.name, status: 'confirmed', clientLink: true });
  }

  const inserts: any[] = [];
  for (const s of seeds) {
    const svc = findService(s.service);
    const barberId = findBarber(s.barber);
    if (!svc || !barberId) continue;
    const [h, m] = s.time.split(':').map(Number);
    const start = new Date(today); start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + svc.duration_mins * 60_000);
    inserts.push({
      profile_id: s.clientLink ? clienteId : null,
      barber_id: barberId,
      service_id: svc.id,
      customer_name: s.name,
      customer_phone: '+54 9 11 5500 0000',
      customer_email: s.clientLink ? DEMO.cliente.email : 'demo@elestudio.app',
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: s.status,
      notes: DEMO_NOTE
    });
  }

  // Demo client future + past
  if (clienteId) {
    const futureSeeds = [
      { addDays: 4,  time: '17:00', service: 'Corte de pelo', barber: 'tomas' },
      { addDays: 21, time: '18:30', service: 'Corte + Barba', barber: 'ivan'  }
    ];
    for (const f of futureSeeds) {
      const svc = findService(f.service);
      const barberId = findBarber(f.barber);
      if (!svc || !barberId) continue;
      const d = new Date(today.getTime() + f.addDays * 86400000);
      const [h, m] = f.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      inserts.push({
        profile_id: clienteId, barber_id: barberId, service_id: svc.id,
        customer_name: DEMO.cliente.name, customer_phone: DEMO.cliente.phone,
        customer_email: DEMO.cliente.email,
        starts_at: d.toISOString(), ends_at: new Date(d.getTime() + svc.duration_mins * 60_000).toISOString(),
        status: 'confirmed', notes: DEMO_NOTE
      });
    }
    const pastSeeds = [
      { subDays: 13, time: '11:00', service: 'Corte + Barba', barber: 'tomas' },
      { subDays: 27, time: '17:00', service: 'Corte de pelo', barber: 'tomas' }
    ];
    for (const p of pastSeeds) {
      const svc = findService(p.service);
      const barberId = findBarber(p.barber);
      if (!svc || !barberId) continue;
      const d = new Date(today.getTime() - p.subDays * 86400000);
      const [h, m] = p.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      inserts.push({
        profile_id: clienteId, barber_id: barberId, service_id: svc.id,
        customer_name: DEMO.cliente.name, customer_phone: DEMO.cliente.phone,
        customer_email: DEMO.cliente.email,
        starts_at: d.toISOString(), ends_at: new Date(d.getTime() + svc.duration_mins * 60_000).toISOString(),
        status: 'completed', notes: DEMO_NOTE
      });
    }
  }

  if (inserts.length > 0) {
    const { error } = await admin.from('appointments').insert(inserts);
    if (error) return 'Insert appointments: ' + error.message;
  }

  // ───── Demo sales (caja del día) ─────
  type SaleSeed = { hour: number; min: number; type: 'service'|'product'; productName?: string; amount: number; who: string; method: 'efectivo'|'transferencia'|'debito'|'credito' };
  const salesSeeds: SaleSeed[] = [
    { hour: 10, min: 35, type: 'service',                              amount: 12500, who: 'Matías R.',  method: 'efectivo' },
    { hour: 10, min: 58, type: 'service',                              amount: 8500,  who: 'Fede L.',    method: 'transferencia' },
    { hour: 11, min: 2,  type: 'product', productName: 'Pomada Mate', amount: 6200,  who: 'Fede L.',    method: 'transferencia' },
    { hour: 11, min: 25, type: 'service',                              amount: 5500,  who: 'Juan P.',    method: 'debito' },
    { hour: 11, min: 30, type: 'product', productName: 'Aceite Barba', amount: 5200, who: 'Juan P.',    method: 'debito' }
  ];
  const salesInserts = salesSeeds.map(s => {
    const created = new Date(today); created.setHours(s.hour, s.min, 0, 0);
    return {
      type: s.type,
      product_id: s.productName ? findProduct(s.productName)?.id || null : null,
      amount: s.amount,
      payment_method: s.method,
      customer_name: s.who + DEMO_SALE_TAG,
      created_at: created.toISOString()
    };
  });
  if (salesInserts.length > 0) {
    const { error } = await admin.from('sales').insert(salesInserts);
    if (error) return 'Insert sales: ' + error.message;
  }

  return null;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
