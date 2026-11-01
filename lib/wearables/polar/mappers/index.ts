// Adaptateur Polar : un mapper pur par type de donnée.
import type { WearableDataType } from '../../ingest-types';
import { mapContinuousHr } from './continuousHr';
import { mapDailyActivity } from './dailyActivity';
import { mapNightlyRecharge } from './nightlyRecharge';
import { mapSleep } from './sleep';
import type { MapperContext, MapperResult } from './types';

export { mapContinuousHr, mapDailyActivity, mapNightlyRecharge, mapSleep };
export * from './types';

export type NormalizedTable = 'sleep_sessions' | 'hrv_nightly' | 'hr_samples' | 'daily_activity';

export const POLAR_ADAPTER: Record<
  WearableDataType,
  { table: NormalizedTable; conflict: string; map: (json: unknown, ctx: MapperContext) => MapperResult<Record<string, unknown>> }
> = {
  sleep: { table: 'sleep_sessions', conflict: 'consultant_id,provider,night_date', map: mapSleep },
  nightly_recharge: { table: 'hrv_nightly', conflict: 'consultant_id,provider,night_date', map: mapNightlyRecharge },
  continuous_hr: { table: 'hr_samples', conflict: 'consultant_id,provider,recorded_at', map: mapContinuousHr },
  daily_activity: { table: 'daily_activity', conflict: 'consultant_id,provider,activity_date', map: mapDailyActivity },
};
