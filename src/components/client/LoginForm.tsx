'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/shared/Icon';
import { Toast } from '@/components/shared/Toast';
import { sendMagicLink } from '@/app/actions/auth';
import { enterDemo } from '@/app/actions/demo';

export function LoginForm() {
  const [pendingForm, startForm] = useTransition();
  const [pendingDemo, startDemo] = useTransition();
  const [demoRole, setDemoRole] = useState<'cliente' | 'dueno' | null>(null);
  const [showEmail, setShowEmail] = useState(false);
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
    });
  };

  return (
    <main className="min-h-screen bg-ink text-bg relative overflow-hidden">
      {/* ornaments */}
      <div className="absolute -top-[120px] -right-[80px] w-[360px] h-[360px] rounded-full border border-dark-line" aria-hidden="true" />
      <div className="absolute -top-[60px] -right-[20px] w-[240px] h-[240px] rounded-full border border-dark-line" aria-hidden="true" />

      <div className="relative flex flex-col px-6 pt-6 pb-8 min-h-screen">
        <div className="mt-7 relative">
          <div className="font-mono text-[10px] tracking-[3px] text-dark-muted mb-2.5">SAAS · BARBERÍAS</div>
          <h1 className="font-display text-[56px] leading-[0.95] -tracking-[1px]">Turnos<br/>Barbería</h1>
          <div className="mt-3 text-[13px] text-dark-muted max-w-[280px]">
            Agenda online, caja y control de equipo. <span className="italic text-accent">Todo en una.</span>
          </div>
        </div>

        {/* DEMO BANNER */}
        <div className="mt-7 rounded-2xl border border-dark-line bg-dark-card/60 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[2px] bg-accent text-white">DEMO</span>
            <span className="text-[11px] text-dark-muted uppercase tracking-[1.5px]">Probá la app sin registrarte</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDemo('cliente')}
              disabled={pendingDemo}
              className="bg-bg text-ink rounded-xl px-3 py-3 text-[13px] font-semibold flex flex-col items-center gap-1 disabled:opacity-50 active:scale-[0.98] transition">
              <Icon name="user" size={18}/>
              <span>{pendingDemo && demoRole === 'cliente' ? 'Entrando…' : 'Cliente'}</span>
            </button>
            <button
              type="button"
              onClick={() => onDemo('dueno')}
              disabled={pendingDemo}
              className="rounded-xl px-3 py-3 text-[13px] font-semibold flex flex-col items-center gap-1 text-white disabled:opacity-50 bg-accent active:scale-[0.98] transition">
              <Icon name="settings" size={18} color="#fff"/>
              <span>{pendingDemo && demoRole === 'dueno' ? 'Entrando…' : 'Dueño'}</span>
            </button>
          </div>
          <div className="mt-3 text-[10px] text-dark-muted text-center">
            Cliente: home, reservar, mis turnos<br/>
            Dueño: agenda del día, caja, equipo
          </div>
        </div>

        <div className="flex-1 min-h-[16px]" />

        {/* Owner login: collapsed by default */}
        {!showEmail ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <a
              href="/registro"
              className="bg-accent text-white w-full px-4 py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 tracking-wide active:scale-[0.98] transition"
            >
              Registrar mi barbería <Icon name="arrow-right" size={18} color="#fff"/>
            </a>
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="text-[13px] text-dark-muted underline underline-offset-4 hover:text-bg transition"
            >
              Ya tengo cuenta, entrar con email
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-[20px] leading-[1.25] max-w-[280px]">
                Entrá con tu email,<br/>
                <span className="italic text-accent">te mandamos un link mágico.</span>
              </p>
              <button
                type="button"
                onClick={() => { setShowEmail(false); setMsg(null); }}
                className="text-dark-muted text-[11px] uppercase tracking-[1.5px]"
                aria-label="Volver"
              >
                Volver
              </button>
            </div>

            <form
              className="flex flex-col gap-3"
              action={(fd) => startForm(async () => {
                setMsg(null);
                const res = await sendMagicLink(fd);
                if (res?.error) setMsg({ text: res.error });
                else setMsg({ ok: true, text: 'Te mandamos un link a tu email. Abrilo desde este dispositivo para entrar.' });
              })}
            >
              <label className="bg-dark-card rounded-xl px-4 py-3 border border-dark-line block focus-within:border-accent transition">
                <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Nombre</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  enterKeyHint="next"
                  placeholder="Tu nombre"
                  className="bg-transparent text-bg text-[16px] w-full outline-none placeholder:text-dark-muted/60"
                />
              </label>
              <label className="bg-dark-card rounded-xl px-4 py-3 border border-dark-line flex items-center gap-2.5 focus-within:border-accent transition">
                <div className="flex-1">
                  <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="send"
                    placeholder="vos@email.com"
                    className="bg-transparent text-bg text-[16px] w-full outline-none font-mono placeholder:text-dark-muted/60"
                  />
                </div>
                <Icon name="mail" size={18} color="#8C8A83"/>
              </label>

              {msg && (
                <Toast
                  dark
                  tone={msg.ok ? 'success' : 'error'}
                  message={msg.text}
                  onClose={() => setMsg(null)}
                  autoDismissMs={msg.ok ? 6000 : 5000}
                />
              )}

              <button
                type="submit"
                disabled={pendingForm}
                className="bg-accent text-white border-0 px-4 py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 tracking-wide disabled:opacity-60 active:scale-[0.98] transition"
              >
                {pendingForm ? 'Enviando link…' : (<>Entrar <Icon name="arrow-right" size={18} color="#fff"/></>)}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
