import { Icon } from '@/components/shared/Icon';
import { Stripe } from '@/components/shared/Stripe';
import { money } from '@/lib/format';
import type { Sale, Product } from '@/types/db';

export function CashView({ sales, products }: { sales: Sale[]; products: Product[] }) {
  const total = sales.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totServ = sales.filter(s => s.type === 'service').reduce((a, x) => a + Number(x.amount), 0);
  const totProd = sales.filter(s => s.type === 'product').reduce((a, x) => a + Number(x.amount), 0);

  return (
    <div className="flex-1 overflow-auto px-5 pt-4 pb-5">
      {/* Big total */}
      <div className="bg-bg text-ink rounded-2xl px-5 py-4.5 relative overflow-hidden">
        <Stripe className="absolute top-0 left-0 right-0"/>
        <div className="font-mono text-[10px] tracking-[2px] text-muted mt-2">TOTAL DÍA</div>
        <div className="font-display text-[48px] leading-none mt-1.5 -tracking-[1px]">{money(total)}</div>
        <div className="flex gap-2.5 mt-3.5">
          <Tile l="Servicios" v={money(totServ)}/>
          <Tile l="Productos" v={money(totProd)}/>
        </div>
      </div>

      <div className="flex gap-2 mt-3.5">
        <button className="flex-1 bg-dark-card text-bg border border-dark-line px-3 py-3 rounded-l text-[13px] font-medium flex items-center justify-center gap-1.5">
          <Icon name="bag" size={16}/> Vender producto
        </button>
        <button className="flex-1 text-white px-3 py-3 rounded-l text-[13px] font-semibold flex items-center justify-center gap-1.5"
                style={{ background: '#B6754C' }}>
          <Icon name="plus" size={16} color="#fff"/> Cobrar servicio
        </button>
      </div>

      <SectionLabel className="mt-6">MOVIMIENTOS · {sales.length}</SectionLabel>
      {sales.length === 0 ? (
        <div className="bg-dark-card border border-dark-line rounded-xl text-center text-dark-muted text-sm py-10">
          Sin movimientos hoy todavía
        </div>
      ) : (
        <div className="bg-dark-card border border-dark-line rounded-xl overflow-hidden">
          {sales.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-3 px-3.5 py-3 ${i < sales.length - 1 ? 'border-b border-dark-line' : ''}`}>
              <div className="w-[30px] h-[30px] rounded-s bg-dark grid place-items-center text-bg">
                <Icon name={s.type === 'product' ? 'bag' : 'scissors'} size={14}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-bg">
                  {s.type === 'product' ? products.find(p => p.id === s.product_id)?.name || 'Producto' : 'Servicio'}
                </div>
                <div className="text-[11px] text-dark-muted mt-0.5">
                  {new Date(s.created_at).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false })}
                  {s.customer_name ? ` · ${s.customer_name}` : ''} · {labelMethod(s.payment_method)}
                </div>
              </div>
              <div className="font-mono text-[13px] font-semibold text-bg">{money(Number(s.amount))}</div>
            </div>
          ))}
        </div>
      )}

      <SectionLabel className="mt-6">STOCK · PRODUCTOS</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {products.map(p => (
          <div key={p.id} className="bg-dark-card border border-dark-line rounded-l px-3.5 py-3">
            <div className="text-[13px] font-medium text-bg">{p.name}</div>
            <div className="font-mono text-[13px] font-semibold mt-1" style={{ color: '#B6754C' }}>{money(Number(p.price))}</div>
            <div className={`text-[10px] mt-1 ${p.stock < 10 ? '' : 'text-dark-muted'}`}
                 style={p.stock < 10 ? { color: '#B6754C' } : undefined}>
              {p.stock < 10 ? '⚠ ' : ''}Stock: {p.stock}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex-1 bg-bg border border-line/60 px-3 py-2.5 rounded-m">
      <div className="text-[10px] text-muted uppercase">{l}</div>
      <div className="font-mono text-[15px] font-semibold mt-0.5">{v}</div>
    </div>
  );
}

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono text-[10px] tracking-[2px] text-dark-muted mb-2.5 ${className}`}>{children}</div>;
}

function labelMethod(m: string) {
  switch (m) {
    case 'efectivo':       return 'Efectivo';
    case 'transferencia':  return 'Transferencia';
    case 'debito':         return 'Débito';
    case 'credito':        return 'Crédito';
    default:               return m;
  }
}
