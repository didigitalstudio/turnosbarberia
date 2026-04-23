'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const name  = String(formData.get('name')  || '').trim();
  const phone = String(formData.get('phone') || '').trim();

  if (!email || !email.includes('@')) {
    return { error: 'Ingresá un email válido' };
  }
  if (name.length < 2) {
    return { error: 'Ingresá tu nombre completo' };
  }

  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { name, phone }
    }
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
