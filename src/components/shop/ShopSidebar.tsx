'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/shared/Icon';
import { PRODUCT } from '@/lib/shop-info';
import { switchShop } from '@/app/actions/ajustes';

// Orden fijo (producto): Dashboard, Agenda, Caja, Stock, Equipo, Ajustes.
// `proOnly` filtra ítems que solo aplican al plan Pro.
type NavItem = {
  id: string;
  icon: 'calendar' | 'cash' | 'users' | 'settings' | 'star' | 'bag';
  label: string;
  href: string;
  proOnly?: boolean;
};

const ALL_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: 'star',     label: 'Dashboard', href: '/shop/dashboard' },
  { id: 'agenda',    icon: 'calendar', label: 'Agenda',    href: '/shop' },
  { id: 'caja',      icon: 'cash',     label: 'Caja',      href: '/shop/caja',   proOnly: true },
  { id: 'stock',     icon: 'bag',      label: 'Stock',     href: '/shop/stock',  proOnly: true },
  { id: 'team',      icon: 'users',    label: 'Equipo',    href: '/shop/equipo' },
  { id: 'more',      icon: 'settings', label: 'Ajustes',   href: '/shop/ajustes' }
];

type ShopBrief = { id: string; name: string; slug: string; plan?: string };

export function ShopSidebar({
  shop, userShops
}: {
  shop: ShopBrief;
  userShops: ShopBrief[];
}) {
  const pathname = usePathname();
  const isPro = (shop.plan || '').toLowerCase() === 'pro';
  const items = ALL_ITEMS.filter(i => !i.proOnly || isPro);

  return (
    <div className="flex flex-col h-full bg-dark text-bg">
      <div className="px-5 pt-6 pb-5 border-b border-dark-line">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-m grid place-items-center bg-accent text-white">
            <Icon name="scissors" size={18} color="#fff"/>
          </div>
          <div className="min-w-0">
            <div className="font-display text-[18px] leading-none text-bg truncate">{PRODUCT.name}</div>
            <div className="font-mono text-[9px] tracking-[2px] text-dark-muted mt-1">PANEL ADMIN</div>
          </div>
        </div>
      </div>

      {userShops.length > 1 && (
        <div className="px-3 pt-3">
          <ShopSwitcher shop={shop} userShops={userShops} />
        </div>
      )}

      <nav aria-label="Navegación del panel" className="flex-1 px-3 py-4 flex flex-col gap-1">
        {items.map(it => {
          const isActive =
            it.href === '/shop' ? pathname === '/shop' :
            pathname.startsWith(it.href);
          return (
            <Link key={it.id} href={it.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-m text-[14px] transition
                ${isActive
                  ? 'bg-bg text-ink font-semibold'
                  : 'text-bg/85 hover:bg-dark-card hover:text-bg font-medium'}`}>
              <Icon name={it.icon} size={18}/>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-dark-line space-y-3">
        <div>
          <div className="font-mono text-[9px] tracking-[2px] text-dark-muted">TU BARBERÍA</div>
          <div className="text-[13px] font-semibold text-bg mt-1 truncate">{shop.name}</div>
        </div>
        <a
          href={`/${shop.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-m bg-dark-card border border-dark-line text-bg text-[12px] font-medium hover:border-bg/30 transition">
          <span>Ver como cliente</span>
          <Icon name="arrow-right" size={14}/>
        </a>
      </div>
    </div>
  );
}

function ShopSwitcher({
  shop, userShops
}: {
  shop: ShopBrief;
  userShops: ShopBrief[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (id: string) => {
    if (id === shop.id) { setOpen(false); return; }
    start(async () => {
      const r = await switchShop(id);
      setOpen(false);
      if (!r?.error) router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-m bg-dark-card border border-dark-line text-bg text-[12px] font-medium hover:border-bg/30 transition disabled:opacity-60">
        <div className="flex-1 min-w-0 text-left">
          <div className="font-mono text-[9px] tracking-[2px] text-dark-muted">SEDE ACTUAL</div>
          <div className="truncate mt-0.5 text-[13px]">{shop.name}</div>
        </div>
        <Icon name="chevron-down" size={14}/>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"/>
          <ul
            role="listbox"
            className="absolute left-0 right-0 mt-1 z-20 bg-dark-card border border-dark-line rounded-m overflow-hidden shadow-fab-dark">
            {userShops.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.id === shop.id}
                  onClick={() => pick(s.id)}
                  disabled={pending}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] transition
                    ${s.id === shop.id
                      ? 'bg-bg text-ink font-semibold'
                      : 'text-bg hover:bg-dark'} disabled:opacity-60`}>
                  <span className="flex-1 min-w-0 truncate">{s.name}</span>
                  {s.id === shop.id && <Icon name="check" size={14}/>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
