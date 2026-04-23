import { createClient } from '@/lib/supabase/server';
import { ShopHeader, ShopTabs } from '@/components/shop/ShopHeader';
import { ShopTabBar } from '@/components/shop/ShopTabBar';
import { AgendaView } from '@/components/shop/AgendaView';

export const dynamic = 'force-dynamic';

export default async function ShopAgendaPage({ searchParams }: { searchParams: { d?: string } }) {
  const supabase = createClient();
  const dayISO = searchParams.d || todayISO();
  const start = new Date(dayISO + 'T00:00:00-03:00');
  const end   = new Date(start.getTime() + 86400000);

  const [{ data: appts }, { data: barbers }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, starts_at, ends_at, customer_name, status, services(name, duration_mins, price), barbers(id, name, initials, hue)')
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString())
      .neq('status', 'cancelled')
      .order('starts_at'),
    supabase.from('barbers').select('*').eq('is_active', true)
  ]);

  return (
    <main className="min-h-screen flex flex-col">
      <ShopHeader subtitle="Dashboard" title="El Estudio · Palermo" action="search"/>
      <ShopTabs active="agenda"/>
      <AgendaView appointments={(appts as any) || []} barbers={barbers || []} dayISO={dayISO}/>
      <ShopTabBar/>
    </main>
  );
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
