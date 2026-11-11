/**
 * Checklist d'observance reliée au conseillancier.
 *
 * Dans l'éditeur, chaque ligne d'une rubrique peut être cochée « Suivre dans le journal ».
 * La ligne devient un item de la checklist du consultant, avec un libellé modifiable
 * et une fréquence : tous les jours, ou N fois par jour / semaine / mois / an.
 */

import type { ObservanceCategory, ObservanceFrequency, ObservanceItem } from './types';

export type TrackUnit = 'day' | 'week' | 'month' | 'year';

export type TrackFrequency = { mode: 'daily' } | { mode: 'custom'; count: number; unit: TrackUnit };

export type TrackedItem = {
  /** Clé de la rubrique du conseillancier (ex. phytotherapie_plantes). */
  field_key: string;
  /** Position de la ligne dans la rubrique au dernier enregistrement. */
  line_index: number;
  /** Texte de la ligne au dernier enregistrement (sert à la retrouver si l'ordre change). */
  line: string;
  /** Libellé affiché dans la checklist du consultant. */
  label: string;
  freq: TrackFrequency;
};

export const TRACK_UNITS: Array<{ value: TrackUnit; label: string }> = [
  { value: 'day', label: 'jour' },
  { value: 'week', label: 'semaine' },
  { value: 'month', label: 'mois' },
  { value: 'year', label: 'an' },
];

const UNIT_LABEL: Record<TrackUnit, string> = { day: 'jour', week: 'semaine', month: 'mois', year: 'an' };
const UNIT_FROM_WORD: Record<string, TrackUnit> = { jour: 'day', semaine: 'week', mois: 'month', an: 'year' };

/** Lignes non vides d'une rubrique, dans l'ordre. */
export function fieldLines(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** « Tous les jours », « 3× / semaine »… */
export function formatFrequency(freq: TrackFrequency): string {
  if (freq.mode === 'daily') return 'Tous les jours';
  return `${freq.count}× / ${UNIT_LABEL[freq.unit]}`;
}

/** Fréquence pré-remplie à partir du texte du conseil. */
export function inferFrequency(text: string): TrackFrequency {
  const times = text.match(/(\d+)\s*(?:à\s*(\d+)\s*)?fois par (jour|semaine|mois|an)/i);
  if (times) {
    return { mode: 'custom', count: Number(times[2] || times[1]), unit: UNIT_FROM_WORD[times[3].toLowerCase()] };
  }
  if (/(chaque|tous les) (soirs?|jours?|matins?)|le soir|le matin|quotidien|au (lever|coucher)|avant le coucher/i.test(text)) {
    return { mode: 'daily' };
  }
  const weeks = text.match(/(\d+)\s*semaines? par mois/i);
  if (weeks) return { mode: 'custom', count: Number(weeks[1]), unit: 'month' };
  return { mode: 'custom', count: 1, unit: 'week' };
}

export function isDailyFrequency(freq: TrackFrequency) {
  return freq.mode === 'daily' || freq.unit === 'day';
}

/**
 * Retrouve la ligne d'un item suivi dans le texte actuel de la rubrique :
 * d'abord par son texte, sinon par sa position. -1 si la ligne n'existe plus.
 */
export function resolveLineIndex(item: TrackedItem, lines: string[]): number {
  const byText = lines.indexOf(item.line);
  if (byText >= 0) return byText;
  return item.line_index < lines.length ? item.line_index : -1;
}

/** Recale les items sur le contenu actuel et retire ceux dont la ligne a disparu. */
export function resolveTrackedItems(content: Record<string, string>, items: TrackedItem[]): TrackedItem[] {
  const out: TrackedItem[] = [];
  const taken = new Set<string>();
  for (const item of items) {
    const lines = fieldLines(content[item.field_key]);
    const index = resolveLineIndex(item, lines);
    const slot = `${item.field_key}#${index}`;
    if (index < 0 || taken.has(slot)) continue;
    taken.add(slot);
    out.push({ ...item, line_index: index, line: lines[index] });
  }
  return out;
}

export function normalizeTrackedItems(raw: unknown): TrackedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is TrackedItem =>
      Boolean(x) && typeof x === 'object' && typeof (x as TrackedItem).field_key === 'string' && typeof (x as TrackedItem).label === 'string'
  );
}

// ─── Base de données ─────────────────────────────

/** Fréquence enregistrée : colonnes libres + frequency / weekly_target lus par l'app mobile. */
export function frequencyToDb(freq: TrackFrequency): {
  frequency: ObservanceFrequency;
  weekly_target: number | null;
  period_count: number | null;
  period_unit: TrackUnit | null;
} {
  if (freq.mode === 'daily') return { frequency: 'daily', weekly_target: null, period_count: null, period_unit: null };
  if (freq.unit === 'day') return { frequency: 'daily', weekly_target: null, period_count: freq.count, period_unit: 'day' };
  if (freq.unit === 'week') return { frequency: 'weekly', weekly_target: freq.count, period_count: freq.count, period_unit: 'week' };
  return { frequency: 'as_needed', weekly_target: null, period_count: freq.count, period_unit: freq.unit };
}

export function frequencyFromDb(item: Pick<ObservanceItem, 'frequency' | 'weekly_target' | 'period_count' | 'period_unit'>): TrackFrequency {
  if (item.period_count && item.period_unit) return { mode: 'custom', count: item.period_count, unit: item.period_unit };
  if (item.frequency === 'weekly') return { mode: 'custom', count: item.weekly_target || 3, unit: 'week' };
  if (item.frequency === 'as_needed') return { mode: 'custom', count: 1, unit: 'week' };
  return { mode: 'daily' };
}

/** Nombre de jours où l'item est attendu sur une période (une coche par jour au plus). */
export function plannedDays(freq: TrackFrequency, days: number): number {
  if (freq.mode === 'daily' || freq.unit === 'day') return days;
  const perDay = { week: 7, month: 30, year: 365 }[freq.unit as Exclude<TrackUnit, 'day'>];
  return Math.max(1, Math.min(days, Math.round((freq.count * days) / perDay)));
}

const FIELD_CATEGORY: Record<string, ObservanceCategory> = {
  phytotherapie_plantes: 'phytotherapie',
  phytotherapie_posologie: 'phytotherapie',
  phytotherapie_precautions: 'phytotherapie',
  complements: 'complement',
  huiles_essentielles: 'aromatologie',
  techniques_respiratoires: 'respiration',
  objectif_hydratation: 'hydratation',
  type_eau: 'hydratation',
  moments_hydratation: 'hydratation',
  sommeil_routine: 'sommeil',
  sommeil_environnement: 'sommeil',
  automassages: 'technique_manuelle',
  points_reflexes: 'technique_manuelle',
  activite_type: 'activite',
  activite_frequence: 'activite',
  activite_conseils: 'activite',
  hydrologie: 'hydrologie',
  principes_alimentaires: 'alimentation',
  aliments_a_privilegier: 'alimentation',
  aliments_a_limiter: 'alimentation',
  rythme_repas: 'alimentation',
  equilibre_psycho: 'equilibre_psycho',
  gestion_charge_mentale: 'equilibre_psycho',
};

export function categoryForField(fieldKey: string | null | undefined): ObservanceCategory {
  return (fieldKey && FIELD_CATEGORY[fieldKey]) || 'autre';
}
