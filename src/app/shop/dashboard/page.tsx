import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop } from '@/lib/shop-context';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Period = 'hoy' | 'semana' | 'mes' | '30d';

const LABELS: Record<Period, string> = {
  hoy: 'Hoy',
  semana: 'Esta semana',
  mes: 'Este mes',
  '30d': 'Últimos 30 días'
};

function periodRange(p: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (p === 'hoy') {
    return { start, end };
  }
  if (p === 'semana') {
    // Semana empieza lunes.
    const dow = start.getDay();
    const diff = (dow + 6) % 7;
    start.setDate(start.getDate() - diff);
    return { start, end };
  }
  if (p === 'mes') {
    start.setDate(1);
    return { start, end };
  }
  // 30d
  start.setDate(start.getDate() - 29);
  return { start, end };
}

export default async function DashboardPage({ searchParams }: { searchParams: { p?: string } }) {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');

  const period = (['hoy', 'semana', 'mes', '30d'].includes(searchParams.p || '') ? searchParams.p : '30d') as Period;
  const { start, end } = periodRange(period);
  const isPro = (shop.plan || '').toLowerCase() === 'pro';

  const supabase = createClient();

  // Caja (sales/expenses) es feature Pro. En Starter skipeamos las queries
  // y no renderizamos el bloque "Resumen de caja" — el dueño no tiene UI
  // para cargar egresos en Starter, así que mostrar Egresos $0 confunde.
  const [
    { data: sales },
    { data: expenses },
    { data: appts },
    { data: barbers },
    { data: services }
  ] = await Promise.all([
    isPro
      ? supabase
          .from('sales')
          .select('id, amount, created_at, type, appointment_id, product_id, description')
          .eq('shop_id', shop.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
      : Promise.resolve({ data: [] as any[] } as any),
    isPro
      ? supabase
          .from('expenses')
          .select('id, amount, paid_at, category')
          .eq('shop_id', shop.id)
          .gte('paid_at', start.toISOString())
          .lte('paid_at', end.toISOString())
      : Promise.resolve({ data: [] as any[] } as any),
    supabase
      .from('appointments')
      .select('id, starts_at, status, profile_id, customer_email, barber_id, service_id')
      .eq('shop_id', shop.id)
      .gte('starts_at', start.toISOString())
      .lte('starts_at', end.toISOString()),
    supabase.from('barbers').select('id, name, initials, hue').eq('shop_id', shop.id),
    supabase.from('services').select('id, name, price').eq('shop_id', shop.id)
  ]);

  const salesList = (sales as any[]) || [];
  const expensesList = (expenses as any[]) || [];
  const apptsList = (appts as any[]) || [];
  const barbersList = (barbers as any[]) || [];
  const servicesList = (services as any[]) || [];

  // Lookup de servicios por id (lo precisamos antes que en Pro para poder
  // estimar la facturación de Starter desde el precio de cada servicio).
  const serviceById = new Map<string, { name: string; price: number }>();
  for (const s of servicesList) serviceById.set(s.id, { name: s.name, price: Number(s.price) });

  const activeAppts = apptsList.filter(a => a.status !== 'cancelled');
  const countedAppts = apptsList.filter(a => a.status === 'completed' || a.status === 'confirmed' || a.status === 'in_progress');

  // En Starter no hay caja: estimamos facturación con sum(service.price)
  // de los turnos cumplidos/confirmados. En Pro usamos las sales reales.
  const revenue = isPro
    ? salesList.reduce((s, x) => s + Number(x.amount || 0), 0)
    : countedAppts.reduce((sum, a) => sum + (serviceById.get(a.service_id)?.price || 0), 0);
  const expenseTotal = expensesList.reduce((s, x) => s + Number(x.amount || 0), 0);
  const profit = revenue - expenseTotal;

  const apptsCount = activeAppts.length;
  const ticket = apptsCount ? Math.round(revenue / apptsCount) : 0;
  const noShow = apptsList.filter(a => a.status === 'no_show').length;
  const noShowPct = apptsList.length ? Math.round((noShow * 100) / apptsList.length) : 0;

  // Nuevos clientes: perfiles cuyo primer appointment está en el rango.
  // Approx: emails únicos que aparecen por primera vez en el rango (sin turnos previos).
  const emailsInRange = new Set(apptsList.map(a => a.customer_email).filter(Boolean));
  const { data: priorAppts } = await supabase
    .from('appointments')
    .select('customer_email')
    .eq('shop_id', shop.id)
    .lt('starts_at', start.toISOString())
    .in('customer_email', Array.from(emailsInRange).length ? (Array.from(emailsInRange) as string[]) : ['__none__']);
  const priorEmails = new Set(((priorAppts as any[]) || []).map(x => x.customer_email));
  const newClients = Array.from(emailsInRange).filter(e => !priorEmails.has(e)).length;

  // Facturación por día del período (barras). En Pro usamos sales (caja
  // real); en Starter agregamos service.price por turno cumplido.
  const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const buckets: Array<{ date: Date; amount: number }> = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    d.setHours(0, 0, 0, 0);
    buckets.push({ date: d, amount: 0 });
  }
  if (isPro) {
    for (const s of salesList) {
      const t = new Date(s.created_at).getTime();
      const idx = Math.floor((t - start.getTime()) / 86400000);
      if (idx >= 0 && idx < buckets.length) buckets[idx].amount += Number(s.amount || 0);
    }
  } else {
    for (const a of countedAppts) {
      const t = new Date(a.starts_at).getTime();
      const idx = Math.floor((t - start.getTime()) / 86400000);
      const price = serviceById.get(a.service_id)?.price || 0;
      if (idx >= 0 && idx < buckets.length) buckets[idx].amount += price;
    }
  }
  const maxBucket = Math.max(1, ...buckets.map(b => b.amount));

  // Top barberos (por facturación estimada: sum(service.price) de appts activos).
  const barberById = new Map<string, { name: string; initials: string; hue: number }>();
  for (const b of barbersList) barberById.set(b.id, b);
  const byBarber = new Map<string, { name: string; revenue: number; count: number }>();
  for (const a of countedAppts) {
    const b = barberById.get(a.barber_id);
    const s = serviceById.get(a.service_id);
    if (!b) continue;
    const cur = byBarber.get(a.barber_id) || { name: b.name, revenue: 0, count: 0 };
    cur.revenue += s ? s.price : 0;
    cur.count += 1;
    byBarber.set(a.barber_id, cur);
  }
  const topBarbers = [...byBarber.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top servicios (cantidad).
  const byService = new Map<string, { name: string; count: number; revenue: number }>();
  for (const a of countedAppts) {
    const s = serviceById.get(a.service_id);
    if (!s) continue;
    const cur = byService.get(a.service_id) || { name: s.name, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += s.price;
    byService.set(a.service_id, cur);
  }
  const topServices = [...byService.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-[440px] md:max-w-none md:mx-0">
      <ShopHeader title="Dashboard" />

      <div className="flex-1 overflow-auto px-5 pt-4 pb-8 md:px-8">
        {/* Period selector */}
        <div className="flex gap-1.5 flex-wrap">
          {(['hoy', 'semana', 'mes', '30d'] as Period[]).map(p => (
            <Link key={p} href={`/shop/dashboard?p=${p}`}
              className={`px-3 py-1.5 rounded-m text-[12px] font-medium transition
                ${p === period ? 'bg-bg text-ink' : 'bg-dark-card border border-dark-line text-dark-muted hover:text-bg'}`}>
              {LABELS[p]}
            </Link>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 mt-4">
          <Kpi
            label="Facturación"
            value={money(revenue)}
            suffix={isPro ? `${salesList.length} cobros` : `${countedAppts.length} turnos`}
          />
          <Kpi label="Turnos" value={String(apptsCount)} suffix={`${countedAppts.length} cumplidos`} />
          <Kpi label="Ticket promedio" value={money(ticket)} suffix="por turno" />
          <Kpi label="No-show" value={`${noShowPct}%`} suffix={`${noShow} faltas`} />
          <Kpi label="Nuevos clientes" value={String(newClients)} suffix="primera visita" />
        </div>

        {/* Chart */}
        <section className="mt-6">
          <SectionLabel>FACTURACIÓN POR DÍA</SectionLabel>
          <div className="bg-dark-card border border-dark-line rounded-xl p-4">
            <BarChart buckets={buckets} max={maxBucket} />
          </div>
        </section>

        {/* Top barberos + servicios */}
        <div className="grid gap-4 mt-6 md:grid-cols-2">
          <section>
            <SectionLabel>TOP BARBEROS</SectionLabel>
            <RankTable
              rows={topBarbers.map(b => ({ label: b.name, primary: money(b.revenue), secondary: `${b.count} turnos` }))}
              empty="Sin turnos cumplidos en el período."
            />
          </section>
          <section>
            <SectionLabel>TOP SERVICIOS</SectionLabel>
            <RankTable
              rows={topServices.map(s => ({ label: s.name, primary: `${s.count}`, secondary: money(s.revenue) }))}
              empty="Sin servicios vendidos en el período."
            />
          </section>
        </div>

        {/* Resumen caja: solo Pro (Starter no tiene UI para cargar egresos). */}
        {isPro && (
          <section className="mt-6">
            <SectionLabel>RESUMEN DE CAJA</SectionLabel>
            <div className="bg-dark-card border border-dark-line rounded-xl p-5 md:p-6 grid grid-cols-3 gap-4">
              <CashStat label="Ingresos" value={money(revenue)} positive />
              <CashStat label="Egresos" value={money(expenseTotal)} />
              <CashStat label="Utilidad" value={money(profit)} highlight={profit >= 0} accent />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Kpi({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="bg-dark-card border border-dark-line rounded-xl px-3.5 py-3">
      <div className="text-[9px] text-dark-muted uppercase tracking-[1.5px]">{label}</div>
      <div className="font-display text-[22px] md:text-[26px] text-bg leading-none mt-1.5 -tracking-[0.3px]">{value}</div>
      <div className="text-[10px] text-dark-muted mt-1">{suffix}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] tracking-[2px] text-dark-muted mb-2.5">{children}</div>;
}

function BarChart({ buckets, max }: { buckets: Array<{ date: Date; amount: number }>; max: number }) {
  const showLabels = buckets.length <= 14;
  const h = 130;
  return (
    <div>
      <div className="flex items-end gap-[3px] h-[130px]">
        {buckets.map((b, i) => {
          const pct = Math.round((b.amount / max) * 100);
          const barH = Math.max(2, Math.round((h - 4) * (pct / 100)));
          return (
            <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
              <div
                title={`${b.date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}: ${b.amount.toLocaleString('es-AR')}`}
                style={{ height: barH, background: b.amount > 0 ? '#B6754C' : '#2A2824' }}
                className="w-full rounded-xs"
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex gap-[3px] mt-2">
          {buckets.map((b, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-dark-muted">
              {b.date.getDate()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankTable({ rows, empty }: { rows: Array<{ label: string; primary: string; secondary: string }>; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-line rounded-xl px-4 py-5 text-[13px] text-dark-muted text-center">
        {empty}
      </div>
    );
  }
  return (
    <div className="bg-dark-card border border-dark-line rounded-xl divide-y divide-dark-line">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="font-mono text-[11px] text-dark-muted w-4">{i + 1}</div>
          <div className="flex-1 min-w-0 text-[13px] font-medium text-bg truncate">{r.label}</div>
          <div className="text-right">
            <div className="font-mono text-[13px] font-semibold text-bg">{r.primary}</div>
            <div className="text-[10px] text-dark-muted mt-0.5">{r.secondary}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CashStat({ label, value, positive, highlight, accent }: { label: string; value: string; positive?: boolean; highlight?: boolean; accent?: boolean }) {
  void positive; void highlight;
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[2px] text-dark-muted">{label}</div>
      <div className={`font-display text-[28px] md:text-[32px] leading-none mt-1.5 -tracking-[0.5px] ${accent ? 'text-accent' : 'text-bg'}`}>{value}</div>
    </div>
  );
}
