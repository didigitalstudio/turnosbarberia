import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { Icon } from '@/components/shared/Icon';
import { Stripe } from '@/components/shared/Stripe';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ConfirmationPage({ params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { data: appt } = await sb
    .from('appointments')
    .select('id, starts_at, customer_name, services(name, duration_mins, price), barbers(name)')
    .eq('id', params.id)
    .maybeSingle();

  if (!appt) return notFound();
  const a = appt as any;

  const start = new Date(a.starts_at);
  const orderNum = String(params.id).slice(-5).toUpperCase();
  const dateLabel = start.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').toUpperCase();
  const timeLabel = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <main className="min-h-screen flex flex-col px-5 pt-5 pb-7">
      <div className="flex justify-end">
        <Link href="/" className="w-9 h-9 rounded-l bg-card border border-line grid place-items-center" aria-label="Cerrar">
          <Icon name="close" size={18}/>
        </Link>
      </div>

      <div className="text-center mt-7">
        <div className="w-[72px] h-[72px] rounded-full bg-ink mx-auto grid place-items-center" style={{ color: '#B6754C' }}>
          <Icon name="check" size={32} stroke={2.4} color="#B6754C"/>
        </div>
        <div className="font-display text-[34px] leading-tight mt-5 -tracking-[0.5px]">Turno confirmado</div>
        <div className="text-[13px] text-muted mt-2 max-w-[260px] mx-auto">
          Te llegó un email con los detalles. Cancelación gratuita hasta 2 hs antes.
        </div>
      </div>

      <article className="mt-6 bg-card rounded-2xl border border-line overflow-hidden shadow-card">
        <Stripe />
        <div className="px-5 py-4">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-[10px] tracking-[2px] text-muted">N° {orderNum}</div>
            <div className="font-mono text-[10px] tracking-[2px] text-muted">{dateLabel}</div>
          </div>
          <div className="mt-3 font-display text-[44px] leading-none">{timeLabel}</div>
          <div className="text-[13px] text-muted mt-1.5">Llegá 5 minutos antes</div>

          <div className="border-t border-dashed border-line mt-4 mb-3.5" />

          <div className="flex flex-col gap-2.5">
            <Row icon="scissors" label="Servicio" value={a.services?.name || ''}/>
            <Row icon="user"     label="Barbero"  value={a.barbers?.name || ''}/>
            <Row icon="clock"    label="Duración" value={`${a.services?.duration_mins || 0} min`}/>
            <Row icon="cash"     label="Total"    value={money(Number(a.services?.price || 0))}/>
          </div>
        </div>

        <div className="relative h-[18px] bg-bg">
          <div className="absolute -left-[9px] top-0 bottom-0 w-[18px] rounded-full bg-bg border border-line"/>
          <div className="absolute -right-[9px] top-0 bottom-0 w-[18px] rounded-full bg-bg border border-line"/>
          <div className="border-t border-dashed border-line absolute left-3 right-3 top-1/2"/>
        </div>

        <div className="px-5 py-4 flex items-center gap-3.5">
          <div className="text-[11px] text-muted flex-1">
            Av. Honduras 5850<br/>Palermo · Buenos Aires
          </div>
          <div className="w-14 h-14 rounded-s" style={{
            background: '#0E0E0E',
            backgroundImage: `repeating-conic-gradient(#0E0E0E 0 25%, transparent 0 50%)`,
            backgroundSize: '12px 12px'
          }}/>
        </div>
      </article>

      <div className="flex-1"/>
      <Link href="/mis-turnos"
        className="bg-ink text-bg px-4 py-4 rounded-xl text-[15px] font-semibold mt-5 text-center">
        Ver mis turnos
      </Link>
    </main>
  );
}

function Row({ icon, label, value }: { icon: 'scissors'|'user'|'clock'|'cash'; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-s bg-bg grid place-items-center"><Icon name={icon} size={14}/></div>
      <div className="text-[12px] text-muted flex-1">{label}</div>
      <div className="text-[14px] font-medium">{value}</div>
    </div>
  );
}
