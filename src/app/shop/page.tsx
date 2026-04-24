import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminShop } from '@/lib/shop-context';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { AgendaView } from '@/components/shop/AgendaView';
import { ShopActivationChecklist } from '@/components/shop/ShopActivationChecklist';

export const dynamic = 'force-dynamic';

export default async function ShopAgendaPage({ searchParams }: { searchParams: { d?: string } }) {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');

  const supabase = createClient();
  const dayISO = searchParams.d || todayISO();
  const start = new Date(dayISO + 'T00:00:00-03:00');
  const end   = new Date(start.getTime() + 86400000);

  const [{ data: appts }, { data: barbers }, { data: schedules }, { count: totalAppts }, { count: totalSales }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, starts_at, ends_at, customer_name, status, services(name, duration_mins, price), barbers(id, name, initials, hue)')
      .eq('shop_id', shop.id)
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString())
      .neq('status', 'cancelled')
      .order('starts_at'),
    supabase.from('barbers').select('*').eq('shop_id', shop.id).eq('is_active', true),
    supabase.from('schedules').select('day_of_week, is_working').eq('shop_id', shop.id),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shop.id),
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shop.id)
  ]);

  const appointments = (appts as any) || [];

  const workingDays = Array.from(new Set(
    (schedules || [])
      .filter((s: any) => s.is_working)
      .map((s: any) => Number(s.day_of_week))
  )).sort();

  const zeroState = (totalAppts || 0) === 0 && (totalSales || 0) === 0;

  return (
    <main className="flex-1 flex flex-col min-w-0 mx-auto w-full max-w-[440px] md:max-w-none md:mx-0">
      <ShopHeader title="Agenda" />
      {zeroState ? (
        <ShopActivationChecklist shopName={shop.name} slug={shop.slug}/>
      ) : (
        <AgendaView
          appointments={appointments}
          barbers={barbers || []}
          dayISO={dayISO}
          workingDays={workingDays.length > 0 ? workingDays : undefined}
        />
      )}
    </main>
  );
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
