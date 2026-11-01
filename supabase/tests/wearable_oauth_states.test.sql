-- POL-05 · Tests de wearable_oauth_states (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(6);

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'Consultant state');

SELECT lives_ok(
  $$INSERT INTO public.wearable_oauth_states (nonce, consultant_id, provider, expires_at)
    VALUES ('nonce-1', '00000000-0000-0000-0000-0000000000d1', 'polar', now() + interval '10 minutes')$$,
  'premier usage du nonce accepté');

SELECT throws_ok(
  $$INSERT INTO public.wearable_oauth_states (nonce, consultant_id, provider, expires_at)
    VALUES ('nonce-1', '00000000-0000-0000-0000-0000000000d1', 'polar', now() + interval '10 minutes')$$,
  '23505', NULL,
  'second usage du même nonce refusé');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
SELECT throws_ok('SELECT * FROM public.wearable_oauth_states', '42501', NULL, 'authenticated : lecture interdite');
SELECT throws_ok(
  $$INSERT INTO public.wearable_oauth_states (nonce, consultant_id, provider, expires_at)
    VALUES ('nonce-2', '00000000-0000-0000-0000-0000000000d1', 'polar', now())$$,
  '42501', NULL, 'authenticated : écriture interdite');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.wearable_oauth_states', '42501', NULL, 'anon : lecture interdite');

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$INSERT INTO public.wearable_oauth_states (nonce, consultant_id, provider, expires_at)
    VALUES ('nonce-3', '00000000-0000-0000-0000-0000000000d1', 'polar', now() + interval '10 minutes')$$,
  'service_role : écriture autorisée');

SELECT * FROM finish();
ROLLBACK;
