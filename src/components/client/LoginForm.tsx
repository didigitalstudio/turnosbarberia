'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/shared/Icon';
import { sendMagicLink } from '@/app/actions/auth';

export function LoginForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  return (
    <div className="min-h-screen bg-ink text-bg relative overflow-hidden">
      {/* ornaments */}
      <div className="absolute -top-[120px] -right-[80px] w-[360px] h-[360px] rounded-full border border-dark-line" />
      <div className="absolute -top-[60px] -right-[20px] w-[240px] h-[240px] rounded-full border border-dark-line" />

      <form
        className="relative flex flex-col px-6 pt-6 pb-8 min-h-screen"
        action={(fd) => start(async () => {
          const res = await sendMagicLink(fd);
          if (res?.error) setMsg({ text: res.error });
          else setMsg({ ok: true, text: 'Te enviamos un link a tu email para entrar.' });
        })}
      >
        <div className="mt-7 relative">
          <div className="font-mono text-[10px] tracking-[3px] text-dark-muted mb-2.5">EST. 2019 · BS. AS.</div>
          <div className="font-display text-[64px] leading-[0.9] -tracking-[1px]">El<br/>Estudio</div>
          <div className="mt-2.5 text-xs uppercase tracking-[6px] text-dark-muted">Barbershop</div>
        </div>

        <div className="flex-1" />

        <p className="font-display text-[22px] leading-[1.25] mb-7 max-w-[280px]">
          Reservá tu turno en segundos.<br/>
          <span className="italic" style={{ color: '#B6754C' }}>Sin llamadas, sin esperas.</span>
        </p>

        <div className="flex flex-col gap-3 mb-4">
          <label className="bg-dark-card rounded-xl px-4 py-3.5 border border-dark-line block">
            <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Nombre</span>
            <input
              name="name" required minLength={2}
              placeholder="Joaquín Méndez"
              className="bg-transparent text-bg text-base w-full outline-none placeholder:text-dark-muted/60"
            />
          </label>
          <label className="bg-dark-card rounded-xl px-4 py-3.5 border border-dark-line flex items-center gap-2.5">
            <div className="flex-1">
              <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Email</span>
              <input
                name="email" type="email" required
                placeholder="vos@email.com"
                className="bg-transparent text-bg text-base w-full outline-none font-mono placeholder:text-dark-muted/60"
              />
            </div>
            <Icon name="mail" size={18} color="#8C8A83"/>
          </label>
          <label className="bg-dark-card rounded-xl px-4 py-3.5 border border-dark-line flex items-center gap-2.5">
            <div className="flex-1">
              <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Teléfono (opcional)</span>
              <input
                name="phone" type="tel"
                placeholder="+54 9 11 5823 4412"
                className="bg-transparent text-bg text-base w-full outline-none font-mono placeholder:text-dark-muted/60"
              />
            </div>
            <Icon name="phone" size={18} color="#8C8A83"/>
          </label>
        </div>

        {msg && (
          <div
            className={`mb-3 text-sm rounded-lg px-3 py-2 ${msg.ok ? 'bg-bg/10 text-bg' : 'bg-accent/20 text-accent'}`}
            style={{ background: msg.ok ? 'rgba(245,243,238,.08)' : 'rgba(182,117,76,.18)' }}
          >
            {msg.text}
          </div>
        )}

        <button
          type="submit" disabled={pending}
          className="bg-accent text-white border-0 px-4 py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 tracking-wide disabled:opacity-60"
        >
          {pending ? 'Enviando…' : (<>Entrar <Icon name="arrow-right" size={18}/></>)}
        </button>

        <p className="text-center mt-4 text-xs text-dark-muted">
          Te mandamos un link mágico a tu email para entrar
        </p>
      </form>
    </div>
  );
}
