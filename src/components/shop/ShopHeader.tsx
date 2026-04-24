import Link from 'next/link';

export function ShopHeader({ title }: { title: string }) {
  return (
    <header className="px-5 pt-3 pb-3 flex items-center gap-3 md:px-8 md:pt-6 md:pb-4">
      <Link
        href="/shop"
        aria-label="Ir a la agenda"
        className="w-10 h-10 rounded-m grid place-items-center text-white font-display text-xl bg-accent active:scale-95 transition md:hidden">
        B
      </Link>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] md:text-[24px] md:font-display md:tracking-[-0.5px] font-semibold text-bg truncate">
          {title}
        </div>
      </div>
    </header>
  );
}

// Legacy: algunas páginas aún importan ShopTabs. Mantengo el export pero
// vacío para no romper imports hasta que todos migren al sidebar/tabbar.
export function ShopTabs(_: { active?: string }) {
  return null;
}
