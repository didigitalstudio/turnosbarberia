import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop } from '@/lib/shop-context';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { NewWalkInForm } from '@/components/shop/NewWalkInForm';

export const dynamic = 'force-dynamic';

export default async function NewWalkInPage() {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');
  const sb = createClient();
  const [{ data: services }, { data: barbers }] = await Promise.all([
    sb.from('services').select('id, name, duration_mins, price').eq('shop_id', shop.id).eq('is_active', true).order('name'),
    sb.from('barbers').select('id, name').eq('shop_id', shop.id).eq('is_active', true).order('name')
  ]);
  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-[440px] md:max-w-none md:mx-0">
      <ShopHeader title="Nuevo turno (walk-in)" />
      <NewWalkInForm
        services={(services as any) || []}
        barbers={(barbers as any) || []}
      />
    </main>
  );
}
