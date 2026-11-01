-- POL-17 · Déconnexion (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(19);

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000a1', 'Consultant D'),
  ('00000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000a1', 'Consultant E (témoin)');

-- Deux consultants connectés, avec données dans toutes les tables.
SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000d7', 'polar', 'polar-d7', 'tok-d7', NULL);
SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000d8', 'polar', 'polar-d8', 'tok-d8', NULL);

CREATE FUNCTION pg_temp.seed(p_cid UUID, p_puid TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_raw UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.wearable_raw (id, consultant_id, provider, data_type, provider_record_id, data_date, payload)
    VALUES (v_raw, p_cid, 'polar', 'sleep', p_puid || ':2026-10-31', '2026-10-31', '{}');
  INSERT INTO public.sleep_sessions (consultant_id, provider, source_raw_id, night_date, total_sleep_s) VALUES (p_cid, 'polar', v_raw, '2026-10-31', 25000);
  INSERT INTO public.hrv_nightly (consultant_id, provider, source_raw_id, night_date, hrv_rmssd_avg_ms) VALUES (p_cid, 'polar', v_raw, '2026-10-31', 42);
  INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm) VALUES (p_cid, 'polar', v_raw, '2026-10-30T23:00:00Z', 60);
  INSERT INTO public.daily_activity (consultant_id, provider, source_raw_id, activity_date, steps) VALUES (p_cid, 'polar', v_raw, '2026-10-31', 8000);
  INSERT INTO public.wearable_events (provider, event_type, provider_user_id, consultant_id, idempotency_key, status)
    VALUES ('polar', 'SLEEP', p_puid, p_cid, 'k-' || p_puid || '-1', 'done'),
           ('polar', 'SLEEP', p_puid, NULL, 'k-' || p_puid || '-2', 'pending'); -- pas encore rattaché
END $$;
SELECT pg_temp.seed('00000000-0000-0000-0000-0000000000d7', 'polar-d7');
SELECT pg_temp.seed('00000000-0000-0000-0000-0000000000d8', 'polar-d8');

CREATE FUNCTION pg_temp.rows(p_cid UUID, p_puid TEXT) RETURNS INTEGER LANGUAGE sql AS $$
  SELECT (SELECT count(*) FROM public.sleep_sessions WHERE consultant_id = p_cid)
       + (SELECT count(*) FROM public.hrv_nightly WHERE consultant_id = p_cid)
       + (SELECT count(*) FROM public.hr_samples WHERE consultant_id = p_cid)
       + (SELECT count(*) FROM public.daily_activity WHERE consultant_id = p_cid)
       + (SELECT count(*) FROM public.wearable_raw WHERE consultant_id = p_cid)
       + (SELECT count(*) FROM public.wearable_events WHERE consultant_id = p_cid OR provider_user_id = p_puid)
$$;
SELECT is(pg_temp.rows('00000000-0000-0000-0000-0000000000d7', 'polar-d7'), 7, 'jeu de départ : 7 lignes pour D');

-- 1. Sans suppression : révocation seule, données conservées
SELECT is(
  (public.wearable_disconnect('00000000-0000-0000-0000-0000000000d7', 'polar', false))->>'found', 'true',
  'déconnexion sans suppression : connexion trouvée');
SELECT results_eq(
  $$SELECT status::text, access_token_secret_id IS NULL, interrupted_at IS NOT NULL
    FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000d7'$$,
  $$VALUES ('revoked', true, true)$$,
  'connexion révoquée, jeton effacé, date d''interruption posée');
SELECT is((SELECT count(*)::int FROM vault.secrets WHERE name LIKE 'wearable:polar:00000000-0000-0000-0000-0000000000d7:%'), 0,
  'secret Vault supprimé');
SELECT is(public.wearable_get_access_token('00000000-0000-0000-0000-0000000000d7', 'polar'), NULL, 'plus aucun jeton lisible');
SELECT is(pg_temp.rows('00000000-0000-0000-0000-0000000000d7', 'polar-d7'), 7, 'sans suppression : données conservées');

-- 2. Suppression demandée ensuite (connexion déjà révoquée) : toutes les tables
CREATE TEMP TABLE r AS SELECT public.wearable_disconnect('00000000-0000-0000-0000-0000000000d7', 'polar', true) AS res;
SELECT is(pg_temp.rows('00000000-0000-0000-0000-0000000000d7', 'polar-d7'), 0, 'avec suppression : plus aucune ligne pour D');
SELECT is(((SELECT res FROM r)->'deleted'->>'wearable_events')::int, 2, 'événements supprimés, y compris non rattachés');
SELECT is(((SELECT res FROM r)->'deleted'->>'hr_samples')::int, 1, 'compte des lignes supprimées renvoyé');
SELECT is(pg_temp.rows('00000000-0000-0000-0000-0000000000d8', 'polar-d8'), 7, 'consultant témoin E : données intactes');
SELECT is((SELECT status::text FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000d8'), 'active',
  'consultant témoin E : connexion intacte');

-- 3. Déconnexion + suppression en une fois
SELECT public.wearable_disconnect('00000000-0000-0000-0000-0000000000d8', 'polar', true);
SELECT is(pg_temp.rows('00000000-0000-0000-0000-0000000000d8', 'polar-d8'), 0, 'déconnexion avec suppression en un appel');
SELECT is((SELECT status::text FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000d8'), 'revoked',
  'et connexion révoquée');

-- 4. Aucune connexion
SELECT is((public.wearable_disconnect('00000000-0000-0000-0000-0000000000a1', 'polar', true))->>'found', 'false',
  'consultant sans connexion : found = false');

-- 5. Reconnexion après déconnexion : ligne réactivée, nouveau jeton chiffré
SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000d7', 'polar', 'polar-d7', 'tok-d7-new', now() + interval '1 year');
SELECT results_eq(
  $$SELECT status::text, access_token_secret_id IS NOT NULL, interrupted_at IS NULL, backfill_status::text
    FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000d7'$$,
  $$VALUES ('active', true, true, 'pending')$$,
  'reconnexion : active, nouveau secret, interruption effacée, import relancé');
SELECT is(public.wearable_get_access_token('00000000-0000-0000-0000-0000000000d7', 'polar'), 'tok-d7-new', 'reconnexion : nouveau jeton lisible');
SELECT is((SELECT count(*)::int FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000d7'), 1,
  'reconnexion : même ligne (pas de doublon)');

-- Droits
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.wearable_disconnect('00000000-0000-0000-0000-0000000000d8', 'polar', true)$$, '42501', NULL,
  'authenticated : fonction interdite (passe par le serveur)');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.wearable_disconnect('00000000-0000-0000-0000-0000000000d8', 'polar', true)$$, '42501', NULL, 'anon : interdit');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
