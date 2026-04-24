import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LAST_SHOP_COOKIE } from '@/lib/shop-context';
import { LandingPage } from '@/components/marketing/LandingPage';

export const dynamic = 'force-dynamic';

// La landing es la home pública del producto — siempre se renderiza.
// Los CTAs del navbar se adaptan según el estado de sesión (ver prop
// `viewer`). Los redirects automáticos (admin→/shop, cliente→/s/{slug})
// los elimino a propósito: el dueño comparte `turnosbarberia.com` y el
// receptor tiene que ver la landing de venta, no caer en un shop random.
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
      const lastShop = cookies().get(LAST_SHOP_COOKIE)?.value;
      if (lastShop) viewer = { href: `/s/${lastShop}`, label: 'Ir a mi barbería' };
    }
  } else {
    const lastShop = cookies().get(LAST_SHOP_COOKIE)?.value;
    if (lastShop) viewer = { href: `/s/${lastShop}`, label: 'Ir a mi barbería' };
  }

  return <LandingPage viewer={viewer} />;
}
