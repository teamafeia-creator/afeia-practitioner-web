// Question du matin « Comment avez-vous dormi ? » (5 visages) et cause probable d'une mauvaise nuit.
// Module pur, partagé entre l'API, l'espace consultant web et (à venir) l'app mobile.

export const SLEEP_FEELINGS = [
  { value: 'tres_bien', label: 'Très bien', emoji: '😄', quality: 10 },
  { value: 'bien', label: 'Bien', emoji: '🙂', quality: 8 },
  { value: 'moyen', label: 'Moyen', emoji: '😐', quality: 6 },
  { value: 'mal', label: 'Mal', emoji: '😕', quality: 4 },
  { value: 'tres_mal', label: 'Très mal', emoji: '😞', quality: 2 },
] as const;

export type SleepFeeling = (typeof SLEEP_FEELINGS)[number]['value'];

/** Causes probables proposées après « Mal » ou « Très mal ». Clés stables (stockées), libellés affichés. */
export const SLEEP_CAUSES = [
  { value: 'stress', label: 'Stress, ruminations' },
  { value: 'late_meal', label: 'Repas tardif ou lourd' },
  { value: 'caffeine', label: 'Café ou thé tardif' },
  { value: 'alcohol', label: 'Alcool' },
  { value: 'screens', label: 'Écrans tard le soir' },
  { value: 'pain', label: 'Douleur' },
  { value: 'noise', label: 'Bruit, chaleur, lumière' },
  { value: 'child', label: 'Enfant, réveil extérieur' },
  { value: 'late_bedtime', label: 'Couché tard' },
  { value: 'other', label: 'Autre' },
] as const;

export type SleepCause = (typeof SLEEP_CAUSES)[number]['value'];

export const SLEEP_CAUSE_LABEL: Record<SleepCause, string> = Object.fromEntries(SLEEP_CAUSES.map((c) => [c.value, c.label])) as Record<SleepCause, string>;

export function feelingToQuality(feeling: SleepFeeling): number {
  return SLEEP_FEELINGS.find((f) => f.value === feeling)!.quality;
}

export function qualityToFeeling(quality: number | null | undefined): SleepFeeling | null {
  if (quality === null || quality === undefined) return null;
  // Le plus proche des cinq paliers.
  return [...SLEEP_FEELINGS].sort((a, b) => Math.abs(a.quality - quality) - Math.abs(b.quality - quality))[0].value;
}

export function isBadFeeling(feeling: SleepFeeling): boolean {
  return feeling === 'mal' || feeling === 'tres_mal';
}

export function isSleepFeeling(v: unknown): v is SleepFeeling {
  return typeof v === 'string' && SLEEP_FEELINGS.some((f) => f.value === v);
}

export function isSleepCause(v: unknown): v is SleepCause {
  return typeof v === 'string' && SLEEP_CAUSES.some((c) => c.value === v);
}
