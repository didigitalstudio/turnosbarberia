'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/shared/Icon';
import { Toast } from '@/components/shared/Toast';
import { money } from '@/lib/format';
import {
  setShopActive,
  setShopPlan,
  resetOwnerPassword,
  deleteShop
} from '@/app/actions/super-admin';
import { logoutSuperAdmin } from '@/app/actions/super-admin-auth';

type Row = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  plan: string;
  owner_id: string | null;
  owner_email: string | null;
  created_at: string;
  barbers_count: number;
  services_count: number;
  appointments_count: number;
};

type Metrics = {
  activeShops: number;
  appointmentsLast30: number;
  mrrEstimate: number;
  starterCount: number;
  proCount: number;
};

export function SuperAdminPanel({ shops, metrics }: { shops: Row[]; metrics: Metrics }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingShop, setDeletingShop] = useState<Row | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  const recent = useMemo(
    () => [...shops].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 10),
    [shops]
  );

  const run = (promise: Promise<any>, successText: string) => {
    start(async () => {
      setMsg(null);
      try {
        const r = await promise;
        if (r?.error) setMsg({ tone: 'error', text: r.error });
        else {
          setMsg({ tone: 'success', text: successText });
          router.refresh();
        }
      } catch (e: any) {
        setMsg({ tone: 'error', text: e?.message || 'Error desconocido' });
      }
    });
  };

  const doDelete = () => {
    if (!deletingShop) return;
    start(async () => {
      setMsg(null);
      const r = await deleteShop(deletingShop.id, deleteInput.trim());
      if (r?.error) {
        setMsg({ tone: 'error', text: r.error });
      } else {
        setMsg({ tone: 'success', text: `Shop "${deletingShop.slug}" eliminado.` });
        setDeletingShop(null);
        setDeleteInput('');
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-dark text-bg">
      <div className="max-w-[1280px] mx-auto px-6 py-8 md:px-10 md:py-10">
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="font-mono text-[10px] tracking-[2px] text-dark-muted">SUPER ADMIN</div>
            <h1 className="font-display text-[32px] md:text-[40px] leading-none mt-1 -tracking-[1px]">
              Panel <span className="italic text-accent">/desa</span>
            </h1>
          </div>
          <form action={logoutSuperAdmin}>
            <button
              type="submit"
              className="text-[12px] px-3 py-2 rounded-m border border-dark-line hover:border-bg/30 transition text-dark-muted hover:text-bg">
              Cerrar sesión
            </button>
          </form>
        </header>

        {msg && (
          <div className="mb-5">
            <Toast dark tone={msg.tone} message={msg.text} onClose={() => setMsg(null)} />
          </div>
        )}

        {/* Métricas globales */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Metric label="Shops activos" value={String(metrics.activeShops)} suffix={`de ${shops.length}`} />
          <Metric label="Turnos (30d)" value={String(metrics.appointmentsLast30)} suffix="últimos 30 días" />
          <Metric label="MRR estimado" value={money(metrics.mrrEstimate)} suffix={`${metrics.starterCount} starter · ${metrics.proCount} pro`} />
          <Metric label="Total shops" value={String(shops.length)} suffix="en la plataforma" />
        </section>

        {/* Shops table */}
        <section className="mb-10">
          <SectionLabel>BARBERÍAS · {shops.length}</SectionLabel>

          {shops.length === 0 ? (
            <div className="bg-dark-card border border-dark-line rounded-xl px-6 py-10 text-center text-dark-muted">
              Todavía no hay barberías registradas.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {shops.map(s => (
                  <ShopCardMobile
                    key={s.id}
                    row={s}
                    pending={pending}
                    onToggleActive={() => run(setShopActive(s.id, !s.is_active), s.is_active ? 'Shop desactivado' : 'Shop activado')}
                    onTogglePlan={() => run(setShopPlan(s.id, s.plan === 'pro' ? 'starter' : 'pro'), 'Plan actualizado')}
                    onResetPass={() => run(resetOwnerPassword(s.id), 'Password reseteada y enviada por mail')}
                    onDelete={() => { setDeletingShop(s); setDeleteInput(''); }}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block bg-dark-card border border-dark-line rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dark-line bg-dark/40">
                      <Th>SLUG</Th>
                      <Th>NOMBRE</Th>
                      <Th>OWNER</Th>
                      <Th>PLAN</Th>
                      <Th>ESTADO</Th>
                      <Th>BARBEROS</Th>
                      <Th>SERVICIOS</Th>
                      <Th>TURNOS</Th>
                      <Th>CREADO</Th>
                      <Th className="text-right">ACCIONES</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {shops.map((s, i) => (
                      <tr key={s.id} className={`${i < shops.length - 1 ? 'border-b border-dark-line' : ''} hover:bg-dark/30 transition`}>
                        <Td><code className="font-mono text-[12px] text-bg">{s.slug}</code></Td>
                        <Td><span className="text-[13px] font-medium text-bg">{s.name}</span></Td>
                        <Td><span className="text-[12px] text-dark-muted">{s.owner_email || '—'}</span></Td>
                        <Td>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(setShopPlan(s.id, s.plan === 'pro' ? 'starter' : 'pro'), 'Plan actualizado')}
                            className={`text-[11px] px-2 py-0.5 rounded-xs font-semibold tracking-wide uppercase transition
                              ${s.plan === 'pro' ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-dark border border-dark-line text-dark-muted'}`}>
                            {s.plan}
                          </button>
                        </Td>
                        <Td>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(setShopActive(s.id, !s.is_active), s.is_active ? 'Desactivado' : 'Activado')}
                            className={`text-[11px] px-2 py-0.5 rounded-xs font-semibold tracking-wide uppercase transition
                              ${s.is_active ? 'bg-bg/10 text-bg border border-bg/20' : 'bg-dark border border-dark-line text-dark-muted'}`}>
                            {s.is_active ? 'Activo' : 'Pausado'}
                          </button>
                        </Td>
                        <Td><span className="font-mono text-[12px] text-dark-muted">{s.barbers_count}</span></Td>
                        <Td><span className="font-mono text-[12px] text-dark-muted">{s.services_count}</span></Td>
                        <Td><span className="font-mono text-[12px] text-dark-muted">{s.appointments_count}</span></Td>
                        <Td><span className="text-[11px] text-dark-muted">{new Date(s.created_at).toLocaleDateString('es-AR')}</span></Td>
                        <Td className="text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(resetOwnerPassword(s.id), 'Password reseteada')}
                            className="text-[11px] px-2 py-1 rounded-xs border border-dark-line text-bg hover:border-bg/30 transition mr-1.5">
                            Reset pass
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => { setDeletingShop(s); setDeleteInput(''); }}
                            className="text-[11px] px-2 py-1 rounded-xs border border-accent/40 text-accent hover:bg-accent/10 transition">
                            Eliminar
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Actividad reciente */}
        <section className="mb-10">
          <SectionLabel>ACTIVIDAD RECIENTE · ÚLTIMOS 10</SectionLabel>
          {recent.length === 0 ? (
            <div className="bg-dark-card border border-dark-line rounded-xl px-5 py-6 text-dark-muted text-[13px]">
              Sin actividad.
            </div>
          ) : (
            <div className="bg-dark-card border border-dark-line rounded-xl divide-y divide-dark-line">
              {recent.map(s => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-bg/80' : 'bg-dark-muted/40'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-bg font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-dark-muted mt-0.5 truncate">
                      <code className="font-mono">{s.slug}</code>
                      {s.owner_email ? <> · {s.owner_email}</> : null}
                    </div>
                  </div>
                  <div className="text-[11px] text-dark-muted font-mono">
                    {new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {deletingShop && (
        <DeleteModal
          shop={deletingShop}
          input={deleteInput}
          onInput={setDeleteInput}
          pending={pending}
          onCancel={() => { setDeletingShop(null); setDeleteInput(''); }}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="bg-dark-card border border-dark-line rounded-xl px-4 py-3.5">
      <div className="font-mono text-[10px] tracking-[2px] text-dark-muted">{label}</div>
      <div className="font-display text-[28px] text-bg leading-none mt-1.5 -tracking-[0.5px]">{value}</div>
      <div className="text-[11px] text-dark-muted mt-1.5">{suffix}</div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`font-mono text-[10px] tracking-[2px] text-dark-muted font-normal px-4 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] tracking-[2px] text-dark-muted mb-2.5">{children}</div>;
}

function ShopCardMobile({
  row, pending, onToggleActive, onTogglePlan, onResetPass, onDelete
}: {
  row: Row;
  pending: boolean;
  onToggleActive: () => void;
  onTogglePlan: () => void;
  onResetPass: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-dark-card border border-dark-line rounded-xl px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-bg truncate">{row.name}</div>
          <div className="text-[11px] text-dark-muted mt-0.5 truncate">
            <code className="font-mono">{row.slug}</code> · {row.owner_email || 'sin owner'}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-xs font-semibold tracking-wide uppercase
          ${row.is_active ? 'bg-bg/10 text-bg border border-bg/20' : 'bg-dark border border-dark-line text-dark-muted'}`}>
          {row.is_active ? 'Activo' : 'Pausado'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <Mini k="Barberos" v={row.barbers_count} />
        <Mini k="Servicios" v={row.services_count} />
        <Mini k="Turnos" v={row.appointments_count} />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <button type="button" disabled={pending} onClick={onToggleActive}
          className="text-[11px] px-2 py-1 rounded-xs border border-dark-line text-bg hover:border-bg/30 transition">
          {row.is_active ? 'Desactivar' : 'Activar'}
        </button>
        <button type="button" disabled={pending} onClick={onTogglePlan}
          className="text-[11px] px-2 py-1 rounded-xs border border-dark-line text-bg hover:border-bg/30 transition">
          Plan · {row.plan}
        </button>
        <button type="button" disabled={pending} onClick={onResetPass}
          className="text-[11px] px-2 py-1 rounded-xs border border-dark-line text-bg hover:border-bg/30 transition">
          Reset pass
        </button>
        <button type="button" disabled={pending} onClick={onDelete}
          className="text-[11px] px-2 py-1 rounded-xs border border-accent/40 text-accent hover:bg-accent/10 transition">
          Eliminar
        </button>
      </div>
    </div>
  );
}
function Mini({ k, v }: { k: string; v: number }) {
  return (
    <div className="bg-dark rounded-s px-2 py-1.5">
      <div className="text-[9px] text-dark-muted uppercase tracking-[1.5px]">{k}</div>
      <div className="font-mono text-[13px] font-semibold text-bg mt-0.5">{v}</div>
    </div>
  );
}

function DeleteModal({
  shop, input, onInput, pending, onCancel, onConfirm
}: {
  shop: Row;
  input: string;
  onInput: (v: string) => void;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[420px] bg-dark-card border border-dark-line rounded-xl p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="close" size={18} color="#B6754C" />
          <div className="font-display text-[22px] text-bg">Eliminar barbería</div>
        </div>
        <p className="text-[13px] text-dark-muted leading-relaxed">
          Vas a borrar <b className="text-bg">{shop.name}</b> y toda su data
          (barberos, servicios, turnos, caja). Esta acción es irreversible.
        </p>
        <label className="block mt-4">
          <span className="block text-[11px] text-dark-muted uppercase tracking-[1.5px] mb-1">
            Escribí <code className="font-mono text-bg">{shop.slug}</code> para confirmar
          </span>
          <input
            value={input}
            onChange={e => onInput(e.target.value)}
            autoFocus
            placeholder={shop.slug}
            className="w-full bg-dark border border-dark-line rounded-m px-3 py-2 text-bg font-mono text-[14px] outline-none focus:border-accent/60"
          />
        </label>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 px-3 py-2.5 rounded-m border border-dark-line text-bg text-[13px] font-medium hover:border-bg/30 transition">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || input.trim() !== shop.slug}
            className="flex-1 px-3 py-2.5 rounded-m bg-accent text-white text-[13px] font-semibold disabled:opacity-40 active:scale-[0.98] transition">
            {pending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
