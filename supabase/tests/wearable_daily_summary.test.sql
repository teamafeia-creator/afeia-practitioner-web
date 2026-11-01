-- POL-15 · Séries quotidiennes (pgTAP). Lancer avec : supabase test db
-- Période : 7 jours se terminant le 2026-10-31 (bascule à l'heure d'hiver le 2026-10-25 à 3 h).
BEGIN;
SELECT plan(16);

CREATE FUNCTION pg_temp.login(p_sub TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_sub IS NULL THEN '{"role":"anon"}' ELSE json_build_object('sub', p_sub, 'role', 'authenticated')::text END, true);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.login(TEXT) TO authenticated, anon;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'summary-x@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'summary-y@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'summary-a@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'summary-sans-lien@test.local')
ON CONFLICT DO NOTHING;
INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000a1', 'Consultant A');
INSERT INTO public.consultant_memberships (consultant_id, consultant_user_id) VALUES
  ('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000c1');
INSERT INTO public.wearable_raw (id, consultant_id, provider, data_type, provider_record_id, data_date, payload) VALUES
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000005a', 'polar', 'sleep', 'A:s', '2026-10-31', '{}');

-- Sommeil : trou le 27 et les 29-30
INSERT INTO public.sleep_sessions (consultant_id, provider, source_raw_id, night_date, total_sleep_s) VALUES
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-25', 25200),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-26', 27030),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-28', 24000),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-31', NULL); -- nuit sans total
-- Nightly Recharge : le 26 (FC nocturne fournie), le 30 (FC nocturne absente → repli FC continue)
INSERT INTO public.hrv_nightly (consultant_id, provider, source_raw_id, night_date, hrv_rmssd_avg_ms, hr_avg_bpm) VALUES
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-26', 40, 55),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-30', 45, NULL);
-- FC continue, autour de la bascule d'heure du 25 octobre
INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm) VALUES
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-24T21:30:00Z', 49), -- 23:30 le 24 à Paris (UTC+2) : hors période
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-24T22:30:00Z', 60), -- 00:30 le 25 (UTC+2)
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-25T22:30:00Z', 58), -- 23:30 le 25 (UTC+1)
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-25T23:30:00Z', 51), -- 00:30 le 26 (UTC+1)
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-30T02:00:00Z', 52),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-30T09:00:00Z', 70);
-- Activité : trou le 30, 0 pas le 31 (reste 0)
INSERT INTO public.daily_activity (consultant_id, provider, source_raw_id, activity_date, steps) VALUES
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-25', 8000),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-26', 9000),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-27', 7000),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-28', 6500),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-29', 10000),
  ('00000000-0000-0000-0000-00000000005a', 'polar', '00000000-0000-0000-0000-0000000005a1', '2026-10-31', 0);

SET LOCAL ROLE authenticated;

-- Praticien X (rattaché)
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000a1');
CREATE TEMP TABLE s AS SELECT * FROM public.wearable_daily_summary('00000000-0000-0000-0000-00000000005a', 7, '2026-10-31');
SELECT is((SELECT count(*)::int FROM s), 7, '7 jours, un par jour civil, même avec des trous');
SELECT is((SELECT min(day) FROM s), '2026-10-25'::date, 'premier jour = aujourd''hui − 6');
SELECT results_eq('SELECT day, sleep_min FROM s ORDER BY day',
  $$VALUES ('2026-10-25'::date, 420), ('2026-10-26', 451), ('2026-10-27', NULL::int), ('2026-10-28', 400),
           ('2026-10-29', NULL), ('2026-10-30', NULL), ('2026-10-31', NULL)$$,
  'sommeil (min) : trous et nuit sans total → NULL');
SELECT results_eq('SELECT day, steps FROM s ORDER BY day',
  $$VALUES ('2026-10-25'::date, 8000), ('2026-10-26', 9000), ('2026-10-27', 7000), ('2026-10-28', 6500),
           ('2026-10-29', 10000), ('2026-10-30', NULL::int), ('2026-10-31', 0)$$,
  'pas : trou → NULL, 0 réel → 0');
SELECT is((SELECT hrv_ms FROM s WHERE day = '2026-10-26'), 40, 'VFC nocturne (ms)');
SELECT is((SELECT hrv_ms FROM s WHERE day = '2026-10-27'), NULL::int, 'VFC : jour sans donnée → NULL');
SELECT is((SELECT resting_hr_bpm FROM s WHERE day = '2026-10-26'), 55, 'FC : la FC nocturne prime sur la FC continue');
SELECT is((SELECT resting_hr_bpm FROM s WHERE day = '2026-10-30'), 52, 'FC : repli sur la plus basse FC continue du jour');
SELECT is((SELECT resting_hr_bpm FROM s WHERE day = '2026-10-25'), 58,
  'bascule d''heure : 00:30 (UTC+2) et 23:30 (UTC+1) comptent tous deux pour le 25 ; 23:30 le 24 exclu');
SELECT is((SELECT resting_hr_bpm FROM s WHERE day = '2026-10-29'), NULL::int, 'FC : aucun échantillon → NULL');
SELECT is((SELECT count(*)::int FROM public.wearable_daily_summary('00000000-0000-0000-0000-00000000005a', 14, '2026-10-31')), 14,
  '14 jours (période + période précédente)');

-- Consultant A lui-même
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000c1');
SELECT is((SELECT count(*)::int FROM public.wearable_daily_summary('00000000-0000-0000-0000-00000000005a', 7, '2026-10-31')), 7,
  'consultant : lit sa propre série');

-- Praticien Y (non rattaché) et utilisateur sans lien
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000a2');
SELECT is((SELECT count(*)::int FROM public.wearable_daily_summary('00000000-0000-0000-0000-00000000005a', 7, '2026-10-31')), 0,
  'praticien non rattaché : liste vide');
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000c3');
SELECT is((SELECT count(*)::int FROM public.wearable_daily_summary('00000000-0000-0000-0000-00000000005a', 30, '2026-10-31')), 0,
  'utilisateur sans lien : liste vide');

-- Anonyme
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.login(NULL);
SELECT throws_ok($$SELECT * FROM public.wearable_daily_summary('00000000-0000-0000-0000-00000000005a', 7)$$, '42501', NULL, 'anon : interdit');
RESET ROLE;

SELECT is((SELECT bool_or(prosecdef) FROM pg_proc WHERE proname = 'wearable_daily_summary'), false, 'SECURITY INVOKER (RLS appliquée)');

SELECT * FROM finish();
ROLLBACK;
