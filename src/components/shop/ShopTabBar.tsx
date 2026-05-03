'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';
import { ProModal } from '@/components/ui/pro-modal';

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
  const tabs = ALL_TABS;
  const [proModalFeature, setProModalFeature] = useState<string | null>(null);

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
          if (t.proOnly && !isPro) {
            return (
              <button
                key={t.id}
                onClick={() => setProModalFeature(t.label)}
                aria-label={t.label}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] px-0.5 py-1 transition text-dark-muted relative">
                <Icon name={t.icon} size={20}/>
                <span className="text-[9.5px]">{t.label}</span>
                <span className="absolute top-1 right-1/4 text-[7px] font-bold bg-accent text-white rounded-full px-1 leading-tight">P</span>
              </button>
            );
          }
          return (
            <Link
              key={t.id}
              href={t.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t.label}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] px-0.5 py-1 transition ${isActive ? 'text-bg' : 'text-dark-muted'} relative`}>
              <Icon name={t.icon} size={20}/>
              <span className={`text-[9.5px] ${isActive ? 'font-semibold' : ''}`}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
      {proModalFeature && <ProModal feature={proModalFeature} onClose={() => setProModalFeature(null)} />}
    </>
  );
}
