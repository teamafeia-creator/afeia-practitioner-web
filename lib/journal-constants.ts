/**
 * Constants for the enriched journal system.
 * Bristol scale, mood options, indicator categories, observance categories.
 */

import type { MoodLevel, ExerciseIntensity, IndicatorCategory, ObservanceCategory } from './types';

// ─── Bristol Scale ──────────────────────────────────

export type BristolStatus = 'constipation' | 'normal' | 'diarrhee';

export type BristolTypeInfo = {
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  description: string;
  color: string;
  status: BristolStatus;
};

export const BRISTOL_TYPES: BristolTypeInfo[] = [
  { type: 1, label: 'Billes dures séparées', description: 'Constipation sévère', color: 'orange-600', status: 'constipation' },
  { type: 2, label: 'Saucisse bosselée', description: 'Constipation', color: 'orange-400', status: 'constipation' },
  { type: 3, label: 'Saucisse avec craquelures', description: 'Normal', color: 'emerald-500', status: 'normal' },
  { type: 4, label: 'Saucisse lisse et souple', description: 'Idéal', color: 'emerald-600', status: 'normal' },
  { type: 5, label: 'Morceaux mous aux bords nets', description: 'Tendance diarrhée', color: 'red-400', status: 'diarrhee' },
  { type: 6, label: 'Morceaux flottants, pâteux', description: 'Diarrhée modérée', color: 'red-500', status: 'diarrhee' },
  { type: 7, label: 'Liquide, pas de morceaux', description: 'Diarrhée sévère', color: 'red-600', status: 'diarrhee' },
];

// ─── Mood Options ───────────────────────────────────

export type MoodOption = {
  value: MoodLevel;
  label: string;
  emoji: string;
  color: string;
};

export const MOOD_OPTIONS: MoodOption[] = [
  { value: 'tres_bien', label: 'Très bien', emoji: '😄', color: 'emerald' },
  { value: 'bien', label: 'Bien', emoji: '🙂', color: 'green' },
  { value: 'neutre', label: 'Neutre', emoji: '😐', color: 'warmgray' },
  { value: 'moyen', label: 'Moyen', emoji: '😕', color: 'orange' },
  { value: 'mauvais', label: 'Mauvais', emoji: '😞', color: 'red' },
];

// ─── Legacy mood mapping ────────────────────────────

export const MOOD_LEGACY_MAP: Record<string, MoodLevel> = {
  'Bon': 'bien',
  'Positif': 'bien',
  '🙂': 'bien',
  'Moyen': 'moyen',
  '😐': 'neutre',
  'Mauvais': 'mauvais',
  'Negatif': 'mauvais',
  '🙁': 'mauvais',
  'Neutre': 'neutre',
  'Très bien': 'tres_bien',
  'tres_bien': 'tres_bien',
  'bien': 'bien',
  'neutre': 'neutre',
  'moyen': 'moyen',
  'mauvais': 'mauvais',
};

export function normalizeMood(mood: string | null | undefined): MoodLevel {
  if (!mood) return 'neutre';
  return MOOD_LEGACY_MAP[mood] ?? 'neutre';
}

// ─── Indicator Categories ───────────────────────────

export type IndicatorCategoryInfo = {
  value: IndicatorCategory;
  label: string;
  icon: string;
};

export const INDICATOR_CATEGORIES: IndicatorCategoryInfo[] = [
  { value: 'hydratation', label: 'Hydratation', icon: 'Droplets' },
  { value: 'alimentation', label: 'Alimentation', icon: 'Apple' },
  { value: 'respiration', label: 'Respiration', icon: 'Wind' },
  { value: 'mouvement', label: 'Mouvement', icon: 'Activity' },
  { value: 'phytotherapie', label: 'Phytothérapie', icon: 'Leaf' },
  { value: 'complement', label: 'Compléments', icon: 'Pill' },
  { value: 'sommeil', label: 'Sommeil', icon: 'Moon' },
  { value: 'custom', label: 'Personnalisé', icon: 'Settings' },
];

// ─── Observance Categories ──────────────────────────

export type ObservanceCategoryInfo = {
  value: ObservanceCategory;
  label: string;
};

export const OBSERVANCE_CATEGORIES: ObservanceCategoryInfo[] = [
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'hydratation', label: 'Hydratation' },
  { value: 'phytotherapie', label: 'Phytothérapie' },
  { value: 'complement', label: 'Compléments' },
  { value: 'aromatologie', label: 'Aromatologie' },
  { value: 'hydrologie', label: 'Hydrologie' },
  { value: 'activite', label: 'Activité physique' },
  { value: 'respiration', label: 'Respiration' },
  { value: 'sommeil', label: 'Sommeil' },
  { value: 'equilibre_psycho', label: 'Équilibre psycho-émotionnel' },
  { value: 'technique_manuelle', label: 'Techniques manuelles' },
  { value: 'autre', label: 'Autre' },
];

// ─── Exercise Intensities ───────────────────────────

export type ExerciseIntensityInfo = {
  value: ExerciseIntensity;
  label: string;
};

export const EXERCISE_INTENSITIES: ExerciseIntensityInfo[] = [
  { value: 'leger', label: 'Léger' },
  { value: 'modere', label: 'Modéré' },
  { value: 'intense', label: 'Intense' },
];
