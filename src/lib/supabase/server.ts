import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component context — cookies are read-only here, ignore.
          }
        }
      }
    }
  );
}

// Admin client: usa SUPABASE_SERVICE_ROLE_KEY y bypasea RLS.
// Importante: NO usar createServerClient con cookies — el SSR helper pisa el
// bearer token con el JWT del usuario logueado (rol `authenticated`),
// perdiendo el service_role y haciendo que las policies sigan aplicándose.
// Por eso usamos directamente el cliente JS sin sesión persistente.
export function createAdminClient() {
  return createJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
