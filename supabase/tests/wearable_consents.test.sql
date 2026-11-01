-- POL-18 · Consentements (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(14);

CREATE FUNCTION pg_temp.login(p_sub TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_sub IS NULL THEN '{"role":"anon"}' ELSE json_build_object('sub', p_sub, 'role', 'authenticated')::text END, true);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.login(TEXT) TO authenticated, anon;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'consent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'consent-b@test.local')
ON CONFLICT DO NOTHING;
INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-000000000c0a', '00000000-0000-0000-0000-0000000000a1', 'Consentant A'),
  ('00000000-0000-0000-0000-000000000c0b', '00000000-0000-0000-0000-0000000000a1', 'Consentant B');
INSERT INTO public.consultant_memberships (consultant_id, consultant_user_id) VALUES
  ('00000000-0000-0000-0000-000000000c0a', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-000000000c0b', '00000000-0000-0000-0000-0000000000f2');

SET LOCAL ROLE authenticated;
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000f1');

SELECT lives_ok($$INSERT INTO public.wearable_consents (consultant_id, text_version) VALUES ('00000000-0000-0000-0000-000000000c0a', 'v1')$$,
  'patient : crée son consentement');
SELECT is((SELECT count(*)::int FROM public.wearable_consents), 1, 'patient : lit son consentement');
SELECT throws_ok($$INSERT INTO public.wearable_consents (consultant_id, text_version) VALUES ('00000000-0000-0000-0000-000000000c0a', 'v1')$$,
  '23505', NULL, 'un seul consentement actif par version');
SELECT throws_ok($$INSERT INTO public.wearable_consents (consultant_id, text_version) VALUES ('00000000-0000-0000-0000-000000000c0b', 'v1')$$,
  '42501', NULL, 'patient : ne peut pas consentir pour un autre');
SELECT throws_ok($$INSERT INTO public.wearable_consents (consultant_id, text_version, accepted_at) VALUES ('00000000-0000-0000-0000-000000000c0a', 'v2', '2020-01-01')$$,
  '42501', NULL, 'patient : ne peut pas antidater');
SELECT throws_ok($$INSERT INTO public.wearable_consents (consultant_id, text_version, withdrawn_at) VALUES ('00000000-0000-0000-0000-000000000c0a', 'v2', now())$$,
  '42501', NULL, 'patient : ne peut pas fixer withdrawn_at');
SELECT throws_ok($$UPDATE public.wearable_consents SET withdrawn_at = now()$$, '42501', NULL, 'patient : modification interdite');
SELECT throws_ok($$DELETE FROM public.wearable_consents$$, '42501', NULL, 'patient : suppression interdite');
SELECT throws_ok($$INSERT INTO public.wearable_consents (consultant_id, text_version) VALUES ('00000000-0000-0000-0000-000000000c0a', 'v1 ; drop')$$,
  '23514', NULL, 'version mal formée refusée (contrainte)');

SELECT pg_temp.login('00000000-0000-0000-0000-0000000000f2');
SELECT is((SELECT count(*)::int FROM public.wearable_consents), 0, 'autre patient : ne voit pas le consentement de A');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.wearable_consents', '42501', NULL, 'anon : interdit');
RESET ROLE;

-- Déconnexion → retrait (la ligne est conservée)
SELECT public.wearable_save_connection('00000000-0000-0000-0000-000000000c0a', 'polar', 'polar-c0a', 'tok-c0a', NULL);
SELECT is(((public.wearable_disconnect('00000000-0000-0000-0000-000000000c0a', 'polar', true))->>'consents_withdrawn')::int, 1,
  'déconnexion : consentement retiré');
SELECT results_eq(
  $$SELECT count(*)::int, count(withdrawn_at)::int FROM public.wearable_consents WHERE consultant_id = '00000000-0000-0000-0000-000000000c0a'$$,
  $$VALUES (1, 1)$$, 'trace conservée avec withdrawn_at');

-- Nouveau consentement possible après retrait
SET LOCAL ROLE authenticated;
SELECT pg_temp.login('00000000-0000-0000-0000-0000000000f1');
SELECT lives_ok($$INSERT INTO public.wearable_consents (consultant_id, text_version) VALUES ('00000000-0000-0000-0000-000000000c0a', 'v1')$$,
  'après retrait : nouveau consentement possible');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
