'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { Toast } from '@/components/shared/Toast';
import { requestPasswordReset } from '@/app/actions/auth';

export function PasswordResetRequestForm({ expired = false }: { expired?: boolean }) {
  const [pending, start] = useTransition();
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'info'; text: string } | null>(
    expired ? { tone: 'info', text: 'Tu link de recuperación expiró. Pedí uno nuevo.' } : null
  );

  if (sentToEmail) {
    return (
      <main className="min-h-screen bg-ink text-bg relative overflow-hidden flex flex-col">
        <div className="absolute -top-[120px] -right-[80px] w-[360px] h-[360px] rounded-full border border-dark-line" aria-hidden="true" />
        <div className="absolute -top-[60px] -right-[20px] w-[240px] h-[240px] rounded-full border border-dark-line" aria-hidden="true" />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="w-[96px] h-[96px] rounded-full bg-accent/15 border border-accent/40 grid place-items-center">
            <Icon name="mail" size={44} color="#B6754C" />
          </div>
          <h1 className="font-display text-[40px] leading-[1.02] -tracking-[0.5px] mt-6">
            Revisá tu <span className="italic text-accent">email</span>
          </h1>
          <p className="mt-4 text-[14px] text-dark-muted max-w-[320px] leading-relaxed">
            Si existe una cuenta con <span className="font-mono text-bg break-all">{sentToEmail}</span>, te mandamos un link para crear una nueva contraseña.
          </p>
          <p className="mt-6 text-[12px] text-dark-muted max-w-[300px]">
            El link vence en 1 hora. Si no llega, revisá spam o promociones.
          </p>
          <Link
            href="/login"
            className="mt-8 text-[13px] text-dark-muted underline underline-offset-4 hover:text-bg transition"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink text-bg relative overflow-hidden">
      <div className="absolute -top-[120px] -right-[80px] w-[360px] h-[360px] rounded-full border border-dark-line" aria-hidden="true" />
      <div className="absolute -top-[60px] -right-[20px] w-[240px] h-[240px] rounded-full border border-dark-line" aria-hidden="true" />

      <div className="relative flex flex-col px-6 pt-6 pb-8 min-h-screen">
        <div className="mt-7 relative">
          <div className="font-mono text-[10px] tracking-[3px] text-dark-muted mb-2.5">RECUPERAR ACCESO</div>
          <h1 className="font-display text-[44px] leading-[0.98] -tracking-[1px]">¿Olvidaste tu<br/><span className="italic text-accent">contraseña?</span></h1>
          <div className="mt-3 text-[13px] text-dark-muted max-w-[300px]">
            Ingresá tu email y te mandamos un link para crear una nueva.
          </div>
        </div>

        <form
          className="mt-6 flex flex-col gap-3"
          action={(fd) => start(async () => {
            const email = String(fd.get('email') || '').trim();
            setMsg(null);
            // requestPasswordReset siempre devuelve ok=true (no enumera).
            // Mostramos siempre la pantalla "revisá tu email" para que la UX
            // sea idéntica con o sin cuenta registrada.
            await requestPasswordReset(fd);
            setSentToEmail(email);
          })}
        >
          <label className="bg-dark-card rounded-xl px-4 py-3 border border-dark-line block focus-within:border-accent transition">
            <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Email</span>
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              enterKeyHint="send"
              placeholder="vos@email.com"
              className="bg-transparent text-bg text-[16px] w-full outline-none font-mono placeholder:text-dark-muted/60"
            />
          </label>

          {msg && (
            <Toast
              dark
              tone={msg.tone}
              message={msg.text}
              onClose={() => setMsg(null)}
              autoDismissMs={5000}
            />
          )}

          <button
            type="submit"
            disabled={pending}
            className="bg-accent text-white border-0 px-4 py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 tracking-wide disabled:opacity-60 active:scale-[0.98] transition"
          >
            {pending ? 'Enviando…' : (<>Enviar link <Icon name="arrow-right" size={18} color="#fff"/></>)}
          </button>
        </form>

        <div className="flex-1 min-h-[16px]" />

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] text-dark-muted underline underline-offset-4 hover:text-bg transition text-center"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
