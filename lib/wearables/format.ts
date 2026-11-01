// lib/wearables/format.ts
// Mise en forme neutre des métriques d'objet connecté pour les écrans praticien (POL-16).
// Aucune interprétation : des valeurs, des unités et des écarts, jamais « bon » ou « mauvais ».
import type { WearableMetricAverages, WearableSummaryDay } from './summary';

export type WearableMetric = keyof WearableMetricAverages;

const NBSP = ' '; // espace fine insécable (séparateur de milliers, unités)
const MINUS = '−';

const int = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, NBSP);

/** 425 min → « 7 h 05 ». */
export function formatSleepMinutes(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`;
}

export const METRIC_META: Record<WearableMetric, { title: string; unit: string }> = {
  sleepMin: { title: 'Sommeil', unit: 'h' },
  hrvMs: { title: 'VFC nocturne', unit: 'ms' },
  nightHrBpm: { title: 'FC nocturne', unit: 'bpm' },
  steps: { title: 'Pas', unit: 'pas' },
};

/** Valeur affichée (moyenne, infobulle). */
export function formatMetricValue(metric: WearableMetric, value: number | null): string {
  if (value === null) return '—';
  switch (metric) {
    case 'sleepMin':
      return formatSleepMinutes(value);
    case 'hrvMs':
      return `${int(value)}${NBSP}ms`;
    case 'nightHrBpm':
      return `${int(value)}${NBSP}bpm`;
    case 'steps':
      return `${int(value)}${NBSP}pas`;
  }
}

/** Valeur portée sur le graphique (le sommeil en heures). */
export function chartValue(metric: WearableMetric, value: number | null): number | null {
  if (value === null) return null;
  return metric === 'sleepMin' ? Math.round((value / 60) * 100) / 100 : value;
}

export type ChartPoint = {
  date: string;
  /** Valeur des journées complètes (null = trou). */
  value: number | null;
  /** Segment pointillé vers la journée en cours : veille et jour en cours seulement. */
  partial: number | null;
  /** Point de la journée en cours (affiché en creux). */
  isPartial: boolean;
};

/**
 * Points du graphique. Pour une métrique cumulée (pas), la journée en cours est sortie de la
 * courbe pleine et portée par une série « partial » (pointillés, point en creux).
 */
export function chartData(metric: WearableMetric, days: WearableSummaryDay[], partialDay: string | null = null): ChartPoint[] {
  const cumulative = metric === 'steps';
  const lastIdx = days.length - 1;
  const partialIdx = cumulative && partialDay && days[lastIdx]?.date === partialDay ? lastIdx : -1;
  return days.map((d, i) => {
    const v = chartValue(metric, d[metric]);
    const isPartial = i === partialIdx;
    return {
      date: d.date,
      value: isPartial ? null : v,
      partial: partialIdx >= 0 && (i === partialIdx || i === partialIdx - 1) ? v : null,
      isPartial: isPartial && v !== null,
    };
  });
}

/** Graduation de l'axe Y avec son unité (min et max de la période). */
export function formatAxisValue(metric: WearableMetric, value: number): string {
  if (metric === 'sleepMin') {
    return `${(Math.round(value * 10) / 10).toLocaleString('fr-FR')}${NBSP}h`;
  }
  return `${int(value)}${NBSP}${METRIC_META[metric].unit}`;
}

/** Min et max des valeurs affichées (journée en cours comprise), null si aucune. */
export function chartRange(points: ChartPoint[]): [number, number] | null {
  const values = points.flatMap((p) => [p.value, p.partial]).filter((v): v is number => v !== null);
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Écart neutre avec la période précédente : « +12 min vs 7 jours précédents ».
 * null si la période affichée n'a pas de donnée.
 */
export function formatDelta(metric: WearableMetric, current: number | null, previous: number | null, days: number): string | null {
  if (current === null) return null;
  const ref = `${days}${NBSP}jours précédents`;
  if (previous === null) return `Pas de données sur les ${ref}`;
  const diff = Math.round(current - previous);
  if (diff === 0) return `Identique aux ${ref}`;
  const sign = diff > 0 ? '+' : MINUS;
  const abs = Math.abs(diff);
  const unit = metric === 'sleepMin' ? 'min' : metric === 'hrvMs' ? 'ms' : metric === 'nightHrBpm' ? 'bpm' : 'pas';
  return `${sign}${int(abs)}${NBSP}${unit} vs ${ref}`;
}

/** Jour « 2026-10-31 » → « 31 oct. ». */
export function formatShortDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
