import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TabBar } from '@/components/client/TabBar';
import { Icon } from '@/components/shared/Icon';
import { Avatar } from '@/components/shared/Avatar';
import { signOut } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('name, email, phone, is_admin').eq('id', user.id).maybeSingle();

  const initials = (profile?.name || user.email || 'U')
    .split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-3 pb-3">
        <div className="font-display text-[30px] -tracking-[0.5px]">Perfil</div>
      </header>

      <div className="flex-1 px-5 pb-6 overflow-auto">
        <div className="bg-card border border-line rounded-2xl p-5 flex items-center gap-4">
          <Avatar name={initials} size={64} hue={55}/>
          <div>
            <div className="text-lg font-semibold">{profile?.name || 'Sin nombre'}</div>
            <div className="text-[12px] text-muted mt-0.5 font-mono">{profile?.email || user.email}</div>
            {profile?.phone && <div className="text-[12px] text-muted mt-0.5 font-mono">{profile.phone}</div>}
          </div>
        </div>

        {profile?.is_admin && (
          <a href="/shop" className="mt-3 block bg-ink text-bg rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[2px] uppercase text-dark-muted font-mono">Modo</div>
              <div className="text-[15px] font-semibold mt-1">Panel de la barbería</div>
            </div>
            <Icon name="chevron-right" size={20} color="#F5F3EE"/>
          </a>
        )}

        <form action={signOut} className="mt-3">
          <button className="w-full bg-card border border-line rounded-xl px-4 py-3.5 text-left text-[14px] font-medium flex items-center gap-3">
            <Icon name="arrow-right" size={16}/> Cerrar sesión
          </button>
        </form>
      </div>

      <TabBar />
    </main>
  );
}
