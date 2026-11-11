// lib/wearables/insights/series.ts
// Outils communs aux règles « objet connecté » : mesures, exclusions, dates, statistiques.
//
// Conventions (validées avec le produit) :
// - une nuit est rattachée au jour du réveil (comme wearable_daily_summary) ;
// - une nuit sans mesure (objet non porté) ou de moins de 3 h est exclue, pour toutes les mesures de la nuit ;
// - les pas du jour en cours sont exclus (journée incomplète) ;
// - les jours sont des jours civils Europe/Paris au format YYYY-MM-DD.
import type { WearableSummaryDay } from '../summary';

export type Metric = 'sleep' | 'hrv' | 'hr' | 'steps';
export const METRICS: readonly Metric[] = ['sleep', 'hrv', 'hr', 'steps'];
export const NIGHT_METRICS: readonly Metric[] = ['sleep', 'hrv', 'hr'];

/** Nuit de moins de 3 h : exclue. */
export const MIN_SLEEP_MIN = 180;

/** Seuils fixes validés : 20 min de sommeil, 3 ms de VFC, 3 bpm, 1 000 pas. */
export const THRESHOLDS: Record<Metric, number> = { sleep: 20, hrv: 3, hr: 3, steps: 1000 };

/** Sens favorable : +1 = plus haut c'est mieux, −1 = plus bas c'est mieux (FC de la nuit). */
export const BETTER: Record<Metric, 1 | -1> = { sleep: 1, hrv: 1, hr: -1, steps: 1 };

export const METRIC_LABEL: Record<Metric, string> = {
  sleep: 'Sommeil par nuit',
  hrv: 'Récupération la nuit (VFC)',
  hr: 'Cœur la nuit (fréquence)',
  steps: 'Pas par jour',
};

export const METRIC_SHORT: Record<Metric, string> = { sleep: 'Sommeil', hrv: 'VFC', hr: 'FC de la nuit', steps: 'Pas' };

// ─── Dates (jours civils, sans fuseau) ─────────────────

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Jours de `from` à `to` inclus. Vide si from > to. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/** Jour civil Europe/Paris d'un instant. */
export function parisDay(instant: string | Date, timeZone = 'Europe/Paris'): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** « 19 oct. » */
export function shortDate(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

// ─── Série nettoyée ─────────────────

/** Valeurs par jour après exclusions. */
export class Series {
  private byDay = new Map<string, WearableSummaryDay>();

  constructor(
    days: WearableSummaryDay[],
    /** Jour en cours : ses pas sont exclus. */
    readonly today: string
  ) {
    for (const d of days) this.byDay.set(d.date, d);
  }

  /** La nuit rattachée à ce jour est-elle mesurée et d'au moins 3 h ? */
  nightValid(day: string): boolean {
    const d = this.byDay.get(day);
    if (!d) return false;
    if (d.sleepMin !== null) return d.sleepMin >= MIN_SLEEP_MIN;
    // Sans durée de sommeil, une VFC ou une FC de nuit prouve que l'objet était porté.
    return d.hrvMs !== null || d.nightHrBpm !== null;
  }

  /** Nuit sans aucune mesure (objet non porté). */
  unworn(day: string): boolean {
    const d = this.byDay.get(day);
    return !d || (d.sleepMin === null && d.hrvMs === null && d.nightHrBpm === null);
  }

  value(metric: Metric, day: string): number | null {
    const d = this.byDay.get(day);
    if (!d) return null;
    if (metric === 'steps') return day >= this.today ? null : d.steps;
    const short = d.sleepMin !== null && d.sleepMin < MIN_SLEEP_MIN;
    if (short) return null;
    if (metric === 'sleep') return d.sleepMin;
    if (metric === 'hrv') return d.hrvMs;
    return d.nightHrBpm;
  }

  values(metric: Metric, days: string[]): number[] {
    return days.map((day) => this.value(metric, day)).filter((v): v is number => v !== null && Number.isFinite(v));
  }
}

// ─── Statistiques ─────────────────

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Écart-type (population). 0 pour une seule valeur. */
export function sd(xs: number[]): number | null {
  const m = mean(xs);
  if (m === null) return null;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

// ─── Formats ─────────────────

export function fmtDuration(min: number): string {
  const total = Math.round(Math.abs(min));
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`;
}

export function fmtSteps(n: number): string {
  return `${Math.round(Math.abs(n) / 10) * 10}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Valeur affichée : « 7 h 09 », « 46 ms », « 59 bpm », « 7 970 pas ». */
export function fmtValue(metric: Metric, v: number): string {
  if (metric === 'sleep') return fmtDuration(v);
  if (metric === 'steps') return `${fmtSteps(v)} pas`;
  return `${Math.round(v)} ${metric === 'hrv' ? 'ms' : 'bpm'}`;
}

/** Écart sans signe : « 45 min », « 4 ms », « 3 bpm », « 1 020 pas ». */
export function fmtGap(metric: Metric, d: number): string {
  return fmtValue(metric, Math.abs(d));
}

/** Écart signé : « +4 ms », « −3 bpm ». */
export function fmtSigned(metric: Metric, d: number): string {
  const rounded = metric === 'sleep' ? Math.round(d) : metric === 'steps' ? Math.round(d / 10) * 10 : Math.round(d);
  if (rounded === 0) return `0 ${metric === 'sleep' ? 'min' : metric === 'steps' ? 'pas' : metric === 'hrv' ? 'ms' : 'bpm'}`;
  return `${rounded > 0 ? '+' : '−'}${fmtGap(metric, d)}`;
}
