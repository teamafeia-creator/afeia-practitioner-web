-- POL-12 · Règles d'accès aux tables normalisées des objets connectés (pgTAP).
-- Lancer avec : supabase test db
--
-- Jeu de données : praticien X suit le consultant A, praticien Y suit le consultant B.
-- A et B ont chacun un compte (consultant_memberships). Une ligne par table et par consultant.
BEGIN;
SELECT plan(46);

-- auth.uid() lit request.jwt.claims (GoTrue) ou request.jwt.claim.sub (image Postgres seule).
CREATE FUNCTION pg_temp.login(p_sub TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_sub IS NULL THEN '{"role":"anon"}' ELSE json_build_object('sub', p_sub, 'role', 'authenticated')::text END, true);
END $$;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'praticien-x@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'praticien-y@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'consultant-a@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'consultant-b@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'sans-lien@test.local');
INSERT INTO public.practitioners (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'praticien-x@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'praticien-y@test.local');
INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Consultant A'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a2', 'Consultant B');
INSERT INTO public.consultant_memberships (consultant_id, consultant_user_id) VALUES
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000c2');

INSERT INTO public.wearable_raw (id, consultant_id, provider, data_type, provider_record_id, data_date, payload)
SELECT gen_random_uuid(), c.id, 'polar', t.dt::public.wearable_data_type, c.name || ':' || t.dt, '2026-10-31', '{}'
FROM public.consultants c
CROSS JOIN (VALUES ('sleep'), ('nightly_recharge'), ('continuous_hr'), ('daily_activity')) AS t(dt)
WHERE c.id IN ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

INSERT INTO public.sleep_sessions (consultant_id, provider, source_raw_id, night_date, total_sleep_s)
  SELECT consultant_id, 'polar', id, '2026-10-31', 25000 FROM public.wearable_raw WHERE data_type = 'sleep';
INSERT INTO public.hrv_nightly (consultant_id, provider, source_raw_id, night_date, hrv_rmssd_avg_ms)
  SELECT consultant_id, 'polar', id, '2026-10-31', 42 FROM public.wearable_raw WHERE data_type = 'nightly_recharge';
INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm)
  SELECT consultant_id, 'polar', id, '2026-10-30T23:02:08Z', 63 FROM public.wearable_raw WHERE data_type = 'continuous_hr';
INSERT INTO public.daily_activity (consultant_id, provider, source_raw_id, activity_date, steps)
  SELECT consultant_id, 'polar', id, '2026-10-31', 8823 FROM public.wearable_raw WHERE data_type = 'daily_activity';

-- Structure : RLS activée et forcée, aucune policy d'écriture
SELECT ok((SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class
           WHERE oid IN ('public.sleep_sessions'::regclass, 'public.hrv_nightly'::regclass,
                         'public.hr_samples'::regclass, 'public.daily_activity'::regclass)),
  'RLS activée et forcée sur les quatre tables');
SELECT is((SELECT count(*)::int FROM pg_policies
           WHERE tablename IN ('sleep_sessions', 'hrv_nightly', 'hr_samples', 'daily_activity') AND cmd <> 'SELECT'),
  0, 'aucune policy INSERT/UPDATE/DELETE');

-- Fonction de test : ids des consultants visibles dans une table pour l'utilisateur courant
CREATE FUNCTION pg_temp.visible(p_table TEXT) RETURNS UUID[] LANGUAGE plpgsql AS $$
DECLARE r UUID[];
BEGIN
  EXECUTE format('SELECT coalesce(array_agg(DISTINCT consultant_id ORDER BY consultant_id), ''{}'') FROM public.%I', p_table) INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.visible(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION pg_temp.login(TEXT) TO authenticated, anon;

SET LOCAL ROLE authenticated;

-- Consultant A : uniquement ses lignes
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000c1');
SELECT is(pg_temp.visible('sleep_sessions'), ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'consultant A : sleep_sessions = A seulement');
SELECT is(pg_temp.visible('hrv_nightly'),    ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'consultant A : hrv_nightly = A seulement');
SELECT is(pg_temp.visible('hr_samples'),     ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'consultant A : hr_samples = A seulement');
SELECT is(pg_temp.visible('daily_activity'), ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'consultant A : daily_activity = A seulement');
SELECT is((SELECT count(*)::int FROM public.sleep_sessions WHERE consultant_id = '00000000-0000-0000-0000-00000000000b'), 0,
  'consultant A ne lit pas B, même en le ciblant');

-- Consultant B : uniquement ses lignes
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000c2');
SELECT is(pg_temp.visible('sleep_sessions'), ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'consultant B : sleep_sessions = B seulement');
SELECT is(pg_temp.visible('hrv_nightly'),    ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'consultant B : hrv_nightly = B seulement');
SELECT is(pg_temp.visible('hr_samples'),     ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'consultant B : hr_samples = B seulement');
SELECT is(pg_temp.visible('daily_activity'), ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'consultant B : daily_activity = B seulement');

-- Praticien X : uniquement son consultant A
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000a1');
SELECT is(pg_temp.visible('sleep_sessions'), ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'praticien X : sleep_sessions = A seulement');
SELECT is(pg_temp.visible('hrv_nightly'),    ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'praticien X : hrv_nightly = A seulement');
SELECT is(pg_temp.visible('hr_samples'),     ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'praticien X : hr_samples = A seulement');
SELECT is(pg_temp.visible('daily_activity'), ARRAY['00000000-0000-0000-0000-00000000000a']::uuid[], 'praticien X : daily_activity = A seulement');
SELECT is((SELECT count(*)::int FROM public.hr_samples WHERE consultant_id = '00000000-0000-0000-0000-00000000000b'), 0,
  'praticien X ne lit pas le consultant de Y, même en le ciblant');

-- Praticien Y : uniquement son consultant B
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000a2');
SELECT is(pg_temp.visible('sleep_sessions'), ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'praticien Y : sleep_sessions = B seulement');
SELECT is(pg_temp.visible('hrv_nightly'),    ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'praticien Y : hrv_nightly = B seulement');
SELECT is(pg_temp.visible('hr_samples'),     ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'praticien Y : hr_samples = B seulement');
SELECT is(pg_temp.visible('daily_activity'), ARRAY['00000000-0000-0000-0000-00000000000b']::uuid[], 'praticien Y : daily_activity = B seulement');

-- Utilisateur connecté sans aucun lien : rien
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000c3');
SELECT is(pg_temp.visible('sleep_sessions'), '{}'::uuid[], 'sans lien : sleep_sessions vide');
SELECT is(pg_temp.visible('hrv_nightly'),    '{}'::uuid[], 'sans lien : hrv_nightly vide');
SELECT is(pg_temp.visible('hr_samples'),     '{}'::uuid[], 'sans lien : hr_samples vide');
SELECT is(pg_temp.visible('daily_activity'), '{}'::uuid[], 'sans lien : daily_activity vide');

-- Écritures refusées pour authenticated (même le praticien sur son propre consultant)
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000a1');
SELECT throws_ok($$INSERT INTO public.sleep_sessions (consultant_id, provider, source_raw_id, night_date)
  SELECT consultant_id, 'polar', source_raw_id, '2026-10-30' FROM public.sleep_sessions LIMIT 1$$, '42501', NULL, 'authenticated : INSERT sleep_sessions refusé');
SELECT throws_ok($$INSERT INTO public.hrv_nightly (consultant_id, provider, source_raw_id, night_date)
  SELECT consultant_id, 'polar', source_raw_id, '2026-10-30' FROM public.hrv_nightly LIMIT 1$$, '42501', NULL, 'authenticated : INSERT hrv_nightly refusé');
SELECT throws_ok($$INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm)
  SELECT consultant_id, 'polar', source_raw_id, now(), 70 FROM public.hr_samples LIMIT 1$$, '42501', NULL, 'authenticated : INSERT hr_samples refusé');
