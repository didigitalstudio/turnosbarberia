import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PasswordResetRequestForm } from '@/components/client/PasswordResetRequestForm';
import { MobileShell } from '@/components/shared/MobileShell';

export const dynamic = 'force-dynamic';

export default async function RecuperarPasswordPage({
  searchParams
}: {
  searchParams?: { expired?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Si ya está logueado (volvió por el link de recovery), saltamos directo
  // a la pantalla de definir la nueva password.
  if (user) redirect('/cuenta/actualizar-password');

  const expired = searchParams?.expired === '1';
  return (
    <MobileShell>
      <PasswordResetRequestForm expired={expired} />
    </MobileShell>
  );
}
