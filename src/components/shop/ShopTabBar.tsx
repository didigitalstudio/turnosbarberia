'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';

// Orden producto: Dashboard, Agenda, Caja, Stock, Equipo, Ajustes.
// `proOnly` se oculta en Starter.
type Tab = {
  id: string;
  icon: 'calendar' | 'cash' | 'users' | 'settings' | 'star' | 'bag';
  label: string;
  href: string;
  proOnly?: boolean;
};

const ALL_TABS: Tab[] = [
  { id: 'dashboard', icon: 'star',     label: 'Stats',    href: '/shop/dashboard' },
  { id: 'agenda',    icon: 'calendar', label: 'Agenda',   href: '/shop' },
  { id: 'caja',      icon: 'cash',     label: 'Caja',     href: '/shop/caja',   proOnly: true },
  { id: 'stock',     icon: 'bag',      label: 'Stock',    href: '/shop/stock',  proOnly: true },
  { id: 'team',      icon: 'users',    label: 'Equipo',   href: '/shop/equipo' },
  { id: 'more',      icon: 'settings', label: 'Ajustes',  href: '/shop/ajustes' }
];

export function ShopTabBar({ plan }: { plan?: string }) {
  const pathname = usePathname();
  const isPro = (plan || '').toLowerCase() === 'pro';
  const tabs = ALL_TABS.filter(t => !t.proOnly || isPro);

  return (
    <>
      <div aria-hidden="true" className="h-20 flex-shrink-0" />
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-dark-line bg-dark-card flex justify-around px-2 pt-2 pb-[max(env(safe-area-inset-bottom),20px)]">
        {tabs.map(t => {
          const isActive =
            t.href === '/shop' ? pathname === '/shop' :
            pathname.startsWith(t.href);
          return (
            <Link
              key={t.id}
              href={t.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t.label}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] px-0.5 py-1 transition ${isActive ? 'text-bg' : 'text-dark-muted'}`}>
              <Icon name={t.icon} size={20}/>
              <span className={`text-[9.5px] ${isActive ? 'font-semibold' : ''}`}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