SELECT throws_ok($$INSERT INTO public.daily_activity (consultant_id, provider, source_raw_id, activity_date)
  SELECT consultant_id, 'polar', source_raw_id, '2026-10-30' FROM public.daily_activity LIMIT 1$$, '42501', NULL, 'authenticated : INSERT daily_activity refusé');
SELECT throws_ok('UPDATE public.sleep_sessions SET total_sleep_s = 1', '42501', NULL, 'authenticated : UPDATE sleep_sessions refusé');
SELECT throws_ok('UPDATE public.hrv_nightly SET hrv_rmssd_avg_ms = 1', '42501', NULL, 'authenticated : UPDATE hrv_nightly refusé');
SELECT throws_ok('UPDATE public.hr_samples SET hr_bpm = 1', '42501', NULL, 'authenticated : UPDATE hr_samples refusé');
SELECT throws_ok('UPDATE public.daily_activity SET steps = 1', '42501', NULL, 'authenticated : UPDATE daily_activity refusé');
SELECT throws_ok('DELETE FROM public.sleep_sessions', '42501', NULL, 'authenticated : DELETE sleep_sessions refusé');
SELECT throws_ok('DELETE FROM public.hrv_nightly', '42501', NULL, 'authenticated : DELETE hrv_nightly refusé');
SELECT throws_ok('DELETE FROM public.hr_samples', '42501', NULL, 'authenticated : DELETE hr_samples refusé');
SELECT throws_ok('DELETE FROM public.daily_activity', '42501', NULL, 'authenticated : DELETE daily_activity refusé');

-- Le consultant ne peut pas non plus écrire ses propres données
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000c1');
SELECT throws_ok('UPDATE public.daily_activity SET steps = 99999', '42501', NULL, 'consultant : UPDATE de ses propres données refusé');

-- Anonyme : rien
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.login(NULL);
SELECT throws_ok('SELECT * FROM public.sleep_sessions', '42501', NULL, 'anon : sleep_sessions interdit');
SELECT throws_ok('SELECT * FROM public.hrv_nightly', '42501', NULL, 'anon : hrv_nightly interdit');
SELECT throws_ok('SELECT * FROM public.hr_samples', '42501', NULL, 'anon : hr_samples interdit');
SELECT throws_ok('SELECT * FROM public.daily_activity', '42501', NULL, 'anon : daily_activity interdit');
SELECT throws_ok($$INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm)
  VALUES ('00000000-0000-0000-0000-00000000000a', 'polar', gen_random_uuid(), now(), 70)$$, '42501', NULL, 'anon : INSERT refusé');
SELECT throws_ok('SELECT public.auth_self_consultant_ids()', '42501', NULL, 'anon : fonctions d''accès non exécutables');

-- service_role : lecture et écriture
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT is((SELECT count(*)::int FROM public.sleep_sessions), 2, 'service_role : lit tout');
SELECT lives_ok('UPDATE public.daily_activity SET steps = steps + 1', 'service_role : écrit');
RESET ROLE;

-- Les fonctions d'accès n'élargissent rien : SECURITY INVOKER
SELECT is((SELECT bool_or(prosecdef) FROM pg_proc WHERE proname IN ('auth_practitioner_consultant_ids', 'auth_self_consultant_ids')),
  false, 'fonctions d''accès en SECURITY INVOKER');

SELECT * FROM finish();
ROLLBACK;
