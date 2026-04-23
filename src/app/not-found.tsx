import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { Stripe } from '@/components/shared/Stripe';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col px-6 pt-10 pb-10">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="font-mono text-[10px] tracking-[3px] text-muted mb-3">ERROR · 404</div>
        <div className="font-display text-[64px] leading-[0.9] -tracking-[1px]">404</div>
        <div className="font-display text-[22px] mt-4 italic" style={{ color: '#B6754C' }}>
          Acá no hay turno.
        </div>
        <div className="text-[13px] text-muted mt-3 max-w-[280px]">
          La página que buscás no existe o la movimos de lugar. Volvé al inicio y probá de nuevo.
        </div>
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden shadow-card">
        <Stripe />
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="font-mono text-[10px] tracking-[2px] text-muted">TURNOSBARBERÍA</div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2.5 rounded-xl text-[13px] font-semibold active:scale-[0.98] transition"
          >
            Volver al inicio <Icon name="arrow-right" size={14} color="#F5F3EE" />
          </Link>
        </div>
      </div>
    </main>
  );
}
