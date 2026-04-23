'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/shared/Icon';
import { sendMagicLink } from '@/app/actions/auth';
import { enterDemo } from '@/app/actions/demo';

export function LoginForm() {
  const [pendingForm, startForm] = useTransition();
  const [pendingDemo, startDemo] = useTransition();
  const [demoRole, setDemoRole] = useState<'cliente' | 'dueno' | null>(null);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  const onDemo = (role: 'cliente' | 'dueno') => {
    setDemoRole(role);
    setMsg(null);
    startDemo(async () => {
      const res = await enterDemo(role);
      if (res?.error) {
        setDemoRole(null);
        setMsg({ text: res.error });
      }
      // On success, server action redirects.
    });
  };

  return (
    <div className="min-h-screen bg-ink text-bg relative overflow-hidden">
      {/* ornaments */}
      <div className="absolute -top-[120px] -right-[80px] w-[360px] h-[360px] rounded-full border border-dark-line" />
      <div className="absolute -top-[60px] -right-[20px] w-[240px] h-[240px] rounded-full border border-dark-line" />

      <div className="relative flex flex-col px-6 pt-6 pb-8 min-h-screen">
        <div className="mt-7 relative">
          <div className="font-mono text-[10px] tracking-[3px] text-dark-muted mb-2.5">EST. 2019 · BS. AS.</div>
          <div className="font-display text-[64px] leading-[0.9] -tracking-[1px]">El<br/>Estudio</div>
          <div className="mt-2.5 text-xs uppercase tracking-[6px] text-dark-muted">Barbershop</div>
        </div>

        {/* DEMO BANNER */}
        <div className="mt-7 rounded-2xl border border-dark-line bg-dark-card/60 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[2px]" style={{ background: '#B6754C', color: '#fff' }}>DEMO</span>
            <span className="text-[11px] text-dark-muted uppercase tracking-[1.5px]">Probá la app sin registrarte</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDemo('cliente')}
              disabled={pendingDemo}
              className="bg-bg text-ink rounded-xl px-3 py-3 text-[13px] font-semibold flex flex-col items-center gap-1 disabled:opacity-50">
              <Icon name="user" size={18}/>
              <span>{pendingDemo && demoRole === 'cliente' ? 'Entrando…' : 'Cliente'}</span>
            </button>
            <button
              type="button"
              onClick={() => onDemo('dueno')}
              disabled={pendingDemo}
              className="rounded-xl px-3 py-3 text-[13px] font-semibold flex flex-col items-center gap-1 text-white disabled:opacity-50"
              style={{ background: '#B6754C' }}>
              <Icon name="settings" size={18} color="#fff"/>
              <span>{pendingDemo && demoRole === 'dueno' ? 'Entrando…' : 'Dueño'}</span>
            </button>
          </div>
          <div className="mt-3 text-[10px] text-dark-muted text-center">
            Vista del cliente: home, reservar, mis turnos<br/>
            Vista del dueño: agenda del día, caja, equipo
          </div>
        </div>

        <div className="flex-1 min-h-[16px]" />

        <p className="font-display text-[20px] leading-[1.25] mt-4 mb-3 max-w-[280px]">
          O entrá con tu email,<br/>
          <span className="italic" style={{ color: '#B6754C' }}>te mandamos un link mágico.</span>
        </p>

        <form
          className="flex flex-col gap-3"
          action={(fd) => startForm(async () => {
            setMsg(null);
            const res = await sendMagicLink(fd);
            if (res?.error) setMsg({ text: res.error });
            else setMsg({ ok: true, text: 'Te enviamos un link a tu email para entrar.' });
          })}
        >
          <label className="bg-dark-card rounded-xl px-4 py-3 border border-dark-line block">
            <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Nombre</span>
            <input
              name="name" required minLength={2}
              placeholder="Joaquín Méndez"
              className="bg-transparent text-bg text-[15px] w-full outline-none placeholder:text-dark-muted/60"
            />
          </label>
          <label className="bg-dark-card rounded-xl px-4 py-3 border border-dark-line flex items-center gap-2.5">
            <div className="flex-1">
              <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Email</span>
              <input
                name="email" type="email" required
                placeholder="vos@email.com"
                className="bg-transparent text-bg text-[15px] w-full outline-none font-mono placeholder:text-dark-muted/60"
              />
            </div>
            <Icon name="mail" size={18} color="#8C8A83"/>
          </label>

          {msg && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{
                background: msg.ok ? 'rgba(245,243,238,.08)' : 'rgba(182,117,76,.18)',
                color: msg.ok ? '#F5F3EE' : '#B6754C'
              }}
            >
              {msg.text}
            </div>
          )}

          <button
            type="submit" disabled={pendingForm}
            className="bg-accent text-white border-0 px-4 py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 tracking-wide disabled:opacity-60"
            style={{ background: '#B6754C' }}
          >
            {pendingForm ? 'Enviando…' : (<>Entrar <Icon name="arrow-right" size={18} color="#fff"/></>)}
          </button>
        </form>
      </div>
    </div>
  );
}
