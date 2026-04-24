'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { setSuperAdminSession, clearSuperAdminSession, verifyCredentials } from '@/lib/super-admin-auth';

// Cooldown simple per-session para rate-limitar brute force.
const COOLDOWN_COOKIE = 'sa_cd';
const COOLDOWN_MS = 2_000;

export async function loginSuperAdmin(fd: FormData): Promise<{ error?: string }> {
  const cookieStore = cookies();
  const last = cookieStore.get(COOLDOWN_COOKIE)?.value;
  if (last) {
    const ts = Number(last);
    if (Number.isFinite(ts) && Date.now() - ts < COOLDOWN_MS) {
      return { error: 'Esperá un momento e intentá de nuevo.' };
    }
  }
  cookieStore.set(COOLDOWN_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60
  });

  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  if (!email || !password) return { error: 'Completá email y contraseña.' };
  if (!verifyCredentials(email, password)) {
    return { error: 'Credenciales inválidas.' };
  }
  setSuperAdminSession();
  redirect('/desa');
}

export async function logoutSuperAdmin(): Promise<void> {
  clearSuperAdminSession();
  redirect('/desa/login');
}
