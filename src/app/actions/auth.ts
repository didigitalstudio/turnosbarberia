'use server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LAST_SHOP_COOKIE } from '@/lib/shop-context';

const RESERVED_SLUGS = new Set([
  'api', 'auth', 'shop', 'login', 'registro',
  'demo', 'desarrollo', 'onboarding', 'admin', 's', 'desa'
]);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/;

function safeShopSlug(raw: string | undefined): string | null {
  if (!raw) return null;
  if (RESERVED_SLUGS.has(raw)) return null;
  if (!SLUG_RE.test(raw)) return null;
  return raw;
}

async function destinationForCurrentUser(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '/';
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, shop_id')
    .eq('id', user.id)
    .maybeSingle<{ is_admin: boolean; shop_id: string | null }>();

  // Dueño que terminó el wizard → su panel admin.
  if (profile?.is_admin && profile.shop_id) return '/shop';
  // Dueño en proceso de registro (cuenta creada pero sin shop) → wizard.
  if (profile?.is_admin && !profile.shop_id) return '/onboarding';

  // Cliente atado a una barbería → directo a su barbería.
  if (profile?.shop_id) {
    const admin = createAdminClient();
    const { data: shop } = await admin
      .from('shops')
      .select('slug')
      .eq('id', profile.shop_id)
      .maybeSingle<{ slug: string }>();
    if (shop?.slug) return `/${shop.slug}`;
  }

  // Fallback: cookie de "última barbería visitada" (visitor sin atar).
  const lastShop = safeShopSlug(cookies().get(LAST_SHOP_COOKIE)?.value);
  if (lastShop) return `/${lastShop}`;
  return '/';
}

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

export async function signupOwner(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const name  = String(formData.get('name')  || '').trim();
  const phone = String(formData.get('phone') || '').trim();

  if (name.length < 2) {
    return { error: 'Ingresá tu nombre completo' };
  }
  if (!email || !email.includes('@')) {
    return { error: 'Ingresá un email válido' };
  }

  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
      data: { name, phone }
    }
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || !email.includes('@')) {
    return { error: 'Ingresá un email válido' };
  }
  if (!password) {
    return { error: 'Ingresá tu contraseña' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Mensaje genérico para no filtrar si el email existe o no.
    return { error: 'Email o contraseña inválidos' };
  }
  const dest = await destinationForCurrentUser(supabase);
  return { ok: true, dest };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
