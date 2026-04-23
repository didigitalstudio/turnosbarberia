import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { getShopBySlug } from '@/lib/shop-context';
import { Icon } from '@/components/shared/Icon';
import { Stripe } from '@/components/shared/Stripe';
import { ConfirmationActions } from '@/components/client/ConfirmationActions';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ConfirmationPage({ params }: { params: { slug: string; id: string } }) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();

  const sb = createAdminClient();
  const { data: appt } = await sb
    .from('appointments')
    .select('id, starts_at, ends_at, customer_name, services(name, duration_mins, price), barbers(name)')
    .eq('id', params.id)
    .eq('shop_id', shop.id)
    .maybeSingle();

  if (!appt) return notFound();
  const a = appt as any;

  const start = new Date(a.starts_at);
  const end = new Date(a.ends_at || new Date(start.getTime() + (a.services?.duration_mins || 30) * 60_000).toISOString());
  const orderNum = String(params.id).slice(-5).toUpperCase();
  const dateLabel = start.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').toUpperCase();
  const timeLabel = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <main className="min-h-screen flex flex-col px-5 pt-5 pb-7">
      <div className="flex justify-end">
        <Link
          href={`/s/${params.slug}`}
          className="w-9 h-9 rounded-l bg-card border border-line grid place-items-center active:scale-95 transition"
          aria-label="Cerrar y volver al inicio"
        >
          <Icon name="close" size={18} />
        </Link>
      </div>

      <div className="text-center mt-7">
        <div
          className="pop-in w-[72px] h-[72px] rounded-full bg-ink mx-auto grid place-items-center"
          aria-hidden="true"
        >
          <Icon name="check" size={32} stroke={2.4} color="#B6754C" />
        </div>
        <h1 className="fade-in-up font-display text-[34px] leading-tight mt-5 -tracking-[0.5px]">Turno confirmado</h1>
        <p className="fade-in-up text-[13px] text-muted mt-2 max-w-[280px] mx-auto" style={{ animationDelay: '60ms' }}>
          Te llegó un email con los detalles. Cancelación gratuita hasta 2 hs antes.
        </p>
      </div>

      <article
        className="fade-in-up mt-6 bg-card rounded-2xl border border-line overflow-hidden shadow-card"
        style={{ animationDelay: '120ms' }}
      >
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
            <Row icon="scissors" label="Servicio" value={a.services?.name || ''} />
            <Row icon="user" label="Barbero" value={a.barbers?.name || ''} />
            <Row icon="clock" label="Duración" value={`${a.services?.duration_mins || 0} min`} />
            <Row icon="cash" label="Total" value={money(Number(a.services?.price || 0))} />
          </div>
        </div>

        <div className="relative h-[18px] bg-bg">
          <div className="absolute -left-[9px] top-0 bottom-0 w-[18px] rounded-full bg-bg border border-line" />
          <div className="absolute -right-[9px] top-0 bottom-0 w-[18px] rounded-full bg-bg border border-line" />
          <div className="border-t border-dashed border-line absolute left-3 right-3 top-1/2" />
        </div>

        <div className="px-5 py-4 flex items-center gap-3.5">
          <div className="text-[11px] text-muted flex-1">
            {shop.address ? (<>{shop.address}<br /></>) : null}
            {shop.name}
          </div>
          <div
            className="w-14 h-14 rounded-s"
            style={{
              background: '#0E0E0E',
              backgroundImage: `repeating-conic-gradient(#0E0E0E 0 25%, transparent 0 50%)`,
              backgroundSize: '12px 12px'
            }}
            aria-label="Código QR del turno"
            role="img"
          />
        </div>
      </article>

      <div className="flex-1" />

      <ConfirmationActions
        shopName={shop.name}
        shopAddress={shop.address}
        startISO={a.starts_at}
        endISO={end.toISOString()}
        service={a.services?.name || 'Turno'}
        barber={a.barbers?.name || 'nuestro equipo'}
        orderNum={orderNum}
      />

      <Link
        href={`/s/${params.slug}/mis-turnos`}
        className="text-center text-[13px] text-muted underline mt-4 py-2"
      >
        Ver mis turnos
      </Link>
    </main>
  );
}

function Row({ icon, label, value }: { icon: 'scissors' | 'user' | 'clock' | 'cash'; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-s bg-bg grid place-items-center">
        <Icon name={icon} size={14} />
      </div>
      <div className="text-[12px] text-muted flex-1">{label}</div>
      <div className="text-[14px] font-medium">{value}</div>
    </div>
  );
}
