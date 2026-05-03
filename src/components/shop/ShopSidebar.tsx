'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';
import { PRODUCT } from '@/lib/shop-info';
import { ShopSwitcher, type ShopBrief } from '@/components/shop/ShopSwitcher';
import { ProModal } from '@/components/ui/pro-modal';

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

export function ShopSidebar({
  shop, userShops
}: {
  shop: ShopBrief;
  userShops: ShopBrief[];
}) {
  const pathname = usePathname();
  const isPro = (shop.plan || '').toLowerCase() === 'pro';
  const items = ALL_ITEMS;
  const [proModalFeature, setProModalFeature] = useState<string | null>(null);

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
          if (it.proOnly && !isPro) {
            return (
              <button
                key={it.id}
                onClick={() => setProModalFeature(it.label)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-m text-[14px] font-medium w-full text-left text-bg/60 hover:bg-dark-card hover:text-bg/80 transition">
                <Icon name={it.icon} size={18}/>
                <span className="flex-1">{it.label}</span>
                <span className="text-[9px] font-mono font-bold tracking-widest text-accent border border-accent/40 rounded px-1.5 py-0.5">PRO</span>
              </button>
            );
          }
          return (
            <Link key={it.id} href={it.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-m text-[14px] transition
                ${isActive
                  ? 'bg-bg text-ink font-semibold'
                  : 'text-bg/85 hover:bg-dark-card hover:text-bg font-medium'}`}>
              <Icon name={it.icon} size={18}/>
              <span className="flex-1">{it.label}</span>
            </Link>
          );
        })}
      </nav>
      {proModalFeature && <ProModal feature={proModalFeature} onClose={() => setProModalFeature(null)} />}

      <div className="px-4 py-4 border-t border-dark-line">
        <div className="font-mono text-[9px] tracking-[2px] text-dark-muted">TU BARBERÍA</div>
        <div className="text-[13px] font-semibold text-bg mt-1 truncate">{shop.name}</div>
      </div>
    </div>
  );
}

