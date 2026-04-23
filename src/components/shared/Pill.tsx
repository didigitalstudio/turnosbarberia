type Tone = 'ink' | 'accent' | 'soft' | 'line' | 'dark';

const palette: Record<Tone, { bg: string; fg: string; border?: string }> = {
  ink:    { bg: '#0E0E0E', fg: '#FFFFFF' },
  accent: { bg: '#B6754C', fg: '#FFFFFF' },
  soft:   { bg: '#F5F3EE', fg: '#0E0E0E' },
  line:   { bg: 'transparent', fg: '#0E0E0E', border: '1px solid #E3DFD6' },
  dark:   { bg: '#161614', fg: '#FFFFFF' }
};

export function Pill({
  children, tone = 'ink', className = ''
}: { children: React.ReactNode; tone?: Tone; className?: string }) {
  const p = palette[tone];
  return (
    <span
      style={{ background: p.bg, color: p.fg, border: p.border || 'none' }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-tight ${className}`}
    >
      {children}
    </span>
  );
}
