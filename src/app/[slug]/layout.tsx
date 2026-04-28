import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getShopBySlug } from '@/lib/shop-context';
import { PRODUCT } from '@/lib/shop-info';
import { MobileShell } from '@/components/shared/MobileShell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const shop = await getShopBySlug(params.slug);
  if (!shop) return { title: PRODUCT.name };
  return {
    title: `${shop.name} · ${PRODUCT.name}`,
    description: PRODUCT.tagline
  };
}

export default async function ShopSlugLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();
  return (
    <MobileShell>
      {children}
    </MobileShell>
  );
}
