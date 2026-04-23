import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/availability';
import { getShopBySlug } from '@/lib/shop-context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopSlug = searchParams.get('shopSlug');
  const shopIdParam = searchParams.get('shopId');
  const barberId = searchParams.get('barberId');
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date');
  if (!barberId || !serviceId || !date || (!shopSlug && !shopIdParam)) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  let shopId: string | null = shopIdParam;
  if (!shopId && shopSlug) {
    const shop = await getShopBySlug(shopSlug);
    if (!shop) return NextResponse.json({ error: 'shop not found' }, { status: 404 });
    shopId = shop.id;
  }
  if (!shopId) return NextResponse.json({ error: 'missing shop' }, { status: 400 });

  if (barberId === 'any') {
    // For "Cualquiera" we union slots across all active barbers in this shop
    const { createClient } = await import('@/lib/supabase/server');
    const sb = createClient();
    const { data: barbers } = await sb
      .from('barbers').select('id').eq('shop_id', shopId).eq('is_active', true);
    const all = await Promise.all((barbers || []).map(b => getAvailableSlots(shopId!, b.id, serviceId, date)));
    const map = new Map<string, { time: string; iso: string; taken: boolean }>();
    for (const slots of all) {
      for (const s of slots) {
        const cur = map.get(s.time);
        if (!cur || (cur.taken && !s.taken)) map.set(s.time, s);
      }
    }
    return NextResponse.json({ slots: Array.from(map.values()).sort((a,b) => a.time.localeCompare(b.time)) });
  }
  const slots = await getAvailableSlots(shopId, barberId, serviceId, date);
  return NextResponse.json({ slots });
}
