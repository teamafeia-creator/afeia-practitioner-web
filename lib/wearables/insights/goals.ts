// lib/wearables/insights/goals.ts
// Objectifs reliés à une mesure de l'objet : suggestion d'après le texte, et évolution
// « au départ → maintenant » (moyenne des 14 nuits avant la date de l'objectif, puis des 14 dernières).
import { Series, addDays, dayRange, fmtValue, mean, type Metric } from './series';

export const GOAL_METRIC_LABEL: Record<Metric, string> = { sleep: 'Sommeil', hrv: 'VFC de la nuit', hr: 'FC de la nuit', steps: 'Pas' };

const KEYWORDS: [RegExp, Metric][] = [
  [/(dorm|sommeil|nuit|réveil|reveil|endorm)/i, 'sleep'],
  [/(march|pas\b|bouger|activit|sport|sédentar|sedentar|mouvement)/i, 'steps'],
  [/(cœur|coeur|cardiaque|palpitation)/i, 'hr'],
  [/(stress|récup|recup|énergie|energie|fatigue|tension|anxi|détente|detente)/i, 'hrv'],
];

/** Mesure suggérée d'après le libellé de l'objectif, ou null. */
export function suggestMetric(label: string): Metric | null {
  for (const [re, m] of KEYWORDS) if (re.test(label)) return m;
  return null;
}

export type GoalTrend = { start: string | null; now: string | null; startNights: number; nowNights: number };

export function goalTrend(series: Series, metric: Metric, setOn: string): GoalTrend {
  const yesterday = addDays(series.today, -1);
  const before = series.values(metric, dayRange(addDays(setOn, -14), addDays(setOn, -1)));
  const recent = series.values(metric, dayRange(addDays(yesterday, -13), yesterday));
  return {
    start: before.length >= 4 ? fmtValue(metric, mean(before)!) : null,
    now: recent.length >= 4 ? fmtValue(metric, mean(recent)!) : null,
    startNights: before.length,
    nowNights: recent.length,
  };
}
