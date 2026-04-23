import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';

export function ShopHeader({ subtitle, title, action }: { subtitle: string; title: string; action?: 'search' | 'plus' | 'more' }) {
  return (
    <header className="px-5 pt-3 pb-3 flex items-center gap-3">
      <Link href="/shop" className="w-9 h-9 rounded-m grid place-items-center text-white font-display text-xl"
            style={{ background: '#B6754C' }}>E</Link>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-dark-muted uppercase tracking-[2px] font-mono">{subtitle}</div>
        <div className="text-[15px] font-semibold text-bg truncate">{title}</div>
      </div>
      {action && (
        <button className="w-9 h-9 rounded-m bg-dark-card border border-dark-line grid place-items-center text-bg" aria-label="acción">
          <Icon name={action} size={16}/>
        </button>
      )}
    </header>
  );
}

export function ShopTabs({ active }: { active: 'agenda' | 'caja' | 'equipo' }) {
  const tabs = [
    { id: 'agenda', l: 'Agenda', href: '/shop' },
    { id: 'caja',   l: 'Caja',   href: '/shop/caja' },
    { id: 'equipo', l: 'Equipo', href: '/shop/equipo' }
  ] as const;
  return (
    <div className="px-5 pb-2 flex gap-4 border-b border-dark-line">
      {tabs.map(t => {
        const a = active === t.id;
        return (
          <Link key={t.id} href={t.href}
            className={`py-2.5 text-[13px] -mb-px ${a ? 'font-semibold text-bg border-b-2' : 'font-normal text-dark-muted border-b-2 border-transparent'}`}
            style={a ? { borderBottomColor: '#B6754C' } : undefined}>
            {t.l}
          </Link>
        );
      })}
    </div>
  );
}
