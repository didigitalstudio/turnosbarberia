export function money(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

export function formatTimeHM(d: Date): string {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function dayShort(d: Date): string {
  return d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
}

export function monthShort(d: Date): string {
  return d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

export function fullDateLabel(d: Date): string {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}
