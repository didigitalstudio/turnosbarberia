'use server';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { sendShopActivatedToOwner, sendOwnerPasswordReset } from '@/lib/email';
import { isSuperAdmin } from '@/lib/super-admin-auth';

async function assertSuperAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSuperAdmin()) return { ok: false, error: 'No autorizado' };
  return { ok: true };
}

function randomPassword(): string {
  return randomBytes(12).toString('base64url').slice(0, 14);
}

export async function setShopActive(shopId: string, active: boolean) {
  const guard = await assertSuperAdmin();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: shopBefore } = await admin
    .from('shops').select('id, slug, name, owner_id, is_active')
    .eq('id', shopId)
    .maybeSingle<{ id: string; slug: string; name: string; owner_id: string | null; is_active: boolean }>();
  if (!shopBefore) return { error: 'Shop no encontrado' };

  const { error } = await admin
    .from('shops').update({ is_active: active }).eq('id', shopId);
  if (error) return { error: error.message };

  // Si pasó de inactivo → activo: aviso al dueño.
  if (active && !shopBefore.is_active && shopBefore.owner_id) {
    try {
      const { data: ownerRes } = await admin.auth.admin.getUserById(shopBefore.owner_id);
      const ownerEmail = ownerRes?.user?.email;
      if (ownerEmail) {
        await sendShopActivatedToOwner({
          to: ownerEmail,
          shopName: shopBefore.name,
          shopSlug: shopBefore.slug
        });
      }
    } catch { /* silencioso */ }
  }

  revalidatePath('/desa');
  return { ok: true };
}

export async function setShopPlan(shopId: string, plan: 'starter' | 'pro') {
  const guard = await assertSuperAdmin();
  if (!guard.ok) return { error: guard.error };

  if (plan !== 'starter' && plan !== 'pro') return { error: 'Plan inválido' };

  const admin = createAdminClient();
  const { error } = await admin.from('shops').update({ plan }).eq('id', shopId);
  if (error) return { error: error.message };

  revalidatePath('/desa');
  return { ok: true };
}

export async function resetOwnerPassword(shopId: string) {
  const guard = await assertSuperAdmin();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: shop } = await admin
    .from('shops').select('id, name, owner_id')
    .eq('id', shopId)
    .maybeSingle<{ id: string; name: string; owner_id: string | null }>();
  if (!shop?.owner_id) return { error: 'Shop sin owner asignado' };

  const password = randomPassword();
  const { data: upd, error: updErr } = await admin.auth.admin.updateUserById(shop.owner_id, {
    password,
    email_confirm: true
  });
  if (updErr) return { error: updErr.message };

  const ownerEmail = upd?.user?.email;
  if (ownerEmail) {
    const mailRes = await sendOwnerPasswordReset({
      to: ownerEmail,
      tempPassword: password,
      shopName: shop.name
    });
    if (!('ok' in mailRes) || mailRes.ok === false) {
      return { error: `Pass cambiada pero el mail falló: ${(mailRes as any).error || ''}` };
    }
  }

  return { ok: true, email: ownerEmail };
}

export async function deleteShop(shopId: string, confirmSlug: string) {
  const guard = await assertSuperAdmin();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: shop } = await admin
    .from('shops').select('id, slug').eq('id', shopId).maybeSingle<{ id: string; slug: string }>();
  if (!shop) return { error: 'Shop no encontrado' };
  if (shop.slug !== confirmSlug) return { error: 'El slug no coincide' };

  // ON DELETE CASCADE borra barbers/services/schedules/appointments/products/sales/expenses.
  const { error } = await admin.from('shops').delete().eq('id', shopId);
  if (error) return { error: error.message };

  revalidatePath('/desa');
  return { ok: true };
}
