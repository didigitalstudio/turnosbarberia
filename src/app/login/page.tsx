import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/client/LoginForm';
import { MobileShell } from '@/components/shared/MobileShell';

export const dynamic = 'force-dynamic';

// Si viene con `?demo=1` queremos mostrar siempre los botones de demo,
// incluso si el visitor tiene una sesión previa — típicamente llega de
// la landing queriendo ver la demo. Misma lógica cuando la sesión actual
// es DE CUENTA DEMO (para switchear cliente↔dueño).
const DEMO_EMAILS = new Set([
  'cliente.demo@turnosbarberia.app',
  'dueno.demo@turnosbarberia.app'
]);

export default async function LoginPage({ searchParams }: { searchParams: { demo?: string } }) {
  const forceDemo = searchParams?.demo === '1';
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && !forceDemo && !DEMO_EMAILS.has((user.email || '').toLowerCase())) {
    const { data: profile } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    redirect((profile as any)?.is_admin ? '/shop' : '/');
  }
  return <MobileShell><LoginForm /></MobileShell>;
}
