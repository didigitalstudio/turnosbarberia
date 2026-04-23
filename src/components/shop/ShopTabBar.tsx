'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';

const tabs = [
  { id: 'agenda', icon: 'calendar', label: 'Agenda',  href: '/shop' },
  { id: 'caja',   icon: 'cash',     label: 'Caja',    href: '/shop/caja' },
  { id: 'add',    icon: 'plus',     label: '',        href: '/shop/nuevo' },
  { id: 'team',   icon: 'users',    label: 'Equipo',  href: '/shop/equipo' },
  { id: 'more',   icon: 'settings', label: 'Ajustes', href: '/shop/ajustes' }
] as const;

export function ShopTabBar() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-dark-line bg-dark-card flex justify-around px-3 pt-2 pb-6">
      {tabs.map(t => {
        const isActive =
          t.href === '/shop' ? pathname === '/shop' :
          pathname.startsWith(t.href);
        const isCta = t.id === 'add';
        if (isCta) {
          return (
            <Link key={t.id} href={t.href}
              className="-mt-2 grid h-11 w-11 place-items-center rounded-full bg-accent text-white shadow-fab-dark"
              aria-label="Nuevo turno">
              <Icon name={t.icon} size={22} color="#fff"/>
            </Link>
          );
        }
        return (
          <Link key={t.id} href={t.href}
            className={`flex flex-col items-center gap-1 px-1.5 py-1 ${isActive ? 'text-bg' : 'text-dark-muted'}`}>
            <Icon name={t.icon} size={20}/>
            <span className={`text-[10px] ${isActive ? 'font-semibold' : ''}`}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
