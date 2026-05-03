import { createClient } from '@/lib/supabase/server';

export async function getShopFeatures(): Promise<Record<string, boolean>> {
  const sb = createClient();
  const { data } = await sb.rpc('get_shop_features');
  return (data as Record<string, boolean>) ?? {};
}
