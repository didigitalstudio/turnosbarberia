import { ShopHeader } from '@/components/shop/ShopHeader';
import { ShopTabBar } from '@/components/shop/ShopTabBar';
import { signOut } from '@/app/actions/auth';

export default function AjustesPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <ShopHeader subtitle="Ajustes" title="Configuración"/>
      <div className="flex-1 px-5 pt-4 pb-5">
        <div className="bg-dark-card border border-dark-line rounded-xl p-4 text-bg">
          <div className="font-display text-[22px] mb-2">Próximamente</div>
          <div className="text-[13px] text-dark-muted">
            Edición de horarios, gestión de barberos, productos y más.
          </div>
        </div>
        <form action={signOut} className="mt-3">
          <button className="w-full bg-dark-card border border-dark-line text-bg rounded-xl px-4 py-3.5 text-[14px] font-medium text-left">
            Cerrar sesión
          </button>
        </form>
      </div>
      <ShopTabBar/>
    </main>
  );
}
