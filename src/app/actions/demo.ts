'use server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { DEMO, DEMO_NOTE, DEMO_SALE_TAG } from '@/lib/demo';

type Role = 'cliente' | 'dueno';

const DEMO_COOLDOWN_COOKIE = 'demo_cd';
const DEMO_COOLDOWN_SECS = 8;

// Wrappers sin args (Promise<void>) para usarlos como `form action` desde
// server components de la landing. En caso de éxito `enterDemo` hace
// `redirect()` que tira NEXT_REDIRECT; en caso de error controlado
// (cooldown, shop demo faltante) redirigimos a /login con un query param
// para no devolver payload.
export async function enterDemoCliente(): Promise<void> {
  const r = await enterDemo('cliente');
  if (r?.error) redirect(`/login?demo=err&m=${encodeURIComponent(r.error)}`);
}
export async function enterDemoDueno(): Promise<void> {
  const r = await enterDemo('dueno');
  if (r?.error) redirect(`/login?demo=err&m=${encodeURIComponent(r.error)}`);
}

function randomPassword(): string {
  return randomBytes(18).toString('base64url');
}

export async function enterDemo(role: Role) {
  // Throttle: evita spam de enterDemo (que reinicia password y data).
  const cookieStore = cookies();
  const cd = cookieStore.get(DEMO_COOLDOWN_COOKIE)?.value;
  if (cd) {
    const ts = parseInt(cd, 10);
    if (Number.isFinite(ts) && Date.now() - ts < DEMO_COOLDOWN_SECS * 1000) {
      return { error: 'Esperá unos segundos entre intentos.' };
    }
  }
  cookieStore.set(DEMO_COOLDOWN_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60
  });

  const account = DEMO[role];
  const admin = createAdminClient();

  const { data: demoShop } = await admin
    .from('shops').select('id, slug').eq('slug', 'demo').maybeSingle<{ id: string; slug: string }>();
  if (!demoShop) return { error: 'Falta el shop demo. Aplicá el seed inicial.' };

  // Password random en cada login → el atacante no puede loguearse offline
  // con la misma pass.
  const sessionPassword = randomPassword();

  let userId: string | null = null;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u: any) => u.email === account.email);
  if (existing) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(existing.id, { password: sessionPassword, email_confirm: true });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: sessionPassword,
      email_confirm: true,
      user_metadata: { name: account.name, phone: account.phone }
    });
    if (error) return { error: 'No se pudo crear cuenta demo: ' + error.message };
    userId = data.user.id;
  }

  await admin.from('profiles').upsert({
    id: userId!,
    name: account.name,
    email: account.email,
    phone: account.phone,
    is_admin: role === 'dueno',
    shop_id: demoShop.id
  });

  const seedErr = await ensureDemoData(demoShop.id);
  if (seedErr) return { error: seedErr };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: sessionPassword
  });
  if (error) return { error: 'No se pudo iniciar sesión demo: ' + error.message };

  revalidatePath('/', 'layout');
  redirect(role === 'dueno' ? '/shop' : `/s/${demoShop.slug}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ensureDemoData — idempotent. Reseeds today's data if missing.
// Cleans up demo records older than 7 days.
// ─────────────────────────────────────────────────────────────────────────────

async function ensureDemoData(shopId: string): Promise<string | null> {
  const admin = createAdminClient();
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 86400000);

  // Cleanup: appointments demo más viejos que 35d, sales/expenses >40d.
  // (Mantenemos historial para que el dashboard muestre "últimos 30 días".)
  const forty = new Date(Date.now() - 40 * 86400000).toISOString();
  const thirtyFive = new Date(Date.now() - 35 * 86400000).toISOString();
  await admin.from('appointments').delete().eq('shop_id', shopId).like('notes', `${DEMO_NOTE}%`).lt('starts_at', thirtyFive);
  await admin.from('sales').delete().eq('shop_id', shopId).like('customer_name', `%${DEMO_SALE_TAG}`).lt('created_at', forty);
  await admin.from('expenses').delete().eq('shop_id', shopId).like('description', `%${DEMO_SALE_TAG}`).lt('paid_at', forty);

  // Already seeded for today?
  const { count } = await admin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .like('notes', `${DEMO_NOTE}%`)
    .gte('starts_at', today.toISOString())
    .lt('starts_at', tomorrow.toISOString());
  if ((count ?? 0) >= 8) return null;

  // Wipe partial demo data for today/future to avoid overlap conflicts
  await admin.from('appointments').delete().eq('shop_id', shopId).like('notes', `${DEMO_NOTE}%`).gte('starts_at', today.toISOString());
  await admin.from('sales').delete().eq('shop_id', shopId).like('customer_name', `%${DEMO_SALE_TAG}`).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString());

  // Lookups (all scoped to demo shop)
  const [{ data: barbers }, { data: services }, { data: clienteProfile }, { data: products }] = await Promise.all([
    admin.from('barbers').select('id, slug').eq('shop_id', shopId).order('created_at'),
    admin.from('services').select('id, name, duration_mins, price').eq('shop_id', shopId),
    admin.from('profiles').select('id').eq('email', DEMO.cliente.email).maybeSingle(),
    admin.from('products').select('id, name, price').eq('shop_id', shopId)
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
    { time: '11:00', barber: 'nico', service: 'Arreglo de barba',  name: 'Juan P.',    status: 'in_progress' },
    { time: '11:30', barber: 'tomas', service: 'Corte de pelo',     name: 'Santi G.',   status: 'confirmed' },
    { time: '12:00', barber: 'ivan',  service: 'Diseño · Navaja',   name: 'Nacho V.',   status: 'confirmed' },
    { time: '14:00', barber: 'tomas', service: 'Corte + Barba',     name: 'Bruno A.',   status: 'confirmed' },
    { time: '14:30', barber: 'nico', service: 'Corte de pelo',     name: 'Pedro M.',   status: 'confirmed' },
    { time: '15:30', barber: 'ivan',  service: 'Corte de pelo',     name: 'Joaquín D.', status: 'confirmed' },
    { time: '16:00', barber: 'tomas', service: 'Arreglo de barba',  name: 'Agustín B.', status: 'confirmed' },
    { time: '17:00', barber: 'nico', service: 'Corte + Barba',     name: 'Martín K.',  status: 'confirmed' }
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
      shop_id: shopId,
      profile_id: s.clientLink ? clienteId : null,
      barber_id: barberId,
      service_id: svc.id,
      customer_name: s.name,
      customer_phone: '+54 9 11 5500 0000',
      customer_email: s.clientLink ? DEMO.cliente.email : 'demo@turnosbarberia.app',
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
        shop_id: shopId,
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
        shop_id: shopId,
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
      shop_id: shopId,
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

  // ───── Historial 30 días: sales + expenses (para dashboard) ─────
  // Si ya existe historial reciente (>10 rows en últimos 30d), no regeneramos.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: histCount } = await admin
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .like('customer_name', `%${DEMO_SALE_TAG}`)
    .gte('created_at', thirtyDaysAgo)
    .lt('created_at', startOfDay(new Date()).toISOString());
  if ((histCount ?? 0) < 20) {
    const histSales: any[] = [];
    const servicePrices = [8500, 12500, 5500, 7000];
    const productMap = [
      { name: 'Pomada Mate',  price: 6200 },
      { name: 'Cera Fuerte',  price: 5800 },
      { name: 'Shampoo Barba', price: 7400 },
      { name: 'Aceite Barba', price: 5200 },
      { name: 'Peine madera', price: 3200 }
    ];
    const methods: Array<'efectivo'|'transferencia'|'debito'|'credito'> = ['efectivo','transferencia','debito','credito'];
    const clientNames = ['Carlos P.', 'Diego L.', 'Facu S.', 'Martín C.', 'Juan M.', 'Bruno V.', 'Nico D.', 'Tomás H.', 'Agus R.', 'Fede N.'];
    // ~3-5 ventas/día x 30 días = ~120
    for (let d = 30; d >= 1; d--) {
      const day = new Date(today.getTime() - d * 86400000);
      if (day.getDay() === 0) continue; // domingo cerrado
      const count = 2 + Math.floor(Math.random() * 4); // 2-5 ventas
      for (let i = 0; i < count; i++) {
        const hour = 10 + Math.floor(Math.random() * 10);
        const min = Math.floor(Math.random() * 60);
        const at = new Date(day); at.setHours(hour, min, 0, 0);
        const isProduct = Math.random() < 0.25;
        if (isProduct) {
          const p = productMap[Math.floor(Math.random() * productMap.length)];
          histSales.push({
            shop_id: shopId,
            type: 'product',
            product_id: findProduct(p.name)?.id || null,
            amount: p.price,
            payment_method: methods[Math.floor(Math.random() * methods.length)],
            customer_name: clientNames[Math.floor(Math.random() * clientNames.length)] + DEMO_SALE_TAG,
            created_at: at.toISOString()
          });
        } else {
          histSales.push({
            shop_id: shopId,
            type: 'service',
            amount: servicePrices[Math.floor(Math.random() * servicePrices.length)],
            payment_method: methods[Math.floor(Math.random() * methods.length)],
            customer_name: clientNames[Math.floor(Math.random() * clientNames.length)] + DEMO_SALE_TAG,
            created_at: at.toISOString()
          });
        }
      }
    }
    if (histSales.length > 0) {
      const { error } = await admin.from('sales').insert(histSales);
      if (error) return 'Insert hist sales: ' + error.message;
    }
  }

  // Expenses: asegurar algunos en los últimos 30 días + hoy.
  const { count: expCount } = await admin
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .like('description', `%${DEMO_SALE_TAG}`)
    .gte('paid_at', thirtyDaysAgo);
  if ((expCount ?? 0) < 6) {
    const expensePlan = [
      { category: 'alquiler',  description: 'Alquiler local'    + DEMO_SALE_TAG, amount: 280000, daysAgo: 2,  method: 'transferencia' as const },
      { category: 'servicios', description: 'Luz + agua'         + DEMO_SALE_TAG, amount: 48000,  daysAgo: 5,  method: 'debito' as const },
      { category: 'servicios', description: 'Internet'           + DEMO_SALE_TAG, amount: 18000,  daysAgo: 8,  method: 'debito' as const },
      { category: 'insumos',   description: 'Reposición gel/spray' + DEMO_SALE_TAG, amount: 62000,  daysAgo: 12, method: 'efectivo' as const },
      { category: 'insumos',   description: 'Toallas descartables' + DEMO_SALE_TAG, amount: 22500,  daysAgo: 18, method: 'efectivo' as const },
      { category: 'sueldos',   description: 'Comisión barberos'    + DEMO_SALE_TAG, amount: 450000, daysAgo: 25, method: 'transferencia' as const },
      { category: 'otros',     description: 'Café + descartables'  + DEMO_SALE_TAG, amount: 15000,  daysAgo: 1,  method: 'efectivo' as const }
    ];
    const expRows = expensePlan.map(e => {
      const at = new Date(today.getTime() - e.daysAgo * 86400000);
      at.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
      return {
        shop_id: shopId,
        category: e.category,
        description: e.description,
        amount: e.amount,
        payment_method: e.method,
        paid_at: at.toISOString()
      };
    });
    const { error: expErr } = await admin.from('expenses').insert(expRows);
    if (expErr) return 'Insert expenses: ' + expErr.message;
  }

  return null;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
