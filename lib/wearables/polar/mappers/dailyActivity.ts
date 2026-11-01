// Polar « activity » (GET /v3/users/activities/{date}) → daily_activity. Fonction pure.
import { int, isoDate, isoDurationToSeconds, localDay, num } from '../../time';
import type { DailyActivityRow, MapperContext, MapperResult } from './types';

/**
 * Date de l'activité : date contenue dans la réponse (`date`, sinon `samples.date`, sinon jour
 * local de `start_time`), la date demandée seulement en repli. Divergence → avertissement.
 */
export function activityDate(
  item: Record<string, unknown>,
  ctx: MapperContext
): { date: string | null; warning: string | null } {
  const fromResponse =
    isoDate(item.date) ??
    isoDate((item.samples as Record<string, unknown> | undefined)?.date) ??
    localDay(item.start_time, ctx.timezone);
  const requested = isoDate(ctx.requestedDate);
  const date = fromResponse ?? requested;
  const warning =
    fromResponse && requested && fromResponse !== requested
      ? `activité : date de la réponse (${fromResponse}) ≠ date demandée (${requested})`
      : null;
  return { date, warning };
}

export function mapDailyActivity(json: unknown, ctx: MapperContext): MapperResult<DailyActivityRow> {
  const a = (json ?? {}) as Record<string, unknown>;
  const { date, warning } = activityDate(a, ctx);
  if (!date) return { rows: [], warnings: ['activité sans date : ignorée'] };

  return {
    rows: [
      {
        activity_date: date,
        steps: int(a.steps),
        active_calories_kcal: int(a.active_calories),
        total_calories_kcal: int(a.calories),
        active_s: isoDurationToSeconds(a.active_duration),
        distance_m: num(a.distance_from_steps),
      },
    ],
    warnings: warning ? [warning] : [],
  };
}
