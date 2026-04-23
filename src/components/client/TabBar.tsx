'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';

const tabs = [
  { id: 'home', icon: 'home',     label: 'Inicio',     href: '/' },
  { id: 'book', icon: 'plus',     label: 'Reservar',   href: '/reservar' },
  { id: 'cal',  icon: 'calendar', label: 'Mis turnos', href: '/mis-turnos' },
  { id: 'me',   icon: 'user',     label: 'Perfil',     href: '/perfil' }
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-line bg-card flex justify-around px-4 pt-2 pb-6">
      {tabs.map(t => {
        const isActive =
          t.href === '/' ? pathname === '/' :
          pathname.startsWith(t.href);
        const isCta = t.id === 'book';
        if (isCta) {
          return (
            <Link key={t.id} href={t.href}
              className="-mt-2 grid h-[46px] w-[46px] place-items-center rounded-full bg-ink text-white shadow-fab"
              aria-label={t.label}>
              <Icon name={t.icon} size={22} color="#fff"/>
            </Link>
          );
        }
        return (
          <Link key={t.id} href={t.href}
            className={`flex flex-col items-center gap-1 px-1.5 py-1 ${isActive ? 'text-ink' : 'text-muted'}`}>
            <Icon name={t.icon} size={20}/>
            <span className={`text-[10px] ${isActive ? 'font-semibold' : ''}`}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
