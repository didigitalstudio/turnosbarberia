import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UpdatePasswordForm } from '@/components/client/UpdatePasswordForm';
import { MobileShell } from '@/components/shared/MobileShell';

export const dynamic = 'force-dynamic';

// Pantalla de "definir nueva contraseña". Sólo accesible con sesión
// activa: el flow de recovery exchange-ea el code y crea la sesión antes
// de mandar al user acá. Si entran sin sesión (link viejo / pegaron la
// URL a mano), los mandamos a pedir un link nuevo.
export default async function ActualizarPasswordPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login/recuperar?expired=1');

  return <MobileShell><UpdatePasswordForm /></MobileShell>;
}
