import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Shop } from '@/types/db';

/**
 * Devuelve el shop por slug (URL pública del cliente).
 * Usa el admin client para no depender de la sesión — el cliente aún no se
 * logueó cuando llega a `/s/[slug]`.
 */
export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const sb = createAdminClient();
  const { data } = await sb.from('shops').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
  return (data as Shop | null) ?? null;
}

/**
 * Shop asociado al user logueado (admin). Deriva del `profiles.shop_id`.
 * Devuelve null si el user no es admin o no tiene shop asignado.
 */
export async function getAdminShop(): Promise<Shop | null> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin, shop_id')
    .eq('id', user.id)
    .maybeSingle<{ is_admin: boolean; shop_id: string | null }>();

  if (!profile?.is_admin || !profile.shop_id) return null;

  // Usamos admin client porque un shop inactivo (pendiente de aprobación)
  // aún debe ser visible para su owner, pero la policy pública solo devuelve
  // activos.
  const admin = createAdminClient();
  const { data: shop } = await admin
    .from('shops')
    .select('*')
    .eq('id', profile.shop_id)
    .maybeSingle();

  return (shop as Shop | null) ?? null;
}

/**
 * Todas las sedes en las que este user es miembro (owner/admin).
 * Usado por el selector de sedes del panel admin en Plan Pro.
 */
export async function getUserShops(userId: string): Promise<Shop[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('shop_members')
    .select('shops(*)')
    .eq('profile_id', userId);
  // Supabase puede devolver `shops` como objeto (FK simple) o array (según
  // cómo infiera el schema). Normalizamos ambos casos.
  const rows = (data || []) as unknown as Array<{ shops: Shop | Shop[] | null }>;
  const shops: Shop[] = [];
  for (const r of rows) {
    if (!r.shops) continue;
    if (Array.isArray(r.shops)) shops.push(...r.shops);
    else shops.push(r.shops);
  }
  return shops;
}

/**
 * Último shop visitado por el cliente, guardado en una cookie `last_shop`.
 * Se usa en `/` para redirigir al cliente al shop que ya conoce.
 */
export const LAST_SHOP_COOKIE = 'last_shop';
