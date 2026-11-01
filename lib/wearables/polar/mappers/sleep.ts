// Polar « sleep » (GET /v3/users/sleep/{date}) → sleep_sessions. Fonction pure.
import { int, isoDate, toUtcIso } from '../../time';
import type { MapperContext, MapperResult, SleepSessionRow } from './types';

/**
 * Sommeil réel (total_sleep_s) = léger + profond + paradoxal + non reconnu.
 * Le stade « non reconnu » est du temps endormi dont le stade n'a pas pu être identifié
 * (doc AccessLink) : il fait partie du sommeil. Il compte pour 0 s'il est absent.
 * Si léger, profond ou paradoxal manque : null (pas de somme partielle).
 * Règle à confirmer contre le total affiché dans Polar Flow (docs/wearables/polar.md §6.6).
 */
export function totalSleepSeconds(p: { light: number | null; deep: number | null; rem: number | null; unrecognized: number | null }): number | null {
  if (p.light === null || p.deep === null || p.rem === null) return null;
  return p.light + p.deep + p.rem + (p.unrecognized ?? 0);
}

export function mapSleep(json: unknown, ctx: MapperContext): MapperResult<SleepSessionRow> {
  const warnings: string[] = [];
  const s = (json ?? {}) as Record<string, unknown>;
  const night_date = isoDate(s.date) ?? isoDate(ctx.requestedDate);
  if (!night_date) return { rows: [], warnings: ['sommeil sans date : ignoré'] };
  if (isoDate(s.date) && ctx.requestedDate && s.date !== ctx.requestedDate) {
    warnings.push(`sommeil : date de la réponse (${s.date}) ≠ date demandée (${ctx.requestedDate})`);
  }

  const light = int(s.light_sleep);
  const deep = int(s.deep_sleep);
  const rem = int(s.rem_sleep);
  const unrecognized = int(s.unrecognized_sleep_stage);

  return {
    rows: [
      {
        night_date,
        sleep_start_at: toUtcIso(s.sleep_start_time, ctx.timezone),
        sleep_end_at: toUtcIso(s.sleep_end_time, ctx.timezone),
        total_sleep_s: totalSleepSeconds({ light, deep, rem, unrecognized }),
        light_sleep_s: light,
        deep_sleep_s: deep,
        rem_sleep_s: rem,
        unrecognized_sleep_s: unrecognized,
        interruption_s: int(s.total_interruption_duration),
        sleep_score: int(s.sleep_score),
      },
    ],
    warnings,
  };
}
