'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';

type TabDef = {
  id: 'home' | 'team' | 'book' | 'cal' | 'me';
  icon: 'home' | 'users' | 'plus' | 'calendar' | 'user';
  label: string;
  path: string; // relative, appended to /${slug}
};

const tabs: readonly TabDef[] = [
  { id: 'home', icon: 'home',     label: 'Inicio',     path: '' },
  { id: 'team', icon: 'users',    label: 'Equipo',     path: '/equipo' },
  { id: 'book', icon: 'plus',     label: 'Reservar',   path: '/reservar' },
  { id: 'cal',  icon: 'calendar', label: 'Mis turnos', path: '/mis-turnos' },
  { id: 'me',   icon: 'user',     label: 'Perfil',     path: '/perfil' }
] as const;

export function TabBar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/${slug}`;
  return (
    <>
      <div aria-hidden="true" className="h-20 flex-shrink-0" />
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-[440px] border-t border-line bg-card flex justify-around px-2 pt-2 pb-[max(env(safe-area-inset-bottom),20px)]"
      >
        {tabs.map(t => {
          const href = `${base}${t.path}`;
          const isActive =
            t.path === '' ? pathname === base :
            pathname.startsWith(href);
          const isCta = t.id === 'book';
          if (isCta) {
            return (
              <Link key={t.id} href={href}
                className="-mt-2 grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-fab active:scale-95 transition flex-shrink-0"
                aria-label={t.label}>
                <Icon name={t.icon} size={22} color="#fff"/>
              </Link>
            );
          }
          return (
            <Link key={t.id} href={href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t.label}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] px-1 py-1 transition ${isActive ? 'text-ink' : 'text-muted'}`}>
              <Icon name={t.icon} size={20}/>
              <span className={`text-[10px] ${isActive ? 'font-semibold' : ''}`}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
