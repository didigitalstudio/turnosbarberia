import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop } from '@/lib/shop-context';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { TeamView } from '@/components/shop/TeamView';

export const dynamic = 'force-dynamic';

export default async function ShopTeamPage() {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');

  const supabase = createClient();
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - ((day + 6) % 7)); // Monday
  startOfWeek.setHours(0,0,0,0);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000);

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const [{ data: barbers }, { data: weekAppts }, { data: schedules }] = await Promise.all([
    supabase.from('barbers').select('*').eq('shop_id', shop.id).eq('is_active', true),
    supabase
      .from('appointments')
      .select('id, barber_id, starts_at, status')
      .eq('shop_id', shop.id)
      .gte('starts_at', startOfWeek.toISOString())
      .lt('starts_at', endOfWeek.toISOString())
      .neq('status', 'cancelled'),
    supabase.from('schedules').select('*').eq('shop_id', shop.id)
  ]);

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-[440px] md:max-w-none md:mx-0">
      <ShopHeader title="Equipo" />
      <TeamView
        barbers={barbers || []}
        weekAppts={(weekAppts as any) || []}
        schedules={schedules || []}
        startOfWeek={startOfWeek.toISOString()}
        todayISO={today.toISOString()}
        tomorrowISO={tomorrow.toISOString()}
      />
    </main>
  );
}
