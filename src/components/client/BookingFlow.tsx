'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { Avatar } from '@/components/shared/Avatar';
import { money } from '@/lib/format';
import { createBooking } from '@/app/actions/booking';
import type { Service, Barber } from '@/types/db';

type Slot = { time: string; iso: string; taken: boolean };

export function BookingFlow({
  services, barbers, preselectedService, preselectedBarber, profile
}: {
  services: Service[]; barbers: Barber[];
  preselectedService?: string; preselectedBarber?: string;
  profile: { name: string; email: string | null; phone: string | null } | null;
}) {
  const [step, setStep] = useState<1|2|3>(preselectedService ? 2 : 1);
  const [serviceId, setServiceId] = useState<string | null>(preselectedService || null);
  const [barberId,  setBarberId]  = useState<string>(preselectedBarber || 'any');
  const [dateISO,   setDateISO]   = useState<string | null>(null);
  const [slotISO,   setSlotISO]   = useState<string | null>(null);

  const [name,  setName]  = useState(profile?.name  || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => services.find(s => s.id === serviceId) || null, [services, serviceId]);
  const days = useMemo(() => buildNextDays(14), []);

  useEffect(() => {
    if (!serviceId || !dateISO) { setSlots([]); return; }
    setLoadingSlots(true);
    fetch(`/api/availability?barberId=${barberId}&serviceId=${serviceId}&date=${dateISO}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .finally(() => setLoadingSlots(false));
  }, [barberId, serviceId, dateISO]);

  const total = service ? Number(service.price) : 0;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-3 pb-3 flex items-center gap-3.5">
        <Link href="/" className="w-9 h-9 rounded-l bg-card border border-line grid place-items-center" aria-label="Volver">
          <Icon name="arrow-left" size={18}/>
        </Link>
        <div className="text-base font-semibold -tracking-[0.2px]">Nueva reserva</div>
        <div className="flex-1"/>
        <div className="font-mono text-[11px] text-muted">{step}/3</div>
      </header>

      <div className="px-5">
        <div className="flex gap-1">
          {[1,2,3].map(i => (
            <div key={i}
              className={`flex-1 h-[3px] rounded ${i <= step ? 'bg-ink' : 'bg-line'}`}/>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 pt-4 pb-4">
        {step === 1 && (
          <>
            <SectionLabel>SERVICIO</SectionLabel>
            <div className="flex flex-col gap-2">
              {services.map(s => {
                const sel = s.id === serviceId;
                return (
                  <button key={s.id} type="button"
                    onClick={() => { setServiceId(s.id); setStep(2); }}
                    className={`text-left rounded-xl px-4 py-3 flex items-center justify-between border ${sel ? 'bg-ink text-bg border-transparent' : 'bg-card border-line'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-[34px] h-[34px] rounded-m grid place-items-center ${sel ? 'bg-dark-card' : 'bg-bg'}`}>
                        <Icon name="scissors" size={16}/>
                      </div>
                      <div>
                        <div className="text-[15px] font-medium">{s.name}</div>
                        <div className={`text-[11px] mt-0.5 ${sel ? 'text-dark-muted' : 'text-muted'}`}>{s.duration_mins} min</div>
                      </div>
                    </div>
                    <div className="font-mono text-[14px] font-medium">{money(Number(s.price))}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && service && (
          <>
            <SectionLabel>SERVICIO</SectionLabel>
            <div className="bg-ink text-bg rounded-xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-[15px] font-medium">{service.name}</div>
                <div className="text-[11px] text-dark-muted mt-0.5">{service.duration_mins} min · {money(Number(service.price))}</div>
              </div>
              <button type="button" onClick={() => setStep(1)} className="text-[11px] text-dark-muted underline">Cambiar</button>
            </div>

            <SectionLabel className="mt-5">BARBERO</SectionLabel>
            <div className="flex gap-2">
              {[{ id: 'any', name: 'Cualquiera', initials: '*', hue: 55 }, ...barbers].map(b => {
                const sel = b.id === barberId;
                return (
                  <button key={b.id} type="button" onClick={() => setBarberId(b.id)}
                    className={`flex-1 px-2 py-3 rounded-xl text-center ${sel ? 'bg-ink text-bg border-0' : 'bg-card border border-line'}`}>
                    {b.id === 'any' ? (
                      <div className={`w-9 h-9 mx-auto rounded-full grid place-items-center text-lg ${sel ? 'border border-dashed border-dark-muted' : 'border border-dashed border-muted'}`}>*</div>
                    ) : (
                      <div className="flex justify-center"><Avatar name={(b as any).initials} size={36} hue={(b as any).hue}/></div>
                    )}
                    <div className="text-xs mt-2 font-medium">{b.name}</div>
                  </button>
                );
              })}
            </div>

            <SectionLabel className="mt-5">FECHA</SectionLabel>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {days.map(d => {
                const sel = d.iso === dateISO;
                return (
                  <button key={d.iso} type="button"
                    onClick={() => { if (!d.closed) { setDateISO(d.iso); setSlotISO(null); } }}
                    disabled={d.closed}
                    className={`min-w-[54px] py-2.5 rounded-l text-center
                      ${sel ? 'bg-accent text-white border-0' :
                        d.closed ? 'border border-dashed border-line text-muted opacity-50' :
                        'bg-card border border-line text-ink'}`}>
                    <div className="text-[10px] uppercase tracking-wide">{d.wd}</div>
                    <div className="font-display text-[22px] leading-none mt-1">{d.day}</div>
                    <div className="text-[9px] mt-1 opacity-80">{d.closed ? 'Cerrado' : d.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-baseline mt-5 mb-2.5">
              <SectionLabel className="!m-0">HORARIO</SectionLabel>
              <div className="text-[11px] text-muted">
                {dateISO ? `${slots.filter(s => !s.taken).length} disponibles` : 'Elegí una fecha'}
              </div>
            </div>

            {!dateISO ? (
              <div className="text-[12px] text-muted py-6 text-center">Elegí una fecha para ver horarios</div>
            ) : loadingSlots ? (
              <div className="text-[12px] text-muted py-6 text-center">Cargando horarios…</div>
            ) : slots.length === 0 ? (
              <div className="text-[12px] text-muted py-6 text-center">Sin horarios para esta fecha</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(s => {
                  const sel = s.iso === slotISO;
                  return (
                    <button key={s.iso} type="button" disabled={s.taken}
                      onClick={() => setSlotISO(s.iso)}
                      className={`py-3 rounded-m text-center font-mono text-[13px] font-medium
                        ${sel ? 'bg-ink text-bg border-0' :
                          s.taken ? 'border border-dashed border-line text-muted line-through' :
                          'bg-card border border-line text-ink'}`}>
                      {s.time}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 3 && service && (
          <>
            <SectionLabel>RESUMEN</SectionLabel>
            <div className="bg-card border border-line rounded-xl p-4 flex flex-col gap-2">
              <Row label="Servicio" value={service.name}/>
              <Row label="Duración" value={`${service.duration_mins} min`}/>
              <Row label="Barbero" value={
                barberId === 'any' ? 'Asignamos al disponible' : barbers.find(b => b.id === barberId)?.name || ''
              }/>
              <Row label="Cuándo" value={slotISO ? new Date(slotISO).toLocaleString('es-AR', {
                weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:false
              }).replace('.', '') : ''}/>
            </div>

            <SectionLabel className="mt-5">DATOS DE CONTACTO</SectionLabel>
            <div className="flex flex-col gap-2">
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Nombre completo"
                className="bg-card border border-line rounded-xl px-4 py-3 outline-none"/>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" type="email"
                className="bg-card border border-line rounded-xl px-4 py-3 outline-none font-mono"/>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Teléfono +54..." type="tel"
                className="bg-card border border-line rounded-xl px-4 py-3 outline-none font-mono"/>
            </div>

            {error && (
              <div className="mt-3 text-[13px] rounded-lg px-3 py-2" style={{ background: 'rgba(182,117,76,.18)', color:'#B6754C' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-line bg-card px-5 pt-3.5 pb-7 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[11px] text-muted">Total</div>
          <div className="font-display text-[24px] leading-none">{money(total)}</div>
        </div>
        {step === 2 && (
          <button type="button"
            disabled={!serviceId || !dateISO || !slotISO}
            onClick={() => setStep(3)}
            className="bg-accent text-white px-6 py-3.5 rounded-xl text-[14px] font-semibold flex items-center gap-2 disabled:opacity-50">
            Siguiente <Icon name="arrow-right" size={16}/>
          </button>
        )}
        {step === 3 && (
          <button type="button"
            disabled={pending || !name || !email || !phone || !slotISO || !serviceId}
            onClick={() => start(async () => {
              setError(null);
              const res = await createBooking({
                serviceId: serviceId!,
                barberId: barberId as any,
                startsAt: slotISO!,
                customerName: name,
                customerPhone: phone,
                customerEmail: email
              });
              if (res?.error) setError(res.error);
            })}
            className="bg-accent text-white px-6 py-3.5 rounded-xl text-[14px] font-semibold flex items-center gap-2 disabled:opacity-60">
            {pending ? 'Confirmando…' : (<>Confirmar turno <Icon name="arrow-right" size={16}/></>)}
          </button>
        )}
        {step === 1 && (
          <div className="text-[12px] text-muted">Elegí un servicio</div>
        )}
      </footer>
    </main>
  );
}

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono text-[10px] tracking-[2px] text-muted mb-2.5 ${className}`}>{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="text-[13px] font-medium">{value}</div>
    </div>
  );
}

function buildNextDays(n: number) {
  const out = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      day: d.getDate(),
      wd: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.','').slice(0,3),
      label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : '',
      closed: d.getDay() === 0
    });
  }
  return out;
}
