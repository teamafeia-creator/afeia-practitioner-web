// lib/wearables/insights/index.ts
// Point d'entrée : calcule tout l'écran « Objet connecté » à partir des données chargées.
import { Series } from './series';
import { beforeAfter, feelAndCycle, habitsVsMeasures, overviewChart, pointsToDiscuss, referenceDay, weekTiles, wornNights, type InsightsInput } from './engine';
import { computeRecap, type RecapFrequency } from './recap';
import type { Metric } from './series';

export * from './series';
export * from './engine';
export * from './recap';
export * from './schedule';
export * from './autocheck';
export * from './goals';
export * from './signals';

export function computeInsights(input: InsightsInput, opts: { recapFrequency?: RecapFrequency; chartMetric?: Metric } = {}) {
  const series = new Series(input.days, input.today);
  const ba = beforeAfter(input, series);
  return {
    series,
    worn: wornNights(series, input.today),
    tiles: weekTiles(series, referenceDay(input)),
    chart: overviewChart(input, series, opts.chartMetric ?? 'sleep', ba),
    points: pointsToDiscuss(input, series),
    beforeAfter: ba,
    habits: habitsVsMeasures(input, series),
    feel: feelAndCycle(input, series),
    recap: computeRecap(input, opts.recapFrequency ?? '1w'),
  };
}

export type Insights = ReturnType<typeof computeInsights>;
