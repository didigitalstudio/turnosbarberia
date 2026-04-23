import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LAST_SHOP_COOKIE } from '@/lib/shop-context';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle<{ is_admin: boolean }>();
    if (profile?.is_admin) redirect('/shop');
  }

  const lastShop = cookies().get(LAST_SHOP_COOKIE)?.value;
  if (lastShop) redirect(`/s/${lastShop}`);

  // No landing page yet — fall back to the demo shop.
  redirect('/s/demo');
}
