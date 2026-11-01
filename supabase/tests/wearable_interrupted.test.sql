-- POL-16 · Date d'interruption de la connexion (pgTAP). Lancer avec : supabase test db
BEGIN;
SELECT plan(5);

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000a1', 'Consultant interrompu');
SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000e9', 'polar', 'polar-909', 'tok-909', NULL);

SELECT is((SELECT interrupted_at FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000e9'),
  NULL, 'connexion active : pas de date d''interruption');

SELECT public.wearable_revoke_connection('00000000-0000-0000-0000-0000000000e9', 'polar');
SELECT isnt((SELECT interrupted_at FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000e9'),
  NULL, 'révocation : date d''interruption renseignée');

UPDATE public.wearable_connections SET interrupted_at = '2026-10-20T08:00:00Z' WHERE consultant_id = '00000000-0000-0000-0000-0000000000e9';
SELECT public.wearable_revoke_connection('00000000-0000-0000-0000-0000000000e9', 'polar');
SELECT is((SELECT interrupted_at FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000e9'),
  '2026-10-20T08:00:00Z'::timestamptz, 'révocation répétée : la première date est conservée');

SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000e9', 'polar', 'polar-909', 'tok-910', NULL);
SELECT is((SELECT interrupted_at FROM public.wearable_connections WHERE consultant_id = '00000000-0000-0000-0000-0000000000e9'),
  NULL, 'reconnexion : date d''interruption effacée');

SELECT has_column('public', 'wearable_connection_overview', 'interrupted_at', 'la vue expose interrupted_at');

SELECT * FROM finish();
ROLLBACK;
