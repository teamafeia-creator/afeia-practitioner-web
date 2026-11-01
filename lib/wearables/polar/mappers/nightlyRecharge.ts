// Polar « Nightly Recharge » (GET /v3/users/nightly-recharge/{date}) → hrv_nightly. Fonction pure.
import { int, isoDate, num } from '../../time';
import type { HrvNightlyRow, MapperContext, MapperResult } from './types';

export function mapNightlyRecharge(json: unknown, ctx: MapperContext): MapperResult<HrvNightlyRow> {
  const r = (json ?? {}) as Record<string, unknown>;
  const night_date = isoDate(r.date) ?? isoDate(ctx.requestedDate);
  if (!night_date) return { rows: [], warnings: ['Nightly Recharge sans date : ignoré'] };
  const warnings =
    isoDate(r.date) && ctx.requestedDate && r.date !== ctx.requestedDate
      ? [`Nightly Recharge : date de la réponse (${r.date}) ≠ date demandée (${ctx.requestedDate})`]
      : [];

  return {
    rows: [
      {
        night_date,
        hrv_rmssd_avg_ms: int(r.heart_rate_variability_avg),
        hr_avg_bpm: int(r.heart_rate_avg),
        beat_to_beat_avg_ms: int(r.beat_to_beat_avg),
        breathing_rate_avg_per_min: num(r.breathing_rate_avg),
        recovery_status: int(r.nightly_recharge_status),
        ans_charge: num(r.ans_charge),
        ans_charge_status: int(r.ans_charge_status),
      },
    ],
    warnings,
  };
}
