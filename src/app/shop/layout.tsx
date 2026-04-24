import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop, getUserShops } from '@/lib/shop-context';
import { ShopSidebar } from '@/components/shop/ShopSidebar';
import { ShopTabBar } from '@/components/shop/ShopTabBar';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/shop');

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) redirect('/');

  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');

  const userShops = await getUserShops(user.id);

  return (
    <div className="min-h-screen bg-dark text-bg md:flex">
      <aside className="hidden md:block md:w-64 lg:w-72 md:shrink-0 md:border-r md:border-dark-line md:sticky md:top-0 md:h-screen">
        <ShopSidebar
          shop={{ id: shop.id, name: shop.name, slug: shop.slug }}
          userShops={userShops.map(s => ({ id: s.id, name: s.name, slug: s.slug }))}
        />
      </aside>
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {!shop.is_active && (
          <div
            role="status"
            className="bg-accent/15 border-b border-accent/40 text-bg px-5 py-3 md:px-8">
            <div className="max-w-5xl mx-auto flex items-start gap-3 text-[13px]">
              <span className="font-mono text-[10px] tracking-[2px] text-accent font-semibold mt-0.5 uppercase shrink-0">
                Pendiente
              </span>
              <div className="flex-1">
                Tu barbería está <b>pendiente de aprobación</b>. Te avisamos por email cuando esté activa.
                Mientras tanto podés terminar de configurarla en Ajustes.
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <div className="md:hidden">
          <ShopTabBar/>
        </div>
      </div>
    </div>
  );
}
