import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TabBar } from '@/components/client/TabBar';
import { MyAppointmentsView } from '@/components/client/MyAppointmentsView';

export const dynamic = 'force-dynamic';

export default async function MisTurnosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const nowISO = new Date().toISOString();
  const [{ data: upcoming }, { data: history }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, starts_at, status, services(name, duration_mins, price), barbers(name)')
      .eq('profile_id', user.id)
      .neq('status', 'cancelled')
      .gte('starts_at', nowISO)
      .order('starts_at'),
    supabase
      .from('appointments')
      .select('id, starts_at, status, services(name), barbers(name)')
      .eq('profile_id', user.id)
      .lt('starts_at', nowISO)
      .order('starts_at', { ascending: false })
      .limit(10)
  ]);

  return (
    <main className="min-h-screen flex flex-col">
      <MyAppointmentsView upcoming={(upcoming as any) || []} history={(history as any) || []}/>
      <TabBar />
    </main>
  );
}
