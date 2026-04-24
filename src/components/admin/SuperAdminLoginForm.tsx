'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/shared/Icon';
import { Toast } from '@/components/shared/Toast';
import { loginSuperAdmin } from '@/app/actions/super-admin-auth';

export function SuperAdminLoginForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-ink text-bg relative overflow-hidden">
      <div className="absolute -top-[120px] -right-[80px] w-[360px] h-[360px] rounded-full border border-dark-line" aria-hidden="true" />
      <div className="absolute -top-[60px] -right-[20px] w-[240px] h-[240px] rounded-full border border-dark-line" aria-hidden="true" />

      <div className="relative flex flex-col items-stretch px-6 pt-6 pb-8 min-h-screen max-w-[440px] mx-auto">
        <div className="mt-10">
          <div className="font-mono text-[10px] tracking-[3px] text-dark-muted mb-2.5">SUPER ADMIN</div>
          <h1 className="font-display text-[44px] leading-[0.98] -tracking-[1px]">
            Panel<br/><span className="italic text-accent">/desa</span>
          </h1>
          <div className="mt-3 text-[13px] text-dark-muted max-w-[280px]">
            Acceso restringido. Ingresá con tu email y clave de super-admin.
          </div>
        </div>

        <div className="flex-1 min-h-[16px]" />

        <form
          className="flex flex-col gap-3"
          action={(fd) => start(async () => {
            setErr(null);
            const res = await loginSuperAdmin(fd);
            if (res?.error) setErr(res.error);
          })}
        >
          <label className="bg-dark-card rounded-xl px-4 py-3 border border-dark-line block focus-within:border-accent transition">
            <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              defaultValue="desa.baires@gmail.com"
              placeholder="desa.baires@gmail.com"
              className="bg-transparent text-bg text-[16px] w-full outline-none font-mono placeholder:text-dark-muted/60"
            />
          </label>
          <label className="bg-dark-card rounded-xl px-4 py-3 border border-dark-line block focus-within:border-accent transition">
            <span className="block text-[10px] text-dark-muted uppercase tracking-[1.5px] mb-1">Contraseña</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-transparent text-bg text-[16px] w-full outline-none placeholder:text-dark-muted/60"
            />
          </label>

          {err && (
            <Toast dark tone="error" message={err} onClose={() => setErr(null)} />
          )}

          <button
            type="submit"
            disabled={pending}
            className="bg-accent text-white border-0 px-4 py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 tracking-wide disabled:opacity-60 active:scale-[0.98] transition"
          >
            {pending ? 'Entrando…' : (<>Entrar <Icon name="arrow-right" size={18} color="#fff"/></>)}
          </button>
        </form>

        <p className="text-center mt-6 text-[11px] text-dark-muted">
          <a href="/" className="underline underline-offset-4">Volver al inicio</a>
        </p>
      </div>
    </main>
  );
}
