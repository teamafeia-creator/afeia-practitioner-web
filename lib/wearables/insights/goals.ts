// lib/wearables/insights/goals.ts
// « Ses objectifs » (onglet Conseils suivis × mesures de la maquette) : relier un objectif à une
// mesure, avec une cible libre ; valeur « avant → depuis » le dernier conseillancier partagé.
import { Series, addDays, dayRange, fmtValue, mean, type Metric } from './series';
import { sinceWindow, baseline, referenceDay, type InsightsInput } from './engine';

/** Libellés GM de la maquette. */
export const GOAL_METRIC_LABEL: Record<Metric, string> = { sleep: 'Sommeil', hrv: 'VFC de la nuit', hr: 'FC de la nuit', steps: 'Pas' };
/** Exemples de cible (GPH de la maquette). */
export const GOAL_TARGET_PLACEHOLDER: Record<Metric, string> = {
  sleep: 'ex. 7 h par nuit',
  hrv: 'ex. rester au-dessus de 42 ms',
  hr: 'ex. rester sous 60 bpm',
  steps: 'ex. 3 jours actifs par semaine',
};

const KEYWORDS: [RegExp, Metric][] = [
  [/(dorm|sommeil|nuit|réveil|reveil|endorm)/i, 'sleep'],
  [/(march|\bpas\b|bouger|activit|sport|sédentar|sedentar|mouvement)/i, 'steps'],
  [/(cœur|coeur|cardiaque|palpitation)/i, 'hr'],
  [/(stress|récup|recup|énergie|energie|fatigue|détente|detente)/i, 'hrv'],
];

/** « Suggestion d’après le texte de l’objectif » : mesure proposée, ou null. */
export function suggestMetric(label: string): Metric | null {
  for (const [re, m] of KEYWORDS) if (re.test(label)) return m;
  return null;
}

export type GoalTrend = { value: string; aria: string; spark: { d: string; bandY: number; bandH: number } | null };

/** « 38 ms → 42 ms » : moyenne avant / depuis le dernier conseillancier partagé (périodes de l'onglet Avant / après). */
export function goalTrend(input: InsightsInput, series: Series, metric: Metric): GoalTrend {
  const share = input.planShares.length ? input.planShares[input.planShares.length - 1].date : null;
  let value = '—';
  let aria = `${GOAL_METRIC_LABEL[metric]} : pas encore de conseillancier partagé`;
  if (share) {
    const { after, before } = sinceWindow(share, input.today);
    const b = mean(series.values(metric, before));
    const a = mean(series.values(metric, after));
    if (a !== null && b !== null) {
      value = `${fmtValue(metric, b)} → ${fmtValue(metric, a)}`;
      aria = `${GOAL_METRIC_LABEL[metric]} sur 28 nuits : ${fmtValue(metric, b)} avant la séance, ${fmtValue(metric, a)} depuis`;
    }
  }
  // Petite courbe des 28 dernières nuits, avec la bande de son habituel.
  const y = addDays(input.today, -1);
  const vals = dayRange(addDays(y, -27), y).map((d) => series.value(metric, d));
  const base = baseline(series, metric, referenceDay(input));
  const pv = vals.filter((v): v is number => v !== null);
  if (!pv.length || !base) return { value, aria, spark: null };
  const lo = Math.min(...pv, base.mean - base.sd);
  const hi = Math.max(...pv, base.mean + base.sd);
  const yy = (v: number) => 27 - ((v - lo) / (hi - lo || 1)) * 24;
  const pts = vals.map((v, i) => (v === null ? null : [(i / 27) * 120, yy(v)])).filter((p): p is number[] => p !== null);
  return {
    value,
    aria,
    spark: {
      d: pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' '),
      bandY: yy(base.mean + base.sd),
      bandH: yy(base.mean - base.sd) - yy(base.mean + base.sd),
    },
  };
}
