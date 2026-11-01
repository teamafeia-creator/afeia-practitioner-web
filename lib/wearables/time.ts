// lib/wearables/time.ts
// Conversions de dates pour les données d'objets connectés. Module pur (sans accès base).
//
// Règle de fuseau (docs/wearables/polar.md §6.6) : décalage fourni par le fournisseur s'il
// existe → fuseau du consultant (consultants.timezone) → Europe/Paris.

export const DEFAULT_TIMEZONE = 'Europe/Paris';

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

export function isValidTimezone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Fuseau à utiliser : celui du consultant s'il est valide, sinon Europe/Paris. */
export function resolveTimezone(tz: string | null | undefined): string {
  return isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
}

/** Décalage (ms) du fuseau `tz` à l'instant `utcMs` : heure locale − heure UTC. */
function offsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Horodatage fournisseur → ISO UTC. Avec décalage (« …+01:00 », « …Z ») : converti tel quel.
 * Sans décalage (heure de l'appareil) : interprété dans `tz`. Renvoie null si illisible.
 * Heure inexistante (passage à l'heure d'été) : décalée après le saut ; heure ambiguë
 * (passage à l'heure d'hiver) : première occurrence.
 */
export function toUtcIso(value: unknown, tz: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const s = value.trim();
  if (HAS_OFFSET.test(s)) {
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }
  const m = s.match(LOCAL);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const wallAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, se ? +se : 0);
  // Deux passes : le décalage peut changer entre l'estimation et l'instant réel (changement d'heure).
  let utc = wallAsUtc - offsetMs(wallAsUtc, tz);
  utc = wallAsUtc - offsetMs(utc, tz);
  return new Date(utc).toISOString();
}

/** Jour local (YYYY-MM-DD) d'un horodatage : avec décalage → converti dans `tz` ; sans → tel quel. */
export function localDay(value: unknown, tz: string): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (HAS_OFFSET.test(s)) {
    const ms = Date.parse(s);
    if (Number.isNaN(ms)) return null;
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  }
  const d = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export function isoDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Durée ISO 8601 (« PT3H11M30S », « P1DT2H ») → secondes. null si illisible. */
export function isoDurationToSeconds(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m || value === 'P' || value === 'PT') return null;
  const [, d, h, mi, s] = m.map((x) => (x === undefined ? 0 : Number(x))) as number[];
  return Math.round(d * 86400 + h * 3600 + mi * 60 + s);
}

/** Nombre fini → valeur ; sinon null (jamais 0 par défaut). */
export function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function int(value: unknown): number | null {
  const n = num(value);
  return n === null ? null : Math.round(n);
}
