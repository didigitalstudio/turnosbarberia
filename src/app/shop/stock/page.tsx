import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop } from '@/lib/shop-context';
import { getShopFeatures } from '@/lib/subscriptions';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { StockView } from '@/components/shop/StockView';
import { FeatureGate } from '@/components/ui/feature-gate';

export const dynamic = 'force-dynamic';

export default async function ShopStockPage() {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');

  const features = await getShopFeatures();
  const supabase = createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .order('name');

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-[440px] md:max-w-none md:mx-0">
      <ShopHeader title="Stock" />
      <FeatureGate enabled={features.stock ?? false} message="El módulo de Stock está disponible en el plan Pro">
        <StockView products={(products as any) || []} />
      </FeatureGate>
    </main>
  );
}
