// Lignes normalisées produites par les mappers (sans consultant_id, provider, source_raw_id,
// ajoutés à l'écriture). Champ absent chez le fournisseur → null, jamais 0.

export type MapperContext = {
  /** Fuseau IANA du consultant (déjà résolu : consultants.timezone ou Europe/Paris). */
  timezone: string;
  /** Date demandée au fournisseur (YYYY-MM-DD), repli quand la réponse n'en porte pas. */
  requestedDate?: string | null;
};

export type MapperResult<Row> = { rows: Row[]; warnings: string[] };

export type SleepSessionRow = {
  night_date: string;
  sleep_start_at: string | null;
  sleep_end_at: string | null;
  total_sleep_s: number | null;
  light_sleep_s: number | null;
  deep_sleep_s: number | null;
  rem_sleep_s: number | null;
  unrecognized_sleep_s: number | null;
  interruption_s: number | null;
  sleep_score: number | null;
};

export type HrvNightlyRow = {
  night_date: string;
  hrv_rmssd_avg_ms: number | null;
  hr_avg_bpm: number | null;
  beat_to_beat_avg_ms: number | null;
  breathing_rate_avg_per_min: number | null;
  recovery_status: number | null;
  ans_charge: number | null;
  ans_charge_status: number | null;
};

export type HrSampleRow = { recorded_at: string; hr_bpm: number };

export type DailyActivityRow = {
  activity_date: string;
  steps: number | null;
  active_calories_kcal: number | null;
  total_calories_kcal: number | null;
  active_s: number | null;
  distance_m: number | null;
};
