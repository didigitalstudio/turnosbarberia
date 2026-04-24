'use client';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/EmptyState';
import { Icon } from '@/components/shared/Icon';
import { money } from '@/lib/format';
import type { Product } from '@/types/db';

type Props = { products: Product[] };

export function StockView({ products }: Props) {
  const total = products.length;
  const low = products.filter(p => p.stock < 10);
  const valorInventario = products.reduce((s, p) => s + Number(p.price || 0) * Number(p.stock || 0), 0);
  const costoInventario = products.reduce((s, p) => s + Number(p.cost || 0) * Number(p.stock || 0), 0);

  return (
    <div className="flex-1 overflow-auto px-5 pt-3 pb-6 md:px-8">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Stat label="Productos" value={String(total)} />
        <Stat label="Stock bajo" value={String(low.length)} accent={low.length > 0} />
        <Stat label="Valor inventario" value={money(valorInventario)} />
      </div>

      {total === 0 ? (
        <div className="mt-6">
          <EmptyState
            dark
            icon="bag"
            title="Sin productos cargados"
            description="Agregá productos desde Ajustes para empezar a manejar el stock y venderlos desde la caja."
            ctaLabel="Ir a ajustes"
            ctaHref="/shop/ajustes"
          />
        </div>
      ) : (
        <>
          {low.length > 0 && (
            <div className="mt-4 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <Icon name="bag" size={14} color="#B6754C" />
              <span className="text-[12px] text-accent">
                {low.length} producto{low.length === 1 ? '' : 's'} con menos de 10 unidades.
              </span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
            {products.map(p => {
              const isLow = p.stock < 10;
              const margin = p.cost ? Number(p.price) - Number(p.cost) : null;
              return (
                <div key={p.id} className="bg-dark-card border border-dark-line rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-bg truncate">{p.name}</div>
                      {p.provider && (
                        <div className="text-[10px] text-dark-muted uppercase tracking-[1px] mt-0.5 truncate">
                          {p.provider}
                        </div>
                      )}
                    </div>
                    {isLow && (
                      <span className="shrink-0 text-[9px] font-bold tracking-[1.5px] uppercase bg-accent/20 text-accent border border-accent/40 rounded-xs px-1.5 py-0.5">
                        Bajo
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <div className="font-mono text-[18px] text-bg font-semibold">
                      {p.stock}
                      <span className="text-[11px] text-dark-muted font-normal ml-1">
                        {p.unit && p.unit !== 'unidad' ? p.unit : 'u'}
                      </span>
                    </div>
                    <div className="text-[13px] text-accent font-medium">{money(Number(p.price))}</div>
                  </div>
                  {margin !== null && (
                    <div className="text-[10px] text-dark-muted mt-1">
                      Costo {money(Number(p.cost))} · Margen {money(margin)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {costoInventario > 0 && (
            <div className="mt-5 bg-dark-card/60 border border-dark-line rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-dark-muted uppercase tracking-[1.5px]">Inversión estimada</div>
                <div className="font-display text-[20px] text-bg leading-none mt-1">{money(costoInventario)}</div>
              </div>
              <Link
                href="/shop/ajustes"
                className="text-[12px] px-3 py-2 rounded-m border border-dark-line text-dark-muted hover:text-bg hover:border-bg/30 transition">
                Gestionar productos
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`bg-dark-card border rounded-xl px-3.5 py-3 ${accent ? 'border-accent/40' : 'border-dark-line'}`}>
      <div className="text-[9px] text-dark-muted uppercase tracking-[1.5px]">{label}</div>
      <div className={`font-display text-[22px] leading-none mt-1.5 ${accent ? 'text-accent' : 'text-bg'}`}>
        {value}
      </div>
    </div>
  );
}
