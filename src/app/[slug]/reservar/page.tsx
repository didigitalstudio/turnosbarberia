import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getShopBySlug } from '@/lib/shop-context';
import { BookingFlow } from '@/components/client/BookingFlow';

export const dynamic = 'force-dynamic';

export default async function ReservarPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { service?: string; barber?: string; reschedule?: string };
}) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();

  const supabase = createClient();
  const [
    { data: services },
    { data: barbers },
    { data: schedules },
    { data: { user } }
  ] = await Promise.all([
    supabase.from('services').select('*').eq('shop_id', shop.id).eq('is_active', true).order('price'),
    supabase.from('barbers').select('*').eq('shop_id', shop.id).eq('is_active', true).order('created_at'),
    supabase.from('schedules').select('day_of_week, is_working').eq('shop_id', shop.id),
    supabase.auth.getUser()
  ]);

  // Un día está abierto si al menos un barbero activo trabaja ese día de la semana.
  const workingDays = Array.from(new Set(
    (schedules || [])
      .filter((s: any) => s.is_working)
      .map((s: any) => Number(s.day_of_week))
  )).sort();

  let profile: { name: string; email: string | null; phone: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('name, email, phone').eq('id', user.id).maybeSingle();
    profile = (data as typeof profile) || null;
  }

  // Reprogramación: si vino ?reschedule=<id>, validamos que el turno
  // pertenece al user logueado y a este shop. Si no, lo ignoramos.
  // (El server action vuelve a chequear; esto es solo para la UI.)
  let rescheduleFromId: string | undefined;
  let rescheduleService: string | undefined;
  if (user && searchParams.reschedule) {
    const { data: prev } = await supabase
      .from('appointments')
      .select('id, service_id, status')
      .eq('id', searchParams.reschedule)
      .eq('shop_id', shop.id)
      .eq('profile_id', user.id)
      .maybeSingle<{ id: string; service_id: string; status: string }>();
    if (prev && prev.status !== 'cancelled') {
      rescheduleFromId = prev.id;
      rescheduleService = prev.service_id;
    }
  }

  return (
    <BookingFlow
      shopSlug={params.slug}
      services={services || []}
      barbers={barbers || []}
      preselectedService={rescheduleService || searchParams.service}
      preselectedBarber={searchParams.barber}
      profile={profile}
      workingDays={workingDays.length > 0 ? workingDays : undefined}
      rescheduleFromId={rescheduleFromId}
    />
  );
}
