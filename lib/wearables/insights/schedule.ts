// lib/wearables/insights/schedule.ts
// Quand préparer le récap : « Chaque [jour | semaine | 2 semaines | mois] le [jours cochés] ».
// Le brouillon est préparé à 7 h (Europe/Paris) les jours prévus et reste valable jusqu'au
// prochain jour prévu (exclu), où il est remplacé.
import type { RecapFrequency } from './recap';
import { addDays, diffDays } from './series';

export type RecapSettings = {
  enabled: boolean;
  frequency: RecapFrequency;
  /** Jours ISO : 1 = lundi … 7 = dimanche. */
  weekdays: number[];
  /** Semaine de référence pour « toutes les 2 semaines ». */
  anchor: string;
};

export const DEFAULT_RECAP_SETTINGS: RecapSettings = { enabled: true, frequency: '1w', weekdays: [1], anchor: '2026-01-05' };

export const WEEKDAY_LABEL = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

export function isoWeekday(day: string): number {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Lundi de la semaine du jour. */
function monday(day: string): string {
  return addDays(day, 1 - isoWeekday(day));
}

export function isRecapDay(s: RecapSettings, day: string): boolean {
  if (!s.enabled || !s.weekdays.includes(isoWeekday(day))) return false;
  if (s.frequency === '1d' || s.frequency === '1w') return true;
  if (s.frequency === '2w') return (Math.round(diffDays(monday(day), monday(s.anchor)) / 7) % 2 + 2) % 2 === 0;
  // « Chaque mois » : le premier des jours cochés dans le mois.
  const dom = Number(day.slice(8, 10));
  const first = addDays(day, -(dom - 1));
  for (let d = first; d < day; d = addDays(d, 1)) if (s.weekdays.includes(isoWeekday(d))) return false;
  return true;
}

/** Prochain jour prévu strictement après `day` (dans les 70 jours), ou null. */
export function nextRecapDay(s: RecapSettings, day: string): string | null {
  for (let i = 1; i <= 70; i++) {
    const d = addDays(day, i);
    if (isRecapDay(s, d)) return d;
  }
  return null;
}

/** Dernier jour où le brouillon préparé `day` reste valable. */
export function validUntil(s: RecapSettings, day: string): string {
  const next = nextRecapDay(s, day);
  return next ? addDays(next, -1) : addDays(day, 6);
}

/** « Chaque semaine le lun. », « Chaque jour le lun., mar., mer. »… */
export function describeSchedule(s: RecapSettings): string {
  const head = { '1d': 'Chaque jour', '1w': 'Chaque semaine', '2w': 'Toutes les 2 semaines', '1m': 'Chaque mois' }[s.frequency];
  const days = [...s.weekdays].sort().map((d) => WEEKDAY_LABEL[d - 1]).join(', ');
  return s.frequency === '1m' ? `${head}, le premier ${days}` : `${head} le ${days}`;
}
