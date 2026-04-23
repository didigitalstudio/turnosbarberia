import { createClient } from '@/lib/supabase/server';
import { ShopHeader, ShopTabs } from '@/components/shop/ShopHeader';
import { ShopTabBar } from '@/components/shop/ShopTabBar';
import { CashView } from '@/components/shop/CashView';

export const dynamic = 'force-dynamic';

export default async function ShopCashPage() {
  const supabase = createClient();
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(start); end.setDate(end.getDate() + 1);

  const [{ data: sales }, { data: products }] = await Promise.all([
    supabase
      .from('sales')
      .select('*')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('products').select('*').eq('is_active', true).order('name')
  ]);

  return (
    <main className="min-h-screen flex flex-col">
      <ShopHeader subtitle="Caja del día"
        title={new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'short' }).replace('.','')}
        action="more"/>
      <ShopTabs active="caja"/>
      <CashView sales={(sales as any) || []} products={products || []}/>
      <ShopTabBar/>
    </main>
  );
}
