'use client';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Icon } from '@/components/shared/Icon';
import { Avatar } from '@/components/shared/Avatar';
import { money } from '@/lib/format';
import { setAppointmentStatus } from '@/app/actions/booking';

type A = {
  id: string; starts_at: string; ends_at: string; customer_name: string; status: string;
  services: { name: string; duration_mins: number; price: number };
  barbers: { id: string; name: string; initials: string; hue: number };
};

export function AgendaView({ appointments, barbers, dayISO }: { appointments: A[]; barbers: any[]; dayISO: string }) {
  const [pending, start] = useTransition();
  const days = useMemo(() => buildDays(7), []);
  const total = appointments.length;
  const done = appointments.filter(a => a.status === 'completed').length;
  const ingresos = appointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
    .reduce((s, a) => s + Number(a.services?.price || 0), 0);
  const now = Date.now();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats */}
      <div className="px-5 pt-3.5 grid grid-cols-3 gap-2">
        <Stat k="Hoy"      v={`${total}`} s="turnos"/>
        <Stat k="Hechos"   v={`${done}`}  s={`de ${total}`}/>
        <Stat k="Ingresos" v={shortMoney(ingresos)} s="estimado"/>
      </div>

      {/* Day picker */}
      <div className="px-5 pt-3.5 pb-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
        {days.map(d => {
          const sel = d.iso === dayISO;
          return (
            <Link key={d.iso} href={`/shop?d=${d.iso}`}
              className={`min-w-[48px] py-2 rounded-m text-center
                ${sel ? 'bg-bg text-ink border-0' :
                  d.closed ? 'border border-dashed border-dark-line text-dark-muted opacity-50' :
                  'border border-dark-line text-bg'}`}>
              <div className="text-[9px] uppercase tracking-wide">{d.wd}</div>
              <div className="font-display text-[18px] leading-none mt-0.5">{d.day}</div>
            </Link>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto px-5 pt-1 pb-5">
        <div className="flex items-center gap-2 my-3">
          <div className="font-mono text-[10px] tracking-[2px] text-dark-muted flex-1">
            {new Date(dayISO + 'T00:00:00').toLocaleDateString('es-AR', { weekday:'long', day:'numeric' }).toUpperCase()} · TODOS LOS BARBEROS
          </div>
          <Link href="/shop/nuevo" className="w-7 h-7 rounded-s grid place-items-center text-white" style={{ background: '#B6754C' }}>
            <Icon name="plus" size={16} color="#fff"/>
          </Link>
        </div>

        {appointments.length === 0 && (
          <div className="text-center text-dark-muted text-sm py-10">Sin turnos para esta fecha</div>
        )}

        {appointments.map(a => {
          const startMs = new Date(a.starts_at).getTime();
          const endMs = new Date(a.ends_at).getTime();
          const isInProgress = a.status === 'in_progress' || (now >= startMs && now < endMs && a.status !== 'completed');
          const isDone = a.status === 'completed';
          const isNext = !isInProgress && !isDone && startMs > now && startMs - now < 30 * 60_000;
          const time = new Date(a.starts_at).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false });
          const hue = a.barbers?.hue || 55;
          return (
            <div key={a.id} className={`flex gap-3 mb-2 ${isDone ? 'opacity-50' : ''}`}>
              <div className="min-w-[46px] pt-3.5">
                <div className="font-mono text-[13px] text-bg font-medium">{time}</div>
                <div className="text-[9px] text-dark-muted mt-0.5">{a.services?.duration_mins}m</div>
              </div>
              <button type="button"
                onClick={() => start(async () => {
                  const next = isDone ? 'confirmed' : isInProgress ? 'completed' : 'in_progress';
                  await setAppointmentStatus(a.id, next as any);
                })}
                disabled={pending}
                className={`flex-1 rounded-l px-3.5 py-3 flex items-center gap-2.5 text-left
                  ${isInProgress ? 'text-white border-0' :
                    isNext ? 'bg-bg text-ink border-0' :
                    'bg-dark-card text-bg border border-dark-line'}`}
                style={{
                  background: isInProgress ? '#B6754C' : undefined,
                  borderLeft: !isInProgress && !isNext ? `3px solid oklch(0.7 0.08 ${hue})` : undefined
                }}>
                <Avatar name={a.barbers?.initials || '??'} size={32} hue={hue} dark={!isInProgress && !isNext}/>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{a.customer_name}</div>
                  <div className="text-[11px] opacity-75 mt-0.5">{a.services?.name} · {a.barbers?.name}</div>
                </div>
                {isDone && <Icon name="check" size={16}/>}
                {isInProgress && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-xs tracking-wider" style={{ background:'rgba(255,255,255,0.25)' }}>
                    EN CURSO
                  </span>
                )}
                {!isDone && !isInProgress && (
                  <Icon name="chevron-right" size={16} color={isNext ? '#0E0E0E' : '#8C8A83'}/>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="bg-dark-card border border-dark-line rounded-l px-3 py-2.5">
      <div className="text-[9px] text-dark-muted uppercase tracking-[1.5px]">{k}</div>
      <div className="font-display text-[22px] text-bg leading-none mt-0.5">{v}</div>
      <div className="text-[10px] text-dark-muted mt-0.5">{s}</div>
    </div>
  );
}

function shortMoney(n: number) {
  if (n >= 1000) return `$${Math.round(n/1000)}k`;
  return money(n);
}

function buildDays(n: number) {
  const out = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      day: d.getDate(),
      wd: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.','').slice(0,3),
      closed: d.getDay() === 0
    });
  }
  return out;
}
