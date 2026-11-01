// Polar « continuous heart rate » (GET /v3/users/continuous-heart-rate/{date}) → hr_samples.
// `sample_time` est l'heure de l'appareil (HH:mm:ss, sans décalage) : convertie en UTC avec le
// fuseau du consultant. Fonction pure.
import { int, isoDate, toUtcIso } from '../../time';
import type { HrSampleRow, MapperContext, MapperResult } from './types';

export function mapContinuousHr(json: unknown, ctx: MapperContext): MapperResult<HrSampleRow> {
  const c = (json ?? {}) as Record<string, unknown>;
  const date = isoDate(c.date) ?? isoDate(ctx.requestedDate);
  if (!date) return { rows: [], warnings: ['FC continue sans date : ignorée'] };

  const warnings: string[] = [];
  const byTime = new Map<string, HrSampleRow>();
  const samples = Array.isArray(c.heart_rate_samples) ? c.heart_rate_samples : [];
  let skipped = 0;

  for (const raw of samples) {
    const s = (raw ?? {}) as Record<string, unknown>;
    const bpm = int(s.heart_rate);
    const time = typeof s.sample_time === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(s.sample_time) ? s.sample_time : null;
    const recorded_at = time ? toUtcIso(`${date}T${time}`, ctx.timezone) : null;
    if (bpm === null || bpm <= 0 || !recorded_at) {
      skipped += 1;
      continue;
    }
    byTime.set(recorded_at, { recorded_at, hr_bpm: bpm }); // doublon d'horodatage : dernier gardé
  }
  if (skipped) warnings.push(`FC continue ${date} : ${skipped} échantillon(s) illisible(s) ignoré(s)`);
  return { rows: [...byTime.values()].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)), warnings };
}
