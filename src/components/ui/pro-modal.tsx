'use client';

export function ProModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-dark-card border border-dark-line rounded-2xl p-6 max-w-sm w-full shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <span className="text-[9px] font-mono font-bold tracking-[3px] uppercase text-accent">Plan Pro</span>
          <h3 className="text-bg text-lg font-semibold mt-1">{feature} requiere el plan Pro</h3>
          <p className="text-dark-muted text-sm mt-2 leading-relaxed">
            Esta función está disponible en el plan Pro. Contactanos y la activamos en menos de 24 hs hábiles.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="mailto:info@didigitalstudio.com?subject=Consulta%20plan%20Pro%20-%20TurnosBarbería"
            className="flex-1 text-center bg-accent text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-accent/90 transition"
          >
            Contactar a DI Digital
          </a>
          <button
            onClick={onClose}
            className="px-4 rounded-xl border border-dark-line text-bg/70 text-sm hover:border-bg/40 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
