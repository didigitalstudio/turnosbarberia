'use server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAdminShop } from '@/lib/shop-context';
import { slugify } from '@/lib/slug';
import {
  UpdateShopSchema,
  UpsertServiceSchema,
  UpsertBarberSchema,
  UpdateSchedulesItemSchema,
  AddShopSchema,
  SwitchShopSchema,
  TIMEZONE_RE,
  formatZodError
} from '@/lib/validation';
import { z } from 'zod';

// ─── Shop ────────────────────────────────────────────────────────────────────

export async function updateShop(input: {
  name: string;
  address?: string;
  phone?: string;
  timezone?: string;
}) {
  const shop = await getAdminShop();
  if (!shop) return { error: 'No autorizado' };

  const parsed = UpdateShopSchema.safeParse(input);
  if (!parsed.success) return { error: formatZodError(parsed.error) };
  const d = parsed.data;

  const name = d.name;
  const address = (d.address || '').trim() || null;
  const phone = (d.phone || '').trim() || null;
  if (phone && !/^[+\d\s()-]{6,30}$/.test(phone)) return { error: 'Teléfono inválido' };
  const tzInput = (d.timezone || '').trim();
  const timezone = tzInput || shop.timezone;
  if (tzInput && !TIMEZONE_RE.test(tzInput)) return { error: 'Timezone inválida' };

  const supabase = createClient();
  const { error } = await supabase
    .from('shops')
    .update({ name, address, phone, timezone })
    .eq('id', shop.id);
  if (error) return { error: error.message };

  revalidatePath('/shop/ajustes');
  revalidatePath('/shop');
  return { ok: true };
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function upsertService(input: {
  id?: string;
  name: string;
  duration_mins: number;
  price: number;
  description?: string;
}) {
  const shop = await getAdminShop();
  if (!shop) return { error: 'No autorizado' };

  const parsed = UpsertServiceSchema.safeParse(input);
  if (!parsed.success) return { error: formatZodError(parsed.error) };
  const d = parsed.data;
  const description = (d.description || '').trim() || null;

  const supabase = createClient();
  if (d.id) {
    const { error } = await supabase
      .from('services')
      .update({ name: d.name, duration_mins: d.duration_mins, price: d.price, description })
      .eq('id', d.id)
      .eq('shop_id', shop.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('services')
      .insert({ shop_id: shop.id, name: d.name, duration_mins: d.duration_mins, price: d.price, description, is_active: true });
    if (error) return { error: error.message };
  }
  revalidatePath('/shop/ajustes');
  revalidatePath(`/s/${shop.slug}`);
  return { ok: true };
}

export async function toggleService(id: string, active: boolean) {
  const shop = await getAdminShop();
  if (!shop) return { error: 'No autorizado' };
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' };

  const supabase = createClient();
  const { error } = await supabase
    .from('services')
    .update({ is_active: !!active })
    .eq('id', id)
    .eq('shop_id', shop.id);
  if (error) return { error: error.message };
  revalidatePath('/shop/ajustes');
  revalidatePath(`/s/${shop.slug}`);
  return { ok: true };
}

// ─── Barbers ─────────────────────────────────────────────────────────────────

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const STARTER_BARBER_LIMIT = 3;

export async function upsertBarber(input: {
  id?: string;
  name: string;
  role?: string;
}) {
  const shop = await getAdminShop();
  if (!shop) return { error: 'No autorizado' };

  const parsed = UpsertBarberSchema.safeParse(input);
  if (!parsed.success) return { error: formatZodError(parsed.error) };
  const d = parsed.data;

  const role = (d.role || '').trim() || null;
  const supabase = createClient();

  if (d.id) {
    // Edit: no cuenta contra el límite del plan.
    const { error } = await supabase
      .from('barbers')
      .update({ name: d.name, role, initials: initialsFrom(d.name) })
      .eq('id', d.id)
      .eq('shop_id', shop.id);
    if (error) return { error: error.message };
  } else {
    // B.1 · Plan enforcement: Starter = hasta 3 barberos activos por sede.
    if ((shop as any).plan === 'starter') {
      const { count } = await supabase
        .from('barbers')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .eq('is_active', true);
      if ((count ?? 0) >= STARTER_BARBER_LIMIT) {
        return {
          error:
            'Alcanzaste el límite de 3 barberos del plan Starter. Pasá a Pro para sumar más.'
        };
      }
    }

    // Compute unique slug within shop.
    const base = slugify(d.name) || 'barbero';
    let slug = base;
    let n = 2;
    while (true) {
      const { data: exists } = await supabase
        .from('barbers')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('slug', slug)
        .maybeSingle();
      if (!exists) break;
      slug = `${base}-${n++}`;
      if (n > 50) return { error: 'No se pudo generar un slug único' };
    }
    const { data: inserted, error } = await supabase
      .from('barbers')
      .insert({
        shop_id: shop.id,
        name: d.name,
        slug,
        role,
        initials: initialsFrom(d.name),
        hue: Math.floor(Math.random() * 360),
        is_active: true
      })
      .select('id')
      .maybeSingle<{ id: string }>();
    if (error || !inserted) return { error: error?.message || 'Error al crear barbero' };

    // Default schedules (Domingo cerrado).
    const scheds = Array.from({ length: 7 }, (_, day) => ({
      shop_id: shop.id,
      barber_id: inserted.id,
      day_of_week: day,
      start_time: '10:00',
      end_time: '20:00',
      is_working: day !== 0
    }));
    await supabase.from('schedules').insert(scheds);
  }

  revalidatePath('/shop/ajustes');
  revalidatePath('/shop/equipo');
  revalidatePath(`/s/${shop.slug}`);
  return { ok: true };
}

export async function toggleBarber(id: string, active: boolean) {
  const shop = await getAdminShop();
  if (!shop) return { error: 'No autorizado' };
  if (!z.string().uuid().safeParse(id).success) return { error: 'ID inválido' };

  // Si reactivamos, también chequeamos el límite del plan.
  if (active && (shop as any).plan === 'starter') {
    const supabase = createClient();
    const { count } = await supabase
      .from('barbers')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shop.id)
      .eq('is_active', true);
    if ((count ?? 0) >= STARTER_BARBER_LIMIT) {
      return {
        error: 'Alcanzaste el límite de 3 barberos del plan Starter. Pasá a Pro para sumar más.'
      };
    }
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('barbers')
    .update({ is_active: !!active })
    .eq('id', id)
    .eq('shop_id', shop.id);
  if (error) return { error: error.message };
  revalidatePath('/shop/ajustes');
  revalidatePath('/shop/equipo');
  return { ok: true };
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function updateSchedules(
  barberId: string,
  days: Array<{ day_of_week: number; start_time: string; end_time: string; is_working: boolean }>
) {
  const shop = await getAdminShop();
  if (!shop) return { error: 'No autorizado' };

  if (!z.string().uuid().safeParse(barberId).success) return { error: 'ID de barbero inválido' };

  const parsed = z.array(UpdateSchedulesItemSchema).min(1).max(7).safeParse(days);
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  // Validar que el barbero pertenezca al shop.
  const supabase = createClient();
  const { data: b } = await supabase
    .from('barbers').select('id').eq('id', barberId).eq('shop_id', shop.id).maybeSingle();
  if (!b) return { error: 'Barbero no encontrado' };

  // Upsert via delete + insert.
  const { error: delErr } = await supabase
    .from('schedules').delete().eq('shop_id', shop.id).eq('barber_id', barberId);
  if (delErr) return { error: delErr.message };

  const rows = parsed.data.map(d => ({
    shop_id: shop.id,
    barber_id: barberId,
    day_of_week: d.day_of_week,
    start_time: d.start_time,
    end_time: d.end_time,
    is_working: d.is_working
  }));
  const { error } = await supabase.from('schedules').insert(rows);
  if (error) return { error: error.message };

  revalidatePath('/shop/ajustes');
  revalidatePath('/shop/equipo');
  revalidatePath(`/s/${shop.slug}`);
  return { ok: true };
}

// ─── Multi-sede ──────────────────────────────────────────────────────────────

/**
 * Agrega una nueva sede. Requiere que:
 *   - El user ya sea admin (tiene al menos un shop).
 *   - Su plan actual sea 'pro' (starter = 1 sede fija).
 *
 * El trigger `on_shop_created` en la migración 0006 se encarga de:
 *   - Insertar al owner en shop_members.
 *   - Mover profile.shop_id al nuevo shop (queda como sede "actual").
 */
export async function addShop(input: {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const currentShop = await getAdminShop();
  if (!currentShop) return { error: 'Primero tenés que crear tu primera sede desde Onboarding.' };

  // B.2 · Plan enforcement.
  if ((currentShop as any).plan !== 'pro') {
    return {
      error: 'El plan Starter incluye solo 1 sede. Pasá a Pro para sedes ilimitadas.'
    };
  }

  const parsed = AddShopSchema.safeParse(input);
  if (!parsed.success) return { error: formatZodError(parsed.error) };
  const d = parsed.data;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('shops').select('id').eq('slug', d.slug).maybeSingle();
  if (existing) return { error: 'Ese slug ya está en uso, elegí otro' };

  const { error: shopErr } = await admin
    .from('shops')
    .insert({
      name: d.name,
      slug: d.slug,
      address: (d.address || '').trim() || null,
      phone: (d.phone || '').trim() || null,
      owner_id: user.id,
      is_active: false,
      // Nuevas sedes heredan el plan del owner (si es pro, seguirá siendo pro).
      plan: (currentShop as any).plan || 'starter'
    });
  if (shopErr) return { error: 'No se pudo crear la sede: ' + shopErr.message };

  revalidatePath('/shop/ajustes');
  revalidatePath('/shop');
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Cambia la sede "actual" del user via RPC. */
export async function switchShop(shopId: string) {
  const parsed = SwitchShopSchema.safeParse({ shopId });
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase.rpc('switch_current_shop', {
    target_shop_id: parsed.data.shopId
  });
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
}
