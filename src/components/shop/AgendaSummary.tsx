import { Avatar } from '@/components/shared/Avatar';
import { Icon } from '@/components/shared/Icon';
import { money } from '@/lib/format';

type A = {
  id: string; starts_at: string; ends_at: string; customer_name: string; status: string;
  services: { name: string; duration_mins: number; price: number };
  barbers: { id: string; name: string; initials: string; hue: number };
};

type SaleAmount = { amount: number };

export function AgendaSummary({ appointments, sales, dayISO }: { appointments: A[]; sales?: SaleAmount[] | null; dayISO: string }) {
  const active = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'no_show');
  const total = active.length;
  const first = active[0];
  const last = active[active.length - 1];

  // Facturado hoy: sólo sales reales. Si `sales` no se pasa (undefined/null), mostramos "—".
  const hasSales = Array.isArray(sales);
  const billed = hasSales
    ? (sales as SaleAmount[]).reduce((s, x) => s + Number(x.amount || 0), 0)
    : 0;

  // Agendado hoy (estimado): confirmed + in_progress — excluye completed (eso se contabiliza como facturado al cobrar).
  const scheduledEstimated = active
    .filter(a => a.status === 'confirmed' || a.status === 'in_progress' || a.status === 'pending')
    .reduce((s, a) => s + Number(a.services?.price || 0), 0);

  // top barber
  const byBarber = new Map<string, { b: A['barbers']; count: number; revenue: number }>();
  for (const a of active) {
    const key = a.barbers?.id;
    if (!key) continue;
    const cur = byBarber.get(key) || { b: a.barbers, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(a.services?.price || 0);
    byBarber.set(key, cur);
  }
  const top = [...byBarber.values()].sort((x, y) => y.count - x.count)[0];

  const dayLabel = new Date(dayISO + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires'
  });

  return (
    <aside aria-label="Resumen del día" className="hidden lg:flex lg:w-80 xl:w-96 shrink-0 border-l border-dark-line bg-dark flex-col">
      <div className="px-5 pt-6 pb-4 border-b border-dark-line">
        <div className="font-mono text-[10px] tracking-[2px] text-dark-muted">RESUMEN DEL DÍA</div>
        <div className="font-display text-[22px] text-bg mt-1 capitalize">{dayLabel}</div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        <div className="bg-dark-card border border-dark-line rounded-xl px-4 py-3.5">
          <div className="font-mono text-[10px] tracking-[2px] text-dark-muted">FACTURADO HOY</div>
          <div className="font-display text-[32px] text-bg leading-none mt-1.5 -tracking-[1px]">
            {hasSales ? money(billed) : '—'}
          </div>
          <div className="text-[11px] text-dark-muted mt-1.5">
            {hasSales ? 'Sumado desde caja' : 'Cargá ventas en caja para ver el total'}
          </div>

          <div className="border-t border-dark-line/80 my-3"/>

          <div className="font-mono text-[10px] tracking-[2px] text-dark-muted">AGENDADO HOY (ESTIMADO)</div>
          <div className="font-display text-[22px] text-bg leading-none mt-1.5 -tracking-[0.5px]">{money(scheduledEstimated)}</div>
          <div className="text-[11px] text-dark-muted mt-1.5">
            {total} {total === 1 ? 'turno' : 'turnos'} activos (sin cobrar todavía)
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat l="Primero" v={first ? timeLabel(first.starts_at) : '—'}/>
          <MiniStat l="Último"  v={last ? timeLabel(last.starts_at) : '—'}/>
        </div>

        {top && (
          <div className="bg-dark-card border border-dark-line rounded-xl px-4 py-3">
            <div className="font-mono text-[10px] tracking-[2px] text-dark-muted mb-2.5">TOP BARBERO</div>
            <div className="flex items-center gap-3">
              <Avatar name={top.b.initials} size={40} hue={top.b.hue} dark/>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-bg truncate">{top.b.name}</div>
                <div className="text-[11px] text-dark-muted mt-0.5">
                  {top.count} {top.count === 1 ? 'turno' : 'turnos'} · {money(top.revenue)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-dark-card border border-dark-line rounded-xl px-4 py-3">
          <div className="font-mono text-[10px] tracking-[2px] text-dark-muted mb-2">ESTADOS</div>
          <div className="space-y-1.5">
            <Row label="Completados"  value={appointments.filter(a => a.status === 'completed').length}/>
            <Row label="En curso"     value={appointments.filter(a => a.status === 'in_progress').length}/>
            <Row label="Pendientes"   value={appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length}/>
            <Row label="Cancelados"   value={appointments.filter(a => a.status === 'cancelled').length}/>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-dark-line">
        <div className="flex items-center gap-1.5 text-[11px] text-dark-muted">
          <Icon name="clock" size={12} color="#8C8A83"/>
          Resumen del día
        </div>
      </div>
    </aside>
  );
}

function MiniStat({ l, v }: { l: string; v: string }) {
  return (
    <div className="bg-dark-card border border-dark-line rounded-l px-3 py-2.5">
      <div className="text-[9px] text-dark-muted uppercase tracking-[1.5px]">{l}</div>
      <div className="font-mono text-[15px] font-semibold text-bg mt-1">{v}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-dark-muted">{label}</span>
      <span className="text-bg font-semibold font-mono">{value}</span>
    </div>
  );
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false , timeZone: 'America/Argentina/Buenos_Aires' });
}
