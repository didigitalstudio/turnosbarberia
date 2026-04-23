'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const BookingSchema = z.object({
  serviceId: z.string().uuid(),
  barberId:  z.string().uuid().or(z.literal('any')),
  startsAt:  z.string().datetime(),
  customerName:  z.string().min(2),
  customerPhone: z.string().min(6),
  customerEmail: z.string().email()
});

export async function createBooking(input: z.infer<typeof BookingSchema>) {
  const parsed = BookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Datos inválidos: ' + parsed.error.issues.map(i => i.message).join(', ') };
  }
  const data = parsed.data;

  // Use admin client to bypass RLS for guest bookings (still validated above)
  const admin = createAdminClient();
  const { data: service, error: svcErr } = await admin
    .from('services').select('id, duration_mins, is_active').eq('id', data.serviceId).single();
  if (svcErr || !service || !service.is_active) {
    return { error: 'Servicio no encontrado' };
  }

  let barberId = data.barberId;
  if (barberId === 'any') {
    // Pick first active barber that doesn't have a conflict at that time
    const { data: barbers } = await admin
      .from('barbers').select('id').eq('is_active', true);
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(startsAt.getTime() + service.duration_mins * 60_000);
    for (const b of barbers || []) {
      const { data: conflicts } = await admin
        .from('appointments')
        .select('id')
        .eq('barber_id', b.id)
        .neq('status', 'cancelled')
        .lt('starts_at', endsAt.toISOString())
        .gt('ends_at', startsAt.toISOString())
        .limit(1);
      if (!conflicts || conflicts.length === 0) { barberId = b.id; break; }
    }
    if (barberId === 'any') return { error: 'No hay barberos disponibles en ese horario' };
  }

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.duration_mins * 60_000);

  // Get current user (if authenticated) to link the booking
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: appointment, error: insErr } = await admin
    .from('appointments')
    .insert({
      profile_id: user?.id || null,
      barber_id: barberId,
      service_id: data.serviceId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      customer_email: data.customerEmail,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed'
    })
    .select('id')
    .single();

  if (insErr) {
    if (insErr.message.toLowerCase().includes('exclude')) {
      return { error: 'Ese horario se acaba de ocupar. Probá con otro.' };
    }
    return { error: insErr.message };
  }

  revalidatePath('/');
  revalidatePath('/mis-turnos');
  revalidatePath('/shop');
  redirect(`/confirmacion/${appointment!.id}`);
}

export async function cancelAppointment(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('profile_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/mis-turnos');
  return { ok: true };
}

export async function setAppointmentStatus(id: string, status: 'confirmed'|'in_progress'|'completed'|'cancelled'|'no_show') {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', (await supabase.auth.getUser()).data.user?.id || '').maybeSingle();
  if (!profile?.is_admin) return { error: 'Solo admins' };

  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shop');
  return { ok: true };
}
