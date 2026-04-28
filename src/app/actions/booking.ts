'use server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getShopBySlug } from '@/lib/shop-context';
import {
  RECENT_BOOKINGS_COOKIE,
  RECENT_BOOKINGS_MAX_AGE,
  appendRecentBooking
} from '@/lib/booking-cookie';
import {
  sendBookingConfirmationToCustomer,
  sendBookingNotificationToAdmin
} from '@/lib/email';
import { partsInAR } from '@/lib/tz';

const NAME_RE  = /^[\p{L}\s'.-]{2,80}$/u;
const PHONE_RE = /^[+\d\s()-]{6,30}$/;

const BookingSchema = z.object({
  shopSlug:          z.string().min(1).max(50),
  serviceId:         z.string().uuid(),
  barberId:          z.string().uuid().or(z.literal('any')),
  startsAt:          z.string().datetime(),
  customerName:      z.string().trim().regex(NAME_RE, 'Nombre inválido'),
  customerPhone:     z.string().trim().regex(PHONE_RE, 'Teléfono inválido'),
  customerEmail:     z.string().trim().email().max(120),
  // Si el user está reprogramando un turno existente, mandamos el id viejo
  // para cancelarlo después del insert exitoso. Sólo se cancela si el viejo
  // pertenece al user logueado y al mismo shop (defense-in-depth).
  rescheduleFromId:  z.string().uuid().optional()
});

export async function createBooking(input: z.infer<typeof BookingSchema>) {
  const parsed = BookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Revisá los datos: ' + parsed.error.issues.map(i => i.message).join(', ') };
  }
  const data = parsed.data;

  const shop = await getShopBySlug(data.shopSlug);
  if (!shop) return { error: 'La barbería no está disponible.' };

  // Validar rango razonable de fecha de inicio (no pasado, no más de 180 días futuro).
  const startsAt = new Date(data.startsAt);
  const now = new Date();
  const maxFuture = new Date(now.getTime() + 180 * 24 * 60 * 60_000);
  if (!(startsAt instanceof Date) || isNaN(startsAt.getTime())) {
    return { error: 'Fecha inválida.' };
  }
  if (startsAt.getTime() < now.getTime() - 60_000) {
    return { error: 'La fecha es pasada.' };
  }
  if (startsAt.getTime() > maxFuture.getTime()) {
    return { error: 'La fecha es demasiado lejana.' };
  }

  const admin = createAdminClient();
  const { data: service } = await admin
    .from('services')
    .select('id, duration_mins, is_active, shop_id')
    .eq('id', data.serviceId)
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .maybeSingle();
  if (!service) {
    return { error: 'Ese servicio ya no está disponible.' };
  }

  let barberId = data.barberId;
  const endsAt = new Date(startsAt.getTime() + service.duration_mins * 60_000);

  if (barberId === 'any') {
    const { data: barbers } = await admin
      .from('barbers').select('id').eq('shop_id', shop.id).eq('is_active', true);
    for (const b of barbers || []) {
      const { data: conflicts } = await admin
        .from('appointments')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('barber_id', b.id)
        .neq('status', 'cancelled')
        .lt('starts_at', endsAt.toISOString())
        .gt('ends_at', startsAt.toISOString())
        .limit(1);
      if (!conflicts || conflicts.length === 0) { barberId = b.id; break; }
    }
    if (barberId === 'any') return { error: 'No hay barberos libres en ese horario. Probá con otro.' };
  } else {
    const { data: barber } = await admin
      .from('barbers').select('id').eq('id', barberId).eq('shop_id', shop.id).eq('is_active', true).maybeSingle();
    if (!barber) return { error: 'Ese barbero no pertenece a esta barbería.' };
  }

  // Validar que el horario caiga dentro del schedule del barbero para ese día,
  // SIEMPRE en hora local ARG. Si usáramos getDay()/getHours() directos,
  // Vercel (UTC) interpretaría las horas en UTC y la validación pasaría por
  // azar (o rebotaría reservas válidas).
  const startAR = partsInAR(startsAt);
  const endAR = partsInAR(endsAt);
  const { data: schedule } = await admin
    .from('schedules')
    .select('start_time, end_time, is_working')
    .eq('shop_id', shop.id)
    .eq('barber_id', barberId)
    .eq('day_of_week', startAR.dow)
    .maybeSingle();
  if (!schedule || !schedule.is_working) {
    return { error: 'El barbero no trabaja ese día.' };
  }
  const slotStart = `${startAR.hh}:${startAR.mm}`;
  const slotEnd = `${endAR.hh}:${endAR.mm}`;
  if (slotStart < schedule.start_time || slotEnd > schedule.end_time) {
    return { error: 'Ese horario está fuera del horario del barbero.' };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: appointment, error: insErr } = await admin
    .from('appointments')
    .insert({
      shop_id: shop.id,
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

  // Atar el cliente a esta barbería en su PRIMERA reserva. A partir de acá,
  // el login lo manda derecho a `/{slug}` sin que tenga que recordar la URL.
  // Si el user ya tiene shop_id (vino de otro shop) no lo pisamos: queda con
  // el primero. Si is_admin = true (es dueño), tampoco — el shop_id del
  // dueño es su panel, no una barbería de cliente.
  if (user) {
    const { data: prof } = await admin
      .from('profiles')
      .select('is_admin, shop_id')
      .eq('id', user.id)
      .maybeSingle<{ is_admin: boolean; shop_id: string | null }>();
    if (prof && !prof.is_admin && !prof.shop_id) {
      await admin
        .from('profiles')
        .update({ shop_id: shop.id })
        .eq('id', user.id);
    }
  }

  // Reprogramación: cancelar el turno viejo (si pertenece al user logueado
  // y al mismo shop). Si el cancel falla, NO rollbackeamos el nuevo turno —
  // mejor terminar con el turno nuevo creado y un viejo huérfano que dejar
  // al cliente sin reserva.
  if (data.rescheduleFromId && user) {
    const { error: cancelErr } = await admin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', data.rescheduleFromId)
      .eq('shop_id', shop.id)
      .eq('profile_id', user.id)
      .neq('status', 'cancelled');
    if (cancelErr) {
      console.error('[booking] reschedule cancel failed:', cancelErr.message);
    }
  }

  // Whitelist cookie para que invitados puedan ver la página de confirmación.
  const cookieStore = cookies();
  const existing = cookieStore.get(RECENT_BOOKINGS_COOKIE)?.value;
  cookieStore.set(RECENT_BOOKINGS_COOKIE, appendRecentBooking(existing, appointment!.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: RECENT_BOOKINGS_MAX_AGE
  });

  // Emails transaccionales (best-effort, no bloquean el flujo).
  try {
    const [{ data: svcRow }, { data: bbRow }, { data: shopOwner }] = await Promise.all([
      admin.from('services').select('name').eq('id', data.serviceId).maybeSingle<{ name: string }>(),
      admin.from('barbers').select('name').eq('id', barberId).maybeSingle<{ name: string }>(),
      shop.owner_id
        ? admin.auth.admin.getUserById(shop.owner_id)
        : Promise.resolve({ data: null } as any)
    ]);
    const serviceName = svcRow?.name || 'Servicio';
    const barberName = bbRow?.name || 'tu barbero';

    await sendBookingConfirmationToCustomer({
      to: data.customerEmail,
      customerName: data.customerName,
      shopName: shop.name,
      shopSlug: shop.slug,
      serviceName,
      barberName,
      startsAt: startsAt.toISOString()
    });

    const ownerEmail = (shopOwner as any)?.data?.user?.email;
    if (ownerEmail) {
      await sendBookingNotificationToAdmin({
        to: ownerEmail,
        shopName: shop.name,
        customerName: data.customerName,
        serviceName,
        barberName,
        startsAt: startsAt.toISOString()
      });
    }
  } catch {
    // Silencioso: un fallo de mail no debe tumbar la reserva.
  }

  revalidatePath(`/${data.shopSlug}`);
  revalidatePath(`/${data.shopSlug}/mis-turnos`);
  revalidatePath('/shop');
  redirect(`/${data.shopSlug}/confirmacion/${appointment!.id}`);
}

export async function cancelAppointment(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: appt, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select('shop_id')
    .maybeSingle<{ shop_id: string }>();
  if (error) return { error: error.message };

  if (appt?.shop_id) {
    const admin = createAdminClient();
    const { data: shop } = await admin
      .from('shops').select('slug').eq('id', appt.shop_id).maybeSingle<{ slug: string }>();
    if (shop?.slug) revalidatePath(`/${shop.slug}/mis-turnos`);
  }
  return { ok: true };
}

export async function setAppointmentStatus(
  id: string,
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  // Defense-in-depth: también validamos en el action, no solo en RLS.
  const { data: profile } = await supabase
    .from('profiles').select('is_admin, shop_id').eq('id', user.id).maybeSingle<{ is_admin: boolean; shop_id: string | null }>();
  if (!profile?.is_admin || !profile.shop_id) return { error: 'Solo admins' };

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('shop_id', profile.shop_id);
  if (error) return { error: error.message };
  revalidatePath('/shop');
  return { ok: true };
}
