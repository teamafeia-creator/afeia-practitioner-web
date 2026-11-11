// lib/wearables/insights/index.ts
// Point d'entrée : calcule tout l'écran « Objet connecté » à partir des données chargées.
import { Series, addDays } from './series';
import { beforeAfter, habitsVsMeasures, pointsToDiscuss, weekTiles, type InsightsInput } from './engine';
import { computeRecap, type RecapFrequency } from './recap';

export * from './series';
export * from './engine';
export * from './recap';

export function computeInsights(input: InsightsInput, recapFrequency: RecapFrequency = '1w') {
  const series = new Series(input.days, input.today);
  // Habituel des tuiles : figé avant la dernière séance ; sans séance, les 28 nuits avant la semaine.
  const refDay = input.lastSessionDate ?? addDays(input.today, -7);
  return {
    tiles: weekTiles(series, refDay),
    points: pointsToDiscuss(input, series),
    beforeAfter: beforeAfter(input, series),
    habits: habitsVsMeasures(input, series),
    recap: computeRecap(input, recapFrequency),
  };
}

export type Insights = ReturnType<typeof computeInsights>;
