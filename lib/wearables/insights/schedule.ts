// lib/wearables/insights/schedule.ts
// « Chaque [jour | semaine | 2 semaines | mois] le [jours cochés] » (fenêtre du récap de la maquette).
// - jour : tous les jours (pas de jours à cocher) ;
// - semaine : chaque jour coché ;
// - 2 semaines : une semaine sur deux, les jours cochés ;
// - mois : une fois par mois, la première semaine, les jours cochés.
// Le brouillon est préparé à 7 h les jours prévus et reste valable jusqu'au prochain jour prévu.
import type { RecapFrequency } from './recap';
import { addDays, diffDays, listFr } from './series';

export type RecapSettings = {
  /** « Me le proposer régulièrement (je valide avant l’envoi) » : désactivé par défaut. */
  enabled: boolean;
  frequency: RecapFrequency;
  /** Jours ISO : 1 = lundi … 7 = dimanche. Par défaut le lundi. */
  weekdays: number[];
  /** Semaine de référence pour « une semaine sur deux ». */
  anchor: string;
};

export const DEFAULT_RECAP_SETTINGS: RecapSettings = { enabled: false, frequency: '1w', weekdays: [1], anchor: '2026-01-05' };

export const WEEKDAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const WEEKDAY_LABEL = WEEKDAY_NAMES.map((d) => `${d.slice(0, 3)}.`);

export function isoWeekday(day: string): number {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

function monday(day: string): string {
  return addDays(day, 1 - isoWeekday(day));
}

export function isRecapDay(s: RecapSettings, day: string): boolean {
  if (!s.enabled) return false;
  if (s.frequency === '1d') return true;
  if (!s.weekdays.includes(isoWeekday(day))) return false;
  if (s.frequency === '1w') return true;
  if (s.frequency === '2w') return ((Math.round(diffDays(monday(day), monday(s.anchor)) / 7) % 2) + 2) % 2 === 0;
  return Number(day.slice(8, 10)) <= 7;
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

/** Phrase de la maquette (rcSched). */
export function describeSchedule(s: RecapSettings): string {
  const names = listFr([...s.weekdays].sort().map((d) => WEEKDAY_NAMES[d - 1]));
  const when =
    s.frequency === '1d' ? 'tous les jours' : s.frequency === '1w' ? `chaque ${names}` : s.frequency === '2w' ? `une semaine sur deux, le ${names}` : `une fois par mois, la première semaine, le ${names}`;
  return `Un brouillon vous sera proposé dans votre Revue du matin ${when}. Rien ne part sans votre validation.`;
}

/** « chaque lundi et jeudi » (contexte de la carte de la Revue du matin). */
export function scheduleShort(s: RecapSettings): string {
  const names = listFr([...s.weekdays].sort().map((d) => WEEKDAY_NAMES[d - 1]));
  return s.frequency === '1d' ? 'chaque jour' : s.frequency === '1w' ? `chaque ${names}` : s.frequency === '2w' ? `une semaine sur deux, le ${names}` : `une fois par mois, le ${names}`;
}
