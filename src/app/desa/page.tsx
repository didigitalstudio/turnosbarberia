import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SuperAdminPanel } from '@/components/admin/SuperAdminPanel';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_EMAIL = 'desa.baires@gmail.com';
const STARTER_PRICE = 30000;
const PRO_PRICE = 50000;

type ShopRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  plan: string;
  owner_id: string | null;
  created_at: string;
};

export default async function DesaPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) redirect('/login?next=/desa');
  if (user.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) redirect('/');

  const admin = createAdminClient();

  const { data: shops } = await admin
    .from('shops')
    .select('id, slug, name, is_active, plan, owner_id, created_at')
    .order('created_at', { ascending: false });

  const rows: ShopRow[] = (shops as any[] || []).map(s => ({
    ...s,
    plan: s.plan || 'starter'
  }));

  // Resolve owner emails en batch.
  const ownerIds = Array.from(new Set(rows.map(r => r.owner_id).filter((x): x is string => !!x)));
  const ownerEmailMap = new Map<string, string>();
  for (const oid of ownerIds) {
    try {
      const { data } = await admin.auth.admin.getUserById(oid);
      if (data?.user?.email) ownerEmailMap.set(oid, data.user.email);
    } catch { /* ignore */ }
  }

  // Count barbers/services/appointments por shop.
  const shopIds = rows.map(r => r.id);
  const [{ data: barbersAgg }, { data: servicesAgg }, { data: apptsAgg }] = await Promise.all([
    admin.from('barbers').select('shop_id').in('shop_id', shopIds.length ? shopIds : ['00000000-0000-0000-0000-000000000000']),
    admin.from('services').select('shop_id').in('shop_id', shopIds.length ? shopIds : ['00000000-0000-0000-0000-000000000000']),
    admin.from('appointments').select('shop_id').in('shop_id', shopIds.length ? shopIds : ['00000000-0000-0000-0000-000000000000'])
  ]);
  const countBy = (list: any[] | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of list || []) m.set(r.shop_id, (m.get(r.shop_id) || 0) + 1);
    return m;
  };
  const barbersCount = countBy(barbersAgg);
  const servicesCount = countBy(servicesAgg);
  const apptsCount = countBy(apptsAgg);

  // Métricas globales.
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const { count: apptsLast30 } = await admin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('starts_at', monthAgo.toISOString());

  const activeShops = rows.filter(r => r.is_active);
  const starterCount = activeShops.filter(r => r.plan === 'starter').length;
  const proCount = activeShops.filter(r => r.plan === 'pro').length;
  const mrr = starterCount * STARTER_PRICE + proCount * PRO_PRICE;

  const enriched = rows.map(r => ({
    ...r,
    owner_email: r.owner_id ? ownerEmailMap.get(r.owner_id) || null : null,
    barbers_count: barbersCount.get(r.id) || 0,
    services_count: servicesCount.get(r.id) || 0,
    appointments_count: apptsCount.get(r.id) || 0
  }));

  return (
    <SuperAdminPanel
      shops={enriched}
      metrics={{
        activeShops: activeShops.length,
        appointmentsLast30: apptsLast30 || 0,
        mrrEstimate: mrr,
        starterCount,
        proCount
      }}
    />
  );
}
