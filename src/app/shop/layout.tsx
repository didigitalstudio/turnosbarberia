import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/shop');

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) redirect('/');

  return (
    <div className="min-h-screen bg-dark text-bg">
      {children}
    </div>
  );
}
