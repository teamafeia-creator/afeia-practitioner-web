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
  restingHrBpm: { title: 'FC de repos', unit: 'bpm' },
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
    case 'restingHrBpm':
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

export function chartData(metric: WearableMetric, days: WearableSummaryDay[]) {
  return days.map((d) => ({ date: d.date, value: chartValue(metric, d[metric]) }));
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
  const unit = metric === 'sleepMin' ? 'min' : metric === 'hrvMs' ? 'ms' : metric === 'restingHrBpm' ? 'bpm' : 'pas';
  return `${sign}${int(abs)}${NBSP}${unit} vs ${ref}`;
}

/** Jour « 2026-10-31 » → « 31 oct. ». */
export function formatShortDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
