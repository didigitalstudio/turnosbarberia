import { createClient as createServerClient } from '@/lib/supabase/server';

const SLOT_GRANULARITY_MIN = 30;

export type Slot = { time: string; iso: string; taken: boolean };

function pad(n: number) { return n.toString().padStart(2, '0'); }
function hmToMin(hm: string) { const [h, m] = hm.split(':').map(Number); return h * 60 + m; }
function minToHM(mins: number) { return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; }

export async function getAvailableSlots(shopId: string, barberId: string, serviceId: string, dateISO: string) {
  const supabase = createServerClient();
  const date = new Date(dateISO + 'T00:00:00-03:00');
  const dayOfWeek = date.getDay();

  const [{ data: service }, { data: schedule }, { data: appts }] = await Promise.all([
    supabase.from('services').select('duration_mins').eq('id', serviceId).eq('shop_id', shopId).single(),
    supabase.from('schedules').select('*')
      .eq('shop_id', shopId)
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle(),
    supabase.from('appointments')
      .select('starts_at, ends_at')
      .eq('shop_id', shopId)
      .eq('barber_id', barberId)
      .gte('starts_at', new Date(date.getTime()).toISOString())
      .lt('starts_at', new Date(date.getTime() + 86400000).toISOString())
      .neq('status', 'cancelled')
  ]);

  if (!service || !schedule || !schedule.is_working) return [];

  const dur = service.duration_mins;
  const startMin = hmToMin(schedule.start_time);
  const endMin = hmToMin(schedule.end_time);

  const slots: Slot[] = [];
  for (let t = startMin; t + dur <= endMin; t += SLOT_GRANULARITY_MIN) {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(t / 60), t % 60, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + dur * 60_000);

    const overlaps = (appts || []).some(a => {
      const aStart = new Date(a.starts_at).getTime();
      const aEnd = new Date(a.ends_at).getTime();
      return slotStart.getTime() < aEnd && slotEnd.getTime() > aStart;
    });

    const inPast = slotStart.getTime() < Date.now();
    slots.push({ time: minToHM(t), iso: slotStart.toISOString(), taken: overlaps || inPast });
  }

  return slots;
}
