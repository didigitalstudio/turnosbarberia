'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { Pill } from '@/components/shared/Pill';
import { money } from '@/lib/format';
import { cancelAppointment } from '@/app/actions/booking';

type Upcoming = {
  id: string; starts_at: string; status: string;
  services: { name: string; duration_mins: number; price: number };
  barbers: { name: string };
};
type Hist = { id: string; starts_at: string; services: { name: string }; barbers: { name: string } };

export function MyAppointmentsView({ upcoming, history }: { upcoming: Upcoming[]; history: Hist[] }) {
  const [tab, setTab] = useState<'next'|'past'>('next');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const featured = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 pt-3 pb-2">
        <div className="font-display text-[30px] -tracking-[0.5px]">Mis turnos</div>
      </div>

      <div className="px-5 pb-2 flex gap-2">
        {(['next','past'] as const).map((t, i) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-xs font-medium ${tab === t ? 'bg-ink text-bg' : 'bg-transparent text-ink border border-line'}`}>
            {t === 'next' ? 'Próximos' : 'Historial'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-5 pt-3.5 pb-5">
        {tab === 'next' && (
          <>
            {!featured ? (
              <div className="bg-card border border-line rounded-2xl p-6 text-center">
                <div className="font-display text-[22px]">No tenés turnos próximos</div>
                <div className="text-[13px] text-muted mt-2 mb-4">Reservá tu próximo corte en segundos.</div>
                <Link href="/reservar" className="inline-block bg-accent text-white px-5 py-3 rounded-xl text-[14px] font-semibold">Reservar</Link>
              </div>
            ) : (
              <FeaturedCard a={featured} pending={pending} onCancel={(id) => start(async () => {
                setError(null);
                const r = await cancelAppointment(id);
                if (r?.error) setError(r.error);
              })}/>
            )}
            {error && <div className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(182,117,76,.18)', color: '#B6754C' }}>{error}</div>}

            {rest.length > 0 && <SectionLabel className="mt-6">MÁS ADELANTE</SectionLabel>}
            {rest.map(a => {
              const d = new Date(a.starts_at);
              return (
                <div key={a.id} className="flex items-center gap-3.5 bg-card border border-line rounded-xl px-3.5 py-3 mb-2">
                  <DateChip date={d} variant="light" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.services?.name}</div>
                    <div className="text-[11px] text-muted mt-0.5">con {a.barbers?.name} · {d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false })}</div>
                  </div>
                  <Icon name="chevron-right" size={18} color="#7A766E"/>
                </div>
              );
            })}
          </>
        )}

        {tab === 'past' && (
          <>
            {history.length === 0 && (
              <div className="text-center text-muted text-[13px] py-10">Sin turnos previos todavía</div>
            )}
            {history.map((a, i) => {
              const d = new Date(a.starts_at);
              return (
                <div key={a.id} className={`flex items-center gap-3 px-1 py-2.5 ${i < history.length - 1 ? 'border-b border-line' : ''}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted"/>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{a.services?.name}</div>
                    <div className="text-[11px] text-muted">{d.toLocaleDateString('es-AR', { day:'2-digit', month:'short' }).replace('.','')} · con {a.barbers?.name}</div>
                  </div>
                  <Link href={`/reservar?service=${(a as any).service_id || ''}`} className="text-[11px] text-muted underline">Repetir</Link>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function FeaturedCard({ a, pending, onCancel }: { a: Upcoming; pending: boolean; onCancel: (id: string) => void }) {
  const d = new Date(a.starts_at);
  const isTomorrow = (() => {
    const t = new Date(); t.setDate(t.getDate() + 1);
    return d.toDateString() === t.toDateString();
  })();
  return (
    <div className="bg-ink text-bg rounded-2xl px-4.5 py-4 relative overflow-hidden">
      <div className="flex items-start gap-3.5">
        <DateChip date={d} variant="dark" />
        <div className="flex-1">
          {isTomorrow && <Pill tone="accent">Mañana</Pill>}
          <div className="text-base font-medium mt-2.5">{a.services?.name}</div>
          <div className="text-[12px] text-dark-muted mt-0.5">con {a.barbers?.name} · {a.services?.duration_mins} min</div>
          <div className="font-display text-[28px] italic mt-2.5" style={{ color: '#B6754C' }}>
            {d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12: false })}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3.5">
        <button disabled={pending} onClick={() => onCancel(a.id)}
          className="flex-1 bg-transparent text-bg border border-dark-line px-3 py-2.5 rounded-m text-[12px] font-medium disabled:opacity-50">
          {pending ? 'Cancelando…' : 'Cancelar'}
        </button>
        <Link href={`/reservar?service=${(a as any).service_id || ''}`}
          className="flex-1 bg-bg text-ink px-3 py-2.5 rounded-m text-[12px] font-semibold text-center">
          Reprogramar
        </Link>
      </div>
    </div>
  );
}

function DateChip({ date, variant }: { date: Date; variant: 'light' | 'dark' }) {
  const wd = date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.','').slice(0,3);
  const m = date.toLocaleDateString('es-AR', { month: 'short' }).replace('.','');
  return (
    <div className={`rounded-m text-center ${variant === 'dark' ? 'bg-dark-card text-bg px-3 py-2.5 min-w-[56px]' : 'bg-bg px-2.5 py-2 min-w-[48px]'}`}>
      <div className={`text-[10px] uppercase ${variant === 'dark' ? 'text-dark-muted' : 'text-muted'}`}>{wd}</div>
      <div className="font-display text-[22px] leading-none mt-0.5">{date.getDate()}</div>
      <div className={`text-[9px] ${variant === 'dark' ? 'text-dark-muted' : 'text-muted'}`}>{m}</div>
    </div>
  );
}

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono text-[10px] tracking-[2px] text-muted mb-2.5 ${className}`}>{children}</div>;
}
