import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop } from '@/lib/shop-context';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { CashView } from '@/components/shop/CashView';

export const dynamic = 'force-dynamic';

export default async function ShopCashPage() {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');

  const supabase = createClient();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);

  const [{ data: sales }, { data: products }, { data: expenses }, { data: appts }] = await Promise.all([
    supabase
      .from('sales')
      .select('*')
      .eq('shop_id', shop.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('products').select('*').eq('shop_id', shop.id).eq('is_active', true).order('name'),
    supabase
      .from('expenses').select('*')
      .eq('shop_id', shop.id)
      .gte('paid_at', start.toISOString())
      .lt('paid_at', end.toISOString())
      .order('paid_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('id, customer_name, starts_at, status, services(name, price), barbers(name)')
      .eq('shop_id', shop.id)
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString())
      .neq('status', 'cancelled')
      .order('starts_at')
  ]);

  // IDs de turnos ya cobrados para marcar "already_charged".
  const apptIds = ((appts as any[]) || []).map(a => a.id);
  let chargedSet = new Set<string>();
  if (apptIds.length) {
    const { data: charged } = await supabase
      .from('sales')
      .select('appointment_id')
      .eq('shop_id', shop.id)
      .in('appointment_id', apptIds);
    chargedSet = new Set(((charged as any[]) || []).map(s => s.appointment_id).filter(Boolean));
  }

  const todayAppointments = ((appts as any[]) || []).map(a => ({
    id: a.id,
    customer_name: a.customer_name,
    starts_at: a.starts_at,
    service_name: a.services?.name || null,
    service_price: Number(a.services?.price || 0),
    barber_name: a.barbers?.name || null,
    already_charged: chargedSet.has(a.id)
  }));

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-[440px] md:max-w-none md:mx-0">
      <ShopHeader title="Caja" />
      <CashView
        sales={(sales as any) || []}
        products={(products as any) || []}
        expenses={(expenses as any) || []}
        todayAppointments={todayAppointments}
      />
    </main>
  );
}
