import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getShopBySlug } from '@/lib/shop-context';
import { TabBar } from '@/components/client/TabBar';
import { Icon } from '@/components/shared/Icon';
import { Avatar } from '@/components/shared/Avatar';
import { ChangeAvatarButton, EmailNotifsToggle } from '@/components/client/ProfileControls';
import { signOut } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

const APP_VERSION = 'v0.1.0';

export default async function PerfilPage({ params }: { params: { slug: string } }) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/s/${params.slug}/perfil`);

  const { data: profile } = await supabase
    .from('profiles').select('name, email, phone, is_admin').eq('id', user.id).maybeSingle<{
      name: string | null; email: string | null; phone: string | null; is_admin: boolean;
    }>();

  const initials = (profile?.name || user.email || 'U')
    .split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-3 pb-3">
        <h1 className="font-display text-[30px] -tracking-[0.5px]">Perfil</h1>
      </header>

      <div className="flex-1 px-5 pb-6 overflow-auto">
        <div className="bg-card border border-line rounded-2xl p-5 flex items-center gap-4">
          <Avatar name={initials} size={64} hue={55}/>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold truncate">{profile?.name || 'Sin nombre'}</div>
            <div className="text-[12px] text-muted mt-0.5 font-mono truncate">{profile?.email || user.email}</div>
            {profile?.phone && <div className="text-[12px] text-muted mt-0.5 font-mono">{profile.phone}</div>}
            <div className="mt-2"><ChangeAvatarButton /></div>
          </div>
        </div>

        <div className="mt-3">
          <EmailNotifsToggle />
        </div>

        {profile?.is_admin && (
          <Link href="/shop" className="mt-3 bg-ink text-bg rounded-2xl p-4 flex items-center justify-between active:scale-[0.99] transition">
            <div>
              <div className="text-[10px] tracking-[2px] uppercase text-dark-muted font-mono">Modo</div>
              <div className="text-[15px] font-semibold mt-1">Panel de la barbería</div>
            </div>
            <Icon name="chevron-right" size={20} color="#F5F3EE"/>
          </Link>
        )}

        <form action={signOut} className="mt-3">
          <button className="w-full min-h-[48px] bg-card border border-line rounded-xl px-4 py-3.5 text-left text-[14px] font-medium flex items-center gap-3 active:scale-[0.99] transition">
            <Icon name="arrow-right" size={16}/> Cerrar sesión
          </button>
        </form>

        <div className="mt-8 text-center font-mono text-[10px] tracking-[2px] text-muted">
          {shop.name.toUpperCase()} · {APP_VERSION}
        </div>
      </div>

      <TabBar slug={params.slug} />
    </main>
  );
}
