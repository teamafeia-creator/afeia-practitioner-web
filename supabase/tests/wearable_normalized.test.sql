-- POL-11 · Tests des tables normalisées (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(14);

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000a1', 'Consultant normalisé');
INSERT INTO public.wearable_raw (id, consultant_id, provider, data_type, provider_record_id, data_date, payload) VALUES
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c9', 'polar', 'sleep', '1:2026-10-31', '2026-10-31', '{}'),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000c9', 'polar', 'continuous_hr', '1:2026-10-31', '2026-10-31', '{}');

SELECT is((SELECT timezone FROM public.consultants WHERE id = '00000000-0000-0000-0000-0000000000c9'), 'Europe/Paris', 'consultants.timezone : Europe/Paris par défaut');

-- Unités dans les noms de colonnes
SELECT has_column('public', 'sleep_sessions', 'total_sleep_s', 'sleep_sessions.total_sleep_s');
SELECT has_column('public', 'hrv_nightly', 'hrv_rmssd_avg_ms', 'hrv_nightly.hrv_rmssd_avg_ms');
SELECT has_column('public', 'hr_samples', 'hr_bpm', 'hr_samples.hr_bpm');
SELECT has_column('public', 'daily_activity', 'active_s', 'daily_activity.active_s');
SELECT col_type_is('public', 'hr_samples', 'recorded_at', 'timestamp with time zone', 'recorded_at en timestamptz');

-- Unicité métier
INSERT INTO public.sleep_sessions (consultant_id, provider, source_raw_id, night_date, light_sleep_s)
  VALUES ('00000000-0000-0000-0000-0000000000c9', 'polar', '00000000-0000-0000-0000-00000000aa01', '2026-10-31', 100);
SELECT throws_ok(
  $$INSERT INTO public.sleep_sessions (consultant_id, provider, source_raw_id, night_date)
    VALUES ('00000000-0000-0000-0000-0000000000c9', 'polar', '00000000-0000-0000-0000-00000000aa01', '2026-10-31')$$,
  '23505', NULL, 'sleep_sessions : une nuit par consultant et fournisseur');
INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm)
  VALUES ('00000000-0000-0000-0000-0000000000c9', 'polar', '00000000-0000-0000-0000-00000000aa02', '2026-10-30T23:02:08Z', 63);
SELECT throws_ok(
  $$INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm)
    VALUES ('00000000-0000-0000-0000-0000000000c9', 'polar', '00000000-0000-0000-0000-00000000aa02', '2026-10-30T23:02:08Z', 64)$$,
  '23505', NULL, 'hr_samples : un échantillon par horodatage');

-- NULL accepté (champ absent), valeurs négatives refusées
SELECT is((SELECT deep_sleep_s FROM public.sleep_sessions), NULL, 'champ absent → NULL');
SELECT throws_ok(
  $$UPDATE public.sleep_sessions SET light_sleep_s = -1$$, '23514', NULL, 'durée négative refusée');

-- updated_at
UPDATE public.sleep_sessions SET updated_at = '2000-01-01', light_sleep_s = 200;
SELECT isnt((SELECT updated_at FROM public.sleep_sessions), '2000-01-01'::timestamptz, 'trigger updated_at');

-- Suppression du brut → cascade
DELETE FROM public.wearable_raw WHERE id = '00000000-0000-0000-0000-00000000aa02';
SELECT is((SELECT count(*)::int FROM public.hr_samples), 0, 'suppression de wearable_raw → lignes normalisées supprimées');

-- Droits
SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM public.sleep_sessions', '42501', NULL, 'authenticated : interdit');
RESET ROLE;
SELECT lives_ok('SELECT public.wearable_truncate_normalized()', 'truncate (service_role/postgres)');

SELECT * FROM finish();
ROLLBACK;
