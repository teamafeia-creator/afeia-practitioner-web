-- POL-10 · Tests de wearable_raw (pgTAP). Lancer avec : supabase test db
-- Reproduit l'upsert de ingestPolarResource (PostgREST : INSERT … ON CONFLICT DO UPDATE)
-- avec la fixture sleep-by-date.json.
BEGIN;
SELECT plan(9);

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'Consultant raw');

SELECT set_eq(
  $$SELECT enumlabel::text FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'wearable_data_type'$$,
  $$VALUES ('sleep'), ('nightly_recharge'), ('continuous_hr'), ('daily_activity')$$,
  'data_type : valeurs POL-10');

PREPARE ingest(jsonb, timestamptz) AS
  INSERT INTO public.wearable_raw (consultant_id, provider, data_type, provider_record_id, data_date, payload, fetched_at, updated_at)
  VALUES ('00000000-0000-0000-0000-0000000000f1', 'polar', 'sleep', '123456:2026-10-31', '2026-10-31', $1, $2, $2)
  ON CONFLICT (provider, data_type, provider_record_id) DO UPDATE SET
    consultant_id = EXCLUDED.consultant_id, data_date = EXCLUDED.data_date, payload = EXCLUDED.payload,
    fetched_at = EXCLUDED.fetched_at, updated_at = EXCLUDED.updated_at;

EXECUTE ingest('{"polar_user": "https://www.polaraccesslink/v3/users/123456", "date": "2026-10-31", "sleep_start_time": "2026-10-30T23:39:07+01:00", "sleep_end_time": "2026-10-31T07:19:37+01:00", "device_id": "DEVICE00", "continuity": 2.1, "continuity_class": 2, "light_sleep": 14400, "deep_sleep": 5400, "rem_sleep": 5400, "unrecognized_sleep_stage": 0, "sleep_score": 80, "total_interruption_duration": 1800, "sleep_charge": 3, "sleep_goal": 28800, "sleep_rating": 3, "short_interruption_duration": 1200, "long_interruption_duration": 600, "sleep_cycles": 5, "group_duration_score": 100, "group_solidity_score": 75, "group_regeneration_score": 54.2, "hypnogram": {"23:39": 2, "23:50": 3, "00:23": 5}, "heart_rate_samples": {"23:41": 66, "23:46": 64, "23:51": 63}}'::jsonb, '2026-11-01T08:00:00Z');
EXECUTE ingest('{"polar_user": "https://www.polaraccesslink/v3/users/123456", "date": "2026-10-31", "sleep_start_time": "2026-10-30T23:39:07+01:00", "sleep_end_time": "2026-10-31T07:19:37+01:00", "device_id": "DEVICE00", "continuity": 2.1, "continuity_class": 2, "light_sleep": 14400, "deep_sleep": 5400, "rem_sleep": 5400, "unrecognized_sleep_stage": 0, "sleep_score": 80, "total_interruption_duration": 1800, "sleep_charge": 3, "sleep_goal": 28800, "sleep_rating": 3, "short_interruption_duration": 1200, "long_interruption_duration": 600, "sleep_cycles": 5, "group_duration_score": 100, "group_solidity_score": 75, "group_regeneration_score": 54.2, "hypnogram": {"23:39": 2, "23:50": 3, "00:23": 5}, "heart_rate_samples": {"23:41": 66, "23:46": 64, "23:51": 63}}'::jsonb, '2026-11-01T09:00:00Z');
SELECT is((SELECT count(*)::int FROM public.wearable_raw), 1, 'deux ingestions de la même fixture = une ligne');
SELECT is((SELECT fetched_at FROM public.wearable_raw), '2026-11-01T09:00:00Z'::timestamptz, 'fetched_at mis à jour');

CREATE TEMP TABLE first_id AS SELECT id FROM public.wearable_raw;
EXECUTE ingest(jsonb_set('{"polar_user": "https://www.polaraccesslink/v3/users/123456", "date": "2026-10-31", "sleep_start_time": "2026-10-30T23:39:07+01:00", "sleep_end_time": "2026-10-31T07:19:37+01:00", "device_id": "DEVICE00", "continuity": 2.1, "continuity_class": 2, "light_sleep": 14400, "deep_sleep": 5400, "rem_sleep": 5400, "unrecognized_sleep_stage": 0, "sleep_score": 80, "total_interruption_duration": 1800, "sleep_charge": 3, "sleep_goal": 28800, "sleep_rating": 3, "short_interruption_duration": 1200, "long_interruption_duration": 600, "sleep_cycles": 5, "group_duration_score": 100, "group_solidity_score": 75, "group_regeneration_score": 54.2, "hypnogram": {"23:39": 2, "23:50": 3, "00:23": 5}, "heart_rate_samples": {"23:41": 66, "23:46": 64, "23:51": 63}}'::jsonb, '{sleep_score}', '86'), '2026-11-01T12:00:00Z');
SELECT is((SELECT count(*)::int FROM public.wearable_raw), 1, 'nouvelle version : toujours une ligne');
SELECT is((SELECT (payload->>'sleep_score')::int FROM public.wearable_raw), 86, 'nouvelle version : payload remplacé');
SELECT is((SELECT id FROM public.wearable_raw), (SELECT id FROM first_id), 'nouvelle version : même ligne (id conservé)');

SELECT has_index('public', 'wearable_raw', 'idx_wearable_raw_consultant_type_date', 'index (consultant, data_type, data_date)');

SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM public.wearable_raw', '42501', NULL, 'authenticated : lecture interdite');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.wearable_raw', '42501', NULL, 'anon : lecture interdite');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
