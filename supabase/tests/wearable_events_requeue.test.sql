-- POL-09 · Tests de wearable_requeue_due_events (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(7);

INSERT INTO public.wearable_events (provider, event_type, provider_user_id, idempotency_key, status, attempts, next_attempt_at, processing_started_at) VALUES
  ('polar', 'SLEEP', '1', 'k-failed-2',      'failed',     2, now() - interval '1 minute', NULL),
  ('polar', 'SLEEP', '1', 'k-failed-5',      'failed',     5, now() - interval '1 minute', NULL),
  ('polar', 'SLEEP', '1', 'k-failed-later',  'failed',     1, now() + interval '1 hour',   NULL),
  ('polar', 'NIGHTLY_RECHARGE', '1', 'k-pending-due',    'pending', 0, now() - interval '1 minute', NULL),
  ('polar', 'NIGHTLY_RECHARGE', '1', 'k-pending-later',  'pending', 0, now() + interval '6 hours',  NULL),
  ('polar', 'SLEEP', '1', 'k-stale',         'processing', 0, now() - interval '1 hour',   now() - interval '1 hour'),
  ('polar', 'SLEEP', '1', 'k-running',       'processing', 0, now() - interval '1 minute', now() - interval '1 minute'),
  ('polar', 'SLEEP', '1', 'k-done',          'done',       0, now() - interval '1 hour',   NULL);

CREATE TEMP TABLE due AS SELECT * FROM public.wearable_requeue_due_events(5, interval '15 minutes', 100);

SELECT set_eq(
  $$SELECT e.idempotency_key FROM due d JOIN public.wearable_events e ON e.id = d.id$$,
  $$VALUES ('k-failed-2'), ('k-pending-due'), ('k-stale')$$,
  'rejoue : failed < 5 tentatives dus, pending dus, processing bloqués');
SELECT is((SELECT status::text FROM public.wearable_events WHERE idempotency_key = 'k-failed-5'), 'failed', '5 tentatives : non rejoué');
SELECT is((SELECT status::text FROM public.wearable_events WHERE idempotency_key = 'k-failed-later'), 'failed', 'failed pas encore dû : non rejoué');
SELECT is((SELECT status::text FROM public.wearable_events WHERE idempotency_key = 'k-running'), 'processing', 'processing récent : non touché');
SELECT is((SELECT status::text FROM public.wearable_events WHERE idempotency_key = 'k-done'), 'done', 'done : non touché');
SELECT is((SELECT attempts FROM public.wearable_events WHERE idempotency_key = 'k-failed-2'), 2, 'attempts conservé');

SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM public.wearable_requeue_due_events()', '42501', NULL, 'authenticated : interdit');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
