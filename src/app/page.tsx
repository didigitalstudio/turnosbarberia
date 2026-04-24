import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LAST_SHOP_COOKIE } from '@/lib/shop-context';
import { LandingPage } from '@/components/marketing/LandingPage';

export const dynamic = 'force-dynamic';

// La landing es la home pública del producto — siempre se renderiza.
// Los CTAs del navbar se adaptan según el estado de sesión (ver prop
// `viewer`). Los redirects automáticos (admin→/shop, cliente→/{slug})
// los elimino a propósito: el dueño comparte barberiaonline.vercel.app
// y el receptor tiene que ver la landing de venta, no caer en un shop
// random.

// Paths reservados — no se usan como slugs de shop.
const RESERVED = new Set([
  'api', 'auth', 'shop', 'login', 'registro',
  'demo', 'desarrollo', 'onboarding', 'admin',
  's', 'desa'
]);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/;

function safeShopSlug(raw: string | undefined): string | null {
  if (!raw) return null;
  if (RESERVED.has(raw)) return null;
  if (!SLUG_RE.test(raw)) return null;
  return raw;
}

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let viewer: {
    href: string;
    label: string;
  } | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, shop_id')
      .eq('id', user.id)
      .maybeSingle<{ is_admin: boolean; shop_id: string | null }>();

    if (profile?.is_admin) {
      viewer = { href: '/shop', label: 'Ir a mi panel' };
    } else if (profile && profile.shop_id === null) {
      viewer = { href: '/onboarding', label: 'Terminar registro' };
    } else {
      const lastShop = safeShopSlug(cookies().get(LAST_SHOP_COOKIE)?.value);
      if (lastShop) viewer = { href: `/${lastShop}`, label: 'Ir a mi barbería' };
    }
  } else {
    const lastShop = safeShopSlug(cookies().get(LAST_SHOP_COOKIE)?.value);
    if (lastShop) viewer = { href: `/${lastShop}`, label: 'Ir a mi barbería' };
  }

  return <LandingPage viewer={viewer} />;
}
