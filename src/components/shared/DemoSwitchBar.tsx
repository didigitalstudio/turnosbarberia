import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { enterDemoCliente, enterDemoDueno } from '@/app/actions/demo';

// Banner que aparece cuando la sesión es una cuenta DEMO. Permite switchear
// entre rol cliente ↔ dueño sin tener que ir a /demo.
// Se renderiza en el layout del cliente (/[slug]) y del admin (/shop).

const DEMO_EMAILS = new Set([
  'cliente.demo@turnosbarberia.app',
  'dueno.demo@turnosbarberia.app'
]);

export async function DemoSwitchBar() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const email = (user?.email || '').toLowerCase();
  if (!DEMO_EMAILS.has(email)) return null;

  const isClient = email === 'cliente.demo@turnosbarberia.app';
  const action = isClient ? enterDemoDueno : enterDemoCliente;
  const otherLabel = isClient ? 'Ver como dueño' : 'Ver como cliente';
  const currentLabel = isClient ? 'Estás viendo como cliente' : 'Estás viendo como dueño';

  return (
    <form action={action} className="bg-accent text-white">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 text-[12px]">
        <span className="font-mono text-[9px] tracking-[2px] uppercase bg-white/15 px-2 py-0.5 rounded-xs font-bold shrink-0">
          Demo
        </span>
        <span className="flex-1 min-w-0 truncate">{currentLabel}</span>
        <button
          type="submit"
          className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-m bg-white/20 hover:bg-white/30 transition">
          {otherLabel} →
        </button>
      </div>
    </form>
  );
}
