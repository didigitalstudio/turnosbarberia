import { createClient } from '@/lib/supabase/server';
import { BookingFlow } from '@/components/client/BookingFlow';

export const dynamic = 'force-dynamic';

export default async function ReservarPage({
  searchParams
}: { searchParams: { service?: string; barber?: string } }) {
  const supabase = createClient();
  const [{ data: services }, { data: barbers }, { data: { user } }] = await Promise.all([
    supabase.from('services').select('*').eq('is_active', true).order('price'),
    supabase.from('barbers').select('*').eq('is_active', true).order('created_at'),
    supabase.auth.getUser()
  ]);

  let profile: { name: string; email: string | null; phone: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('name, email, phone').eq('id', user.id).maybeSingle();
    profile = data || null;
  }

  return (
    <BookingFlow
      services={services || []}
      barbers={barbers || []}
      preselectedService={searchParams.service}
      preselectedBarber={searchParams.barber}
      profile={profile}
    />
  );
}
