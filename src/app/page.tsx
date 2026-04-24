import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LAST_SHOP_COOKIE } from '@/lib/shop-context';
import { LandingPage } from '@/components/marketing/LandingPage';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, shop_id')
      .eq('id', user.id)
      .maybeSingle<{ is_admin: boolean; shop_id: string | null }>();
    if (profile?.is_admin) redirect('/shop');
    if (profile && profile.shop_id === null) redirect('/onboarding');
  }

  const lastShop = cookies().get(LAST_SHOP_COOKIE)?.value;
  if (lastShop) redirect(`/s/${lastShop}`);

  // Nadie logueado, sin cookie — mostramos la landing de venta.
  return <LandingPage />;
}
