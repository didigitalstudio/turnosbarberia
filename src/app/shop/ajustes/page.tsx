import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop, getUserShops } from '@/lib/shop-context';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { AjustesView } from '@/components/shop/AjustesView';
import { signOut } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

export default async function AjustesPage() {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/shop/ajustes');

  const [{ data: services }, { data: barbers }, { data: schedules }, userShops] = await Promise.all([
    supabase.from('services').select('*').eq('shop_id', shop.id).order('created_at'),
    supabase.from('barbers').select('*').eq('shop_id', shop.id).order('created_at'),
    supabase.from('schedules').select('*').eq('shop_id', shop.id),
    getUserShops(user.id)
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const publicUrl = `${siteUrl.replace(/\/$/, '')}/s/${shop.slug}`;

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-[440px] md:max-w-none md:mx-0">
      <ShopHeader subtitle="Ajustes" title="Configuración" />
      <AjustesView
        shop={shop}
        services={(services as any) || []}
        barbers={(barbers as any) || []}
        schedules={(schedules as any) || []}
        publicUrl={publicUrl}
        userShops={userShops}
      />
      <form action={signOut} className="px-5 pb-6 md:px-8 md:max-w-3xl md:mx-auto md:w-full">
        <button className="w-full bg-dark-card border border-dark-line text-bg rounded-xl px-4 py-3 text-[13px] font-medium text-left hover:border-bg/30 transition">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
