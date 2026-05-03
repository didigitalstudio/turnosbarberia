export function FeatureGate({
  enabled,
  children,
  message = 'Disponible en plan Pro',
}: {
  enabled: boolean;
  children: React.ReactNode;
  message?: string;
}) {
  if (enabled) return <>{children}</>;
  return (
    <div className="relative min-h-[200px]">
      <div className="opacity-30 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6 py-5 bg-dark-card border border-dark-line rounded-2xl shadow-xl max-w-xs">
          <span className="text-[9px] font-mono font-bold tracking-[3px] uppercase text-accent">Plan Pro</span>
          {/* Lock icon — inline SVG (lucide-react not installed) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-dark-muted"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-sm text-bg font-medium">{message}</p>
          <a
            href="mailto:info@didigitalstudio.com?subject=Consulta%20plan%20Pro%20-%20TurnosBarbería"
            className="text-xs text-accent hover:underline font-medium"
          >
            Contactar a DI Digital Studio →
          </a>
        </div>
      </div>
    </div>
  );
}
