import { redirect } from 'next/navigation';
import { getAdminShop } from '@/lib/shop-context';

export default async function NewWalkInPage() {
  const shop = await getAdminShop();
  if (!shop) redirect('/login?error=no_shop');
  redirect(`/s/${shop.slug}/reservar`);
}
