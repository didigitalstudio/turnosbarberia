import crypto from 'node:crypto';
import { cookies } from 'next/headers';

// Auth del super-admin es independiente del Supabase auth de usuarios
// normales. Cookie httpOnly signed con HMAC-SHA256.

const COOKIE = 'sa_session';
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

function secret(): string {
  return process.env.SUPER_ADMIN_SECRET || process.env.CRON_SECRET || '';
}

function sign(value: string): string {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function setSuperAdminSession() {
  const issued = String(Date.now());
  const sig = sign(issued);
  cookies().set(COOKIE, `${issued}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS
  });
}

export function clearSuperAdminSession() {
  cookies().set(COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0
  });
}

export function isSuperAdmin(): boolean {
  const val = cookies().get(COOKIE)?.value;
  if (!val || !secret()) return false;
  const [issued, sig] = val.split('.');
  if (!issued || !sig) return false;
  if (sign(issued) !== sig) return false;
  const age = Date.now() - Number(issued);
  if (!Number.isFinite(age) || age < 0 || age > TTL_SECONDS * 1000) return false;
  return true;
}

// Compara email + password contra env vars de manera timing-safe.
export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = (process.env.SUPER_ADMIN_EMAIL || 'info@didigitalstudio.com').toLowerCase();
  const expectedPass = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!expectedPass) return false;
  if (email.trim().toLowerCase() !== expectedEmail) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expectedPass);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
