import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from '@/components/client/RegisterForm';
import { MobileShell } from '@/components/shared/MobileShell';

export const dynamic = 'force-dynamic';

export default async function RegistroPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
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
