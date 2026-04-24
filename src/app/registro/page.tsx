import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from '@/components/client/RegisterForm';
import { MobileShell } from '@/components/shared/MobileShell';

export const dynamic = 'force-dynamic';

const DEMO_EMAILS = new Set([
  'cliente.demo@turnosbarberia.app',
  'dueno.demo@turnosbarberia.app'
]);

export default async function RegistroPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si el visitor está logueado PERO es una cuenta demo, dejamos que vea el
  // form de registro: probó la demo y ahora quiere crear su cuenta real.
  const isDemo = DEMO_EMAILS.has((user?.email || '').toLowerCase());

  if (user && !isDemo) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .maybeSingle<{ shop_id: string | null }>();
    if (profile?.shop_id) redirect('/shop');
    redirect('/onboarding');
  }

  return <MobileShell><RegisterForm /></MobileShell>;
}
