-- POL-14 · Avancement de l'import d'historique (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(12);

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000a1', 'Consultant import');
SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000f7', 'polar', 'polar-777', 'tok-777', NULL);

SELECT is((SELECT backfill_status::text FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000f7'),
  'pending', 'nouvelle connexion : import pending');
SELECT is((SELECT backfill_days FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000f7'),
  90, 'profondeur par défaut : 90 jours');
SELECT throws_ok($$UPDATE public.wearable_connections SET backfill_days = 400$$, '23514', NULL, 'profondeur bornée à 365 jours');
SELECT has_column('public', 'wearable_connection_overview', 'backfill_status', 'la vue expose backfill_status');
SELECT hasnt_column('public', 'wearable_connection_overview', 'access_token_secret_id', 'la vue n''expose toujours pas le jeton');

-- Prise en charge atomique
CREATE TEMP TABLE conn AS SELECT id FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000f7';
SELECT is((SELECT count(*)::int FROM public.wearable_claim_backfill((SELECT id FROM conn))), 1, 'claim : pending → running');
SELECT is((SELECT count(*)::int FROM public.wearable_claim_backfill((SELECT id FROM conn))), 0, 'second claim simultané : refusé');
UPDATE public.wearable_connections SET backfill_updated_at = now() - interval '1 hour' WHERE id = (SELECT id FROM conn);
SELECT is((SELECT count(*)::int FROM public.wearable_claim_backfill((SELECT id FROM conn))), 1, 'running figé depuis 1 h : repris');

-- Reconnexion : l'import repart de zéro
UPDATE public.wearable_connections SET backfill_status = 'done', backfill_cursor = '2026-08-03' WHERE id = (SELECT id FROM conn);
SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000f7', 'polar', 'polar-777', 'tok-778', NULL);
SELECT results_eq(
  $$SELECT backfill_status::text, backfill_cursor FROM public.wearable_connections WHERE id = (SELECT id FROM conn)$$,
  $$VALUES ('pending', NULL::date)$$,
  'reconnexion : import remis en pending, curseur effacé');
SELECT is((SELECT count(*)::int FROM public.wearable_claim_backfill((SELECT id FROM conn))), 1, 'reconnexion : import de nouveau prenable');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT is((SELECT backfill_status::text FROM public.wearable_connection_overview WHERE consultant_id = '00000000-0000-0000-0000-0000000000f7'),
  'running', 'praticien : lit l''avancement de son consultant via la vue');
SELECT throws_ok('SELECT access_token_secret_id FROM public.wearable_connections', '42501', NULL, 'authenticated : toujours pas de jeton');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
