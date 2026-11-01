-- POL-08 · Tests de wearable_events / wearable_raw (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(21);

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Consultant events');

-- 1. Première notification
SELECT results_eq(
  $$SELECT status::text, should_process FROM public.wearable_record_event('polar', 'SLEEP', '475', '2026-10-31',
      'https://www.polaraccesslink.com/v3/users/sleep/2026-10-31', '{"event":"SLEEP"}', 'polar:SLEEP:475:2026-10-31')$$,
  $$VALUES ('pending', true)$$,
  'première notification : pending, à traiter');

SELECT is((SELECT count(*)::int FROM public.wearable_events), 1, 'une ligne');

-- 2. Doublon pendant pending : une seule ligne, pas de changement de statut
SELECT results_eq(
  $$SELECT status::text FROM public.wearable_record_event('polar', 'SLEEP', '475', '2026-10-31', NULL, '{}', 'polar:SLEEP:475:2026-10-31')$$,
  $$VALUES ('pending')$$,
  'doublon en pending : reste pending');
SELECT is((SELECT count(*)::int FROM public.wearable_events), 1, 'doublon : toujours une seule ligne');
SELECT isnt((SELECT resource_url FROM public.wearable_events), NULL, 'doublon sans url : url conservée');

-- 3. Prise en charge unique
SELECT is((SELECT count(*)::int FROM public.wearable_claim_event((SELECT id FROM public.wearable_events))), 1, 'claim : pris en charge');
SELECT is((SELECT count(*)::int FROM public.wearable_claim_event((SELECT id FROM public.wearable_events))), 0, 'second claim : refusé');

-- 4. Notification pendant processing → last_notified_at mis à jour, should_process false, puis requeue à la fin
SELECT results_eq(
  $$SELECT status::text, should_process FROM public.wearable_record_event('polar', 'SLEEP', '475', '2026-10-31', NULL, '{}', 'polar:SLEEP:475:2026-10-31')$$,
  $$VALUES ('processing', false)$$,
  'notification pendant processing : reste processing, pas de second traitement lancé');
SELECT results_eq(
  $$SELECT requeued, status::text, attempts FROM public.wearable_finish_event((SELECT id FROM public.wearable_events), 'done')$$,
  $$VALUES (true, 'pending', 0)$$,
  'fin de traitement après notification : repasse en pending');

-- 5. Second traitement sans nouvelle notification → done
SELECT is((SELECT count(*)::int FROM public.wearable_claim_event((SELECT id FROM public.wearable_events))), 1, 'retraitement : pris en charge');
SELECT results_eq(
  $$SELECT requeued, status::text FROM public.wearable_finish_event((SELECT id FROM public.wearable_events), 'done', NULL, NULL, '00000000-0000-0000-0000-0000000000e1')$$,
  $$VALUES (false, 'done')$$,
  'retraitement sans notification : done');
SELECT isnt((SELECT processed_at FROM public.wearable_events), NULL, 'processed_at renseigné');
SELECT is((SELECT consultant_id FROM public.wearable_events), '00000000-0000-0000-0000-0000000000e1'::uuid, 'consultant rattaché');

-- 6. Doublon d'un événement done → pending, attempts 0
UPDATE public.wearable_events SET attempts = 3;
SELECT results_eq(
  $$SELECT status::text, should_process FROM public.wearable_record_event('polar', 'SLEEP', '475', '2026-10-31', NULL, '{}', 'polar:SLEEP:475:2026-10-31')$$,
  $$VALUES ('pending', true)$$,
  'doublon après done : repasse en pending, à traiter');
SELECT is((SELECT attempts FROM public.wearable_events), 0, 'doublon après done : attempts remis à 0');

-- 7. Échec : attempts + 1, erreur conservée, report
SELECT public.wearable_claim_event((SELECT id FROM public.wearable_events));
SELECT results_eq(
  $$SELECT requeued, status::text, attempts FROM public.wearable_finish_event((SELECT id FROM public.wearable_events), 'failed', 'HTTP 500', now() + interval '1 hour')$$,
  $$VALUES (false, 'failed', 1)$$,
  'échec : failed, attempts 1');
SELECT is((SELECT last_error FROM public.wearable_events), 'HTTP 500', 'échec : erreur conservée');

-- 8. Événement différé : pas traité avant next_attempt_at
SELECT results_eq(
  $$SELECT should_process FROM public.wearable_record_event('polar', 'NIGHTLY_RECHARGE', '475', '2026-10-31', NULL, '{}',
      'polar:NIGHTLY_RECHARGE:475:2026-10-31', now() + interval '6 hours')$$,
  $$VALUES (false)$$,
  'événement différé : pas à traiter tout de suite');

-- 9. wearable_raw : unicité (provider, data_type, provider_record_id)
INSERT INTO public.wearable_raw (consultant_id, provider, data_type, provider_record_id, data_date, payload)
  VALUES ('00000000-0000-0000-0000-0000000000e1', 'polar', 'sleep', '475:2026-10-31', '2026-10-31', '{}');
SELECT throws_ok(
  $$INSERT INTO public.wearable_raw (consultant_id, provider, data_type, provider_record_id, data_date, payload)
    VALUES ('00000000-0000-0000-0000-0000000000e1', 'polar', 'sleep', '475:2026-10-31', '2026-10-31', '{}')$$,
  '23505', NULL, 'wearable_raw : unicité (provider, data_type, provider_record_id)');

-- 10. Droits
SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM public.wearable_events', '42501', NULL, 'authenticated : wearable_events interdit');
SELECT throws_ok('SELECT * FROM public.wearable_raw', '42501', NULL, 'authenticated : wearable_raw interdit');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
