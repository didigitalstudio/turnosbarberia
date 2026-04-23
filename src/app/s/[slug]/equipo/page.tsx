import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getShopBySlug } from '@/lib/shop-context';
import { Icon } from '@/components/shared/Icon';
import { Avatar } from '@/components/shared/Avatar';
import { Pill } from '@/components/shared/Pill';
import { TabBar } from '@/components/client/TabBar';
import { EmptyState } from '@/components/shared/EmptyState';

export const dynamic = 'force-dynamic';

export default async function EquipoPage({ params }: { params: { slug: string } }) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();

  const supabase = createClient();
  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, slug, role, initials, hue, rating, bio')
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .order('rating', { ascending: false });

  const slug = params.slug;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-3 pb-3">
        <h1 className="font-display text-[30px] -tracking-[0.5px]">Nuestro equipo</h1>
        <p className="text-[13px] text-muted mt-1">
          Elegí con quién querés cortarte. Todos están al palo.
        </p>
      </header>

      <div className="flex-1 overflow-auto px-5 pb-6">
        {!barbers || barbers.length === 0 ? (
          <EmptyState
            icon="users"
            title="Sin equipo cargado"
            description="Pronto vas a poder ver y elegir a tu barbero favorito."
            ctaLabel="Reservar de todas formas"
            ctaHref={`/s/${slug}/reservar`}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {barbers.map((b: any) => (
              <article key={b.id}
                className="bg-card border border-line rounded-2xl p-4 flex items-center gap-4 active:scale-[0.99] transition">
                <Avatar name={b.initials} size={64} hue={b.hue}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[16px] font-semibold truncate">{b.name}</h2>
                    <Pill tone="soft">
                      <Icon name="star" size={10} color="#B6754C"/>
                      <span className="ml-0.5 text-accent">{Number(b.rating).toFixed(1)}</span>
                    </Pill>
                  </div>
                  <div className="text-[12px] text-muted mt-0.5 truncate">{b.role}</div>
                  {b.bio && (
                    <p className="text-[12px] text-muted mt-1.5 line-clamp-2">{b.bio}</p>
                  )}
                  <Link href={`/s/${slug}/reservar?barber=${b.id}`}
                    className="inline-flex items-center gap-1.5 mt-2.5 text-[12px] font-semibold text-accent active:opacity-60 transition">
                    Reservar con {b.name.split(' ')[0]}
                    <Icon name="arrow-right" size={14} color="#B6754C"/>
                  </Link>
                </div>
              </article>
            ))}

            <Link href={`/s/${slug}/reservar`}
              className="mt-2 bg-ink text-bg rounded-2xl px-4 py-4 text-center text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition">
              <Icon name="plus" size={16} color="#F5F3EE"/>
              Reservar sin elegir barbero
            </Link>
          </div>
        )}
      </div>

      <TabBar slug={slug} />
    </main>
  );
}
