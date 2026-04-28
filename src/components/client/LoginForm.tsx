'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';
import { Toast } from '@/components/shared/Toast';
import { sendMagicLink } from '@/app/actions/auth';

export function LoginForm() {
  const [pendingForm, startForm] = useTransition();
  const [msg, setMsg] = useState<{ text: string } | null>(null);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [sentName, setSentName] = useState<string>('');

  // Screen: "Revisá tu email" después de enviar el magic link
  if (sentToEmail) {
    return (
      <MagicLinkSentScreen
        email={sentToEmail}
        onResend={() => {
          const fd = new FormData();
          fd.set('name', sentName || 'Usuario');
          fd.set('email', sentToEmail);
          return new Promise<{ error?: string }>((resolve) => {
            startForm(async () => {
              const res = await sendMagicLink(fd);
              resolve(res || {});
            });
          });
        }}
        resending={pendingForm}
        onUseOtherEmail={() => { setSentToEmail(null); setMsg(null); }}
      />
    );
  }

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
            Entrá con tu email, <span className="italic text-accent">te mandamos un link mágico.</span>
          </div>
        </div>

        <div className="mt-8">
          <form
            className="flex flex-col gap-3"
            action={(fd) => startForm(async () => {
              setMsg(null);
              const nameVal = String(fd.get('name') || '');
              const emailVal = String(fd.get('email') || '');
              const res = await sendMagicLink(fd);
              if (res?.error) setMsg({ text: res.error });
              else {
                setSentName(nameVal);
                setSentToEmail(emailVal);
              }
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
                tone="error"
                message={msg.text}
                onClose={() => setMsg(null)}
                autoDismissMs={5000}
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

        <div className="flex-1 min-h-[16px]" />

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/registro"
            className="text-[13px] text-dark-muted underline underline-offset-4 hover:text-bg transition text-center"
          >
            ¿No tenés cuenta todavía? Registrar mi barbería <Icon name="arrow-right" size={12} color="#8C8A83" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function MagicLinkSentScreen({
  email, onResend, onUseOtherEmail, resending
}: {
  email: string;
  onResend: () => Promise<{ error?: string }>;
  onUseOtherEmail: () => void;
  resending: boolean;
}) {
  const [cooldown, setCooldown] = useState(30);
  const [resendMsg, setResendMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const canResend = cooldown === 0 && !resending;

  const handleResend = async () => {
    if (!canResend) return;
    setResendMsg(null);
    const res = await onResend();
    if (res?.error) {
      setResendMsg({ text: res.error });
    } else {
      setResendMsg({ ok: true, text: 'Link reenviado. Revisá tu bandeja (y spam).' });
      setCooldown(30);
    }
  };

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
          Te mandamos un link a <span className="font-mono text-bg break-all">{email}</span>. Abrilo desde este dispositivo.
        </p>

        <div className="mt-8 w-full max-w-[320px] flex flex-col gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className="bg-accent text-white px-4 py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition"
          >
            {resending
              ? 'Reenviando…'
              : cooldown > 0
                ? `Reenviar link (${cooldown}s)`
                : 'Reenviar link'}
          </button>
          <button
            type="button"
            onClick={onUseOtherEmail}
            className="text-[13px] text-dark-muted underline underline-offset-4 hover:text-bg transition"
          >
            Usar otro email
          </button>
        </div>

        {resendMsg && (
          <div className="mt-5 w-full max-w-[320px] text-left">
            <Toast
              dark
              tone={resendMsg.ok ? 'success' : 'error'}
              message={resendMsg.text}
              onClose={() => setResendMsg(null)}
              autoDismissMs={5000}
            />
          </div>
        )}

        <p className="mt-8 text-[11px] text-dark-muted max-w-[280px]">
          ¿No te llegó? Revisá spam o promociones. El link vence en 1 hora.
        </p>
      </div>
    </main>
  );
}
