// ============================================================================
// Helpers de timezone para Argentina.
//
// Vercel ejecuta server-side en UTC. Si usamos Date#getHours(), Date#getDay()
// o Date#setHours(), los valores quedan en UTC, no en hora local de la
// barbería. El bug que motiva este módulo: una reserva a las 15hs ARG
// quedaba guardada como `T15:00:00.000Z` (= 12hs ARG) porque
// `slotStart.setHours(15, 0)` en UTC produce `15:00 UTC`, no `15:00 ARG`.
//
// Mientras todo el producto sea para Argentina, hardcodeamos el TZ acá.
// Si en el futuro hay shops en otra zona, hay que parametrizar por
// shop.timezone y pasarlo en cada call.
// ============================================================================

export const SHOP_TZ = 'America/Argentina/Buenos_Aires';
export const SHOP_OFFSET = '-03:00';

const pad = (n: number) => String(n).padStart(2, '0');

// Construye un ISO UTC desde un YYYY-MM-DD + hora local ARG.
// Ej: isoFromARLocal('2026-04-30', 15, 0) → '2026-04-30T18:00:00.000Z'
export function isoFromARLocal(dateISO: string, hh: number, mm: number): string {
  return new Date(`${dateISO}T${pad(hh)}:${pad(mm)}:00${SHOP_OFFSET}`).toISOString();
}

// Devuelve dayOfWeek (0=Domingo..6=Sábado), hora y minuto en TZ ARG
// para un Date dado, sin importar el TZ del runtime.
const WD_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
};
const _partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TZ,
  hour12: false,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
export function partsInAR(d: Date): {
  dow: number;
  hh: string;
  mm: string;
  date: string; // YYYY-MM-DD
} {
  const parts = Object.fromEntries(
    _partsFmt.formatToParts(d).map(p => [p.type, p.value])
  );
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    dow: WD_MAP[parts.weekday as string] ?? 0,
    hh: hour,
    mm: parts.minute,
    date: `${parts.year}-${parts.month}-${parts.day}`
  };
}

// Render-friendly helpers para forzar timeZone ARG en server components.
// (En client components no son estrictamente necesarios — el browser ya
// usa el TZ local —, pero lo usamos para consistencia entre SSR y CSR.)
export function formatTimeAR(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SHOP_TZ
  });
}

export function formatDateAR(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
): string {
  return new Date(iso).toLocaleDateString('es-AR', { ...opts, timeZone: SHOP_TZ });
}

export function formatDateTimeAR(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SHOP_TZ
  });
}
