'use client';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/shared/Icon';
import { Avatar } from '@/components/shared/Avatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Toast } from '@/components/shared/Toast';
import { money } from '@/lib/format';
import { setAppointmentStatus } from '@/app/actions/booking';

type A = {
  id: string; starts_at: string; ends_at: string; customer_name: string; status: string;
  services: { name: string; duration_mins: number; price: number };
  barbers: { id: string; name: string; initials: string; hue: number };
};

type StatusOption = 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

const STATUS_LABELS: Record<StatusOption, string> = {
  confirmed: 'Confirmado',
  in_progress: 'En proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No se presentó'
};

export function AgendaView({ appointments, barbers, dayISO, workingDays }: { appointments: A[]; barbers: any[]; dayISO: string; workingDays?: number[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const days = useMemo(() => buildDays(7, workingDays), [workingDays]);
  const total = appointments.length;
  const done = appointments.filter(a => a.status === 'completed').length;
  const ingresos = appointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
    .reduce((s, a) => s + Number(a.services?.price || 0), 0);
  const now = Date.now();

  const isToday = dayISO === todayLocalISO();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, [isToday]);
  void tick;

  // scroll-into-view del día activo
  const dayPickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = dayPickerRef.current?.querySelector<HTMLElement>(`[data-day="${dayISO}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [dayISO]);

  // Compute "now" insertion index relative to appointments
  const nowTimeLabel = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  let nowInserted = false;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats */}
      <div className="px-5 pt-3.5 grid grid-cols-3 gap-2 md:px-8 md:gap-3">
        <Stat k="Hoy"      v={`${total}`} s="turnos"/>
        <Stat k="Hechos"   v={`${done}`}  s={`de ${total}`}/>
        <Stat k="Ingresos" v={shortMoney(ingresos)} s="estimado"/>
      </div>

      {/* Day picker */}
      <div ref={dayPickerRef} className="px-5 pt-3.5 pb-2.5 flex gap-1.5 overflow-x-auto no-scrollbar md:px-8 md:gap-2">
        {days.map(d => {
          const sel = d.iso === dayISO;
          return (
            <Link key={d.iso} href={`/shop?d=${d.iso}`}
              data-day={d.iso}
              aria-pressed={sel}
              aria-label={`Ver agenda del ${d.wd} ${d.day}${d.closed ? ' (cerrado)' : ''}`}
              className={`min-w-[52px] md:min-w-[64px] min-h-[48px] py-2 rounded-m text-center transition active:scale-[0.97]
                ${sel ? 'bg-bg text-ink border-0' :
                  d.closed ? 'border border-dashed border-dark-line text-dark-muted opacity-60' :
                  'border border-dark-line text-bg hover:border-bg/40'}`}>
              <div className="text-[9px] uppercase tracking-wide">{d.wd}</div>
              <div className="font-display text-[18px] leading-none mt-0.5">{d.day}</div>
            </Link>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto px-5 pt-1 pb-5 md:px-8">
        <div className="flex items-center gap-2 my-3">
          <div className="font-mono text-[10px] tracking-[2px] text-dark-muted flex-1">
            {new Date(dayISO + 'T00:00:00').toLocaleDateString('es-AR', { weekday:'long', day:'numeric' }).toUpperCase()} · TODOS LOS BARBEROS
          </div>
          <Link href="/shop/nuevo" aria-label="Nuevo turno" className="w-9 h-9 rounded-s grid place-items-center text-white bg-accent active:scale-95 transition">
            <Icon name="plus" size={16} color="#fff"/>
          </Link>
        </div>

        {error && (
          <div className="mb-3">
            <Toast dark tone="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {appointments.length === 0 ? (
          <EmptyState
            dark
            icon="calendar"
            title="Día libre"
            description={isToday ? 'Todavía no hay turnos cargados para hoy. Tocá + para sumar un walk-in.' : 'Este día no tiene turnos.'}
            ctaLabel="Sumar turno"
            ctaHref="/shop/nuevo"
          />
        ) : (
          <div className="md:grid md:grid-cols-2 md:gap-x-3 xl:grid-cols-3">
            {appointments.map((a) => {
              const startMs = new Date(a.starts_at).getTime();
              const endMs = new Date(a.ends_at).getTime();
              const isInProgress = a.status === 'in_progress' || (now >= startMs && now < endMs && a.status !== 'completed');
              const isDone = a.status === 'completed';
              const isNext = !isInProgress && !isDone && startMs > now && startMs - now < 30 * 60_000;
              const time = new Date(a.starts_at).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false });
              const hue = a.barbers?.hue || 55;

              // Insertar la línea AHORA antes del primer turno cuya hora sea >= ahora (solo hoy)
              const showNowBefore = isToday && !nowInserted && startMs >= now;
              if (showNowBefore) nowInserted = true;

              return (
                <Fragment key={a.id}>
                  {showNowBefore && (
                    <div className="flex items-center gap-2.5 my-2 md:col-span-full" aria-hidden="true">
                      <div className="font-mono text-[10px] text-accent tracking-[2px] font-semibold">
                        AHORA · {nowTimeLabel}
                      </div>
                      <div className="flex-1 h-px bg-accent/60" />
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    </div>
                  )}

                  <div className={`flex gap-3 mb-2 ${isDone ? 'opacity-50' : ''}`}>
                    <div className="min-w-[46px] pt-3.5">
                      <div className="font-mono text-[13px] text-bg font-medium">{time}</div>
                      <div className="text-[9px] text-dark-muted mt-0.5">{a.services?.duration_mins}m</div>
                    </div>
                    <div className="flex-1 relative">
                      <button type="button"
                        onClick={() => setMenuFor(menuFor === a.id ? null : a.id)}
                        disabled={pending}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === a.id}
                        aria-label={`Turno ${a.customer_name} a las ${time}. Tocá para cambiar estado.`}
                        className={`w-full min-h-[56px] rounded-l px-3.5 py-3 flex items-center gap-2.5 text-left transition active:scale-[0.99]
                          ${isInProgress ? 'text-white border-0 bg-accent' :
                            isNext ? 'bg-bg text-ink border-0' :
                            'bg-dark-card text-bg border border-dark-line hover:border-bg/30'}`}
                        style={{
                          borderLeft: !isInProgress && !isNext ? `3px solid oklch(0.7 0.08 ${hue})` : undefined
                        }}>
                        <Avatar name={a.barbers?.initials || '??'} size={32} hue={hue} dark={!isInProgress && !isNext}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate">{a.customer_name}</div>
                          <div className="text-[11px] opacity-80 mt-0.5 truncate">{a.services?.name} · {a.barbers?.name}</div>
                        </div>
                        {isDone && <Icon name="check" size={16}/>}
                        {isInProgress && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-xs tracking-wider" style={{ background:'rgba(255,255,255,0.25)' }}>
                            EN CURSO
                          </span>
                        )}
                        {!isDone && !isInProgress && (
                          <Icon name="chevron-right" size={16} color={isNext ? '#0E0E0E' : '#F5F3EE'}/>
                        )}
                      </button>
                      {menuFor === a.id && (
                        <StatusMenu
                          current={a.status as StatusOption}
                          disabled={pending}
                          onPick={(next) => {
                            setMenuFor(null);
                            start(async () => {
                              setError(null);
                              const r = await setAppointmentStatus(a.id, next);
                              if ((r as any)?.error) setError((r as any).error);
                            });
                          }}
                          onClose={() => setMenuFor(null)}
                        />
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}

            {/* Si todos los turnos ya pasaron, mostrar el indicador "AHORA" al final */}
            {isToday && !nowInserted && (
              <div className="flex items-center gap-2.5 my-2 md:col-span-full" aria-hidden="true">
                <div className="font-mono text-[10px] text-accent tracking-[2px] font-semibold">
                  AHORA · {nowTimeLabel}
                </div>
                <div className="flex-1 h-px bg-accent/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
            )}
          </div>
        )}
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

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function buildDays(n: number, workingDays?: number[]) {
  const out = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const openDays: Set<number> | null = workingDays ? new Set(workingDays) : null;
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dow = d.getDay();
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      day: d.getDate(),
      wd: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.','').slice(0,3),
      closed: openDays ? !openDays.has(dow) : false
    });
  }
  return out;
}

function StatusMenu({
  current, disabled, onPick, onClose
}: {
  current: StatusOption;
  disabled: boolean;
  onPick: (next: StatusOption) => void;
  onClose: () => void;
}) {
  const options: StatusOption[] = ['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-30 cursor-default"/>
      <ul
        role="menu"
        className="absolute right-2 top-full mt-1 z-40 min-w-[180px] bg-dark-card border border-dark-line rounded-l overflow-hidden shadow-fab-dark">
        {options.map(opt => {
          const isActive = opt === current;
          return (
            <li key={opt} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => onPick(opt)}
                disabled={disabled || isActive}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] transition
                  ${isActive
                    ? 'bg-bg text-ink font-semibold'
                    : 'text-bg hover:bg-dark'} disabled:opacity-60`}>
                <span className="flex-1">{STATUS_LABELS[opt]}</span>
                {isActive && <Icon name="check" size={14}/>}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
