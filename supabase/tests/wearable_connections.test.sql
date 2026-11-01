-- POL-04 · Tests de wearable_connections (pgTAP).
-- Lancer avec : supabase test db
-- Prouve : aller-retour du chiffrement Vault, jeton jamais stocké en clair,
-- anon/authenticated incapables de lire le jeton, visibilité de l'état limitée
-- au praticien du consultant et au consultant lui-même.

BEGIN;
SELECT plan(25);

-- ---------------------------------------------------------------------------
-- Données de test
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'prat1@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'prat2@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'consultant1@test.local');

INSERT INTO public.practitioners (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'prat1@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'prat2@test.local');

INSERT INTO public.consultants (id, practitioner_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Consultant 1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'Consultant 2');

INSERT INTO public.consultant_memberships (consultant_id, consultant_user_id) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1');

SELECT public.wearable_save_connection(
  '00000000-0000-0000-0000-0000000000b1', 'polar', 'polar-111', 'tok-b1-secret', now() + interval '365 days');
SELECT public.wearable_save_connection(
  '00000000-0000-0000-0000-0000000000b2', 'polar', 'polar-222', 'tok-b2-secret', now() + interval '365 days');

-- ---------------------------------------------------------------------------
-- Chiffrement : aller-retour et absence de clair
-- ---------------------------------------------------------------------------
SELECT is(
  public.wearable_get_access_token('00000000-0000-0000-0000-0000000000b1', 'polar'),
  'tok-b1-secret',
  'aller-retour : le jeton déchiffré est identique au jeton enregistré');

SELECT is(
  (SELECT count(*)::int FROM vault.secrets s
   JOIN public.wearable_connections wc ON wc.access_token_secret_id = s.id
   WHERE s.secret LIKE '%tok-b1-secret%'),
  0,
  'Vault ne stocke pas le jeton en clair (colonne secret chiffrée)');

SELECT is(
  (SELECT count(*)::int FROM public.wearable_connections wc
   WHERE row_to_json(wc)::text LIKE '%tok-b%'),
  0,
  'aucune colonne de wearable_connections ne contient le jeton');

SELECT has_column('public', 'wearable_connections', 'access_token_secret_id', 'la table référence le secret Vault');
SELECT hasnt_column('public', 'wearable_connections', 'access_token', 'pas de colonne access_token en clair');

-- Mise à jour du jeton : même secret, nouvelle valeur.
SELECT public.wearable_save_connection(
  '00000000-0000-0000-0000-0000000000b1', 'polar', 'polar-111', 'tok-b1-renewed', now() + interval '365 days');
SELECT is(
  public.wearable_get_access_token('00000000-0000-0000-0000-0000000000b1', 'polar'),
  'tok-b1-renewed',
  'reconnexion : le nouveau jeton remplace l''ancien');
SELECT is(
  (SELECT count(*)::int FROM vault.secrets WHERE name LIKE 'wearable:polar:00000000-0000-0000-0000-0000000000b1:%'),
  1,
  'reconnexion : pas de secret orphelin');

SELECT throws_ok(
  $$INSERT INTO public.wearable_connections (consultant_id, provider, provider_user_id, access_token_secret_id)
    VALUES ('00000000-0000-0000-0000-0000000000b1', 'polar', 'x', gen_random_uuid())$$,
  '23505', NULL,
  'unicité (consultant_id, provider)');

UPDATE public.wearable_connections SET status = 'error', last_error = 'HTTP 503'
  WHERE consultant_id = '00000000-0000-0000-0000-0000000000b2';
SELECT is(
  public.wearable_get_access_token('00000000-0000-0000-0000-0000000000b2', 'polar'),
  'tok-b2-secret',
  'connexion en erreur : le jeton reste lisible pour réessayer');

-- ---------------------------------------------------------------------------
-- Praticien 1 (authenticated)
-- auth.uid() lit request.jwt.claims (GoTrue) ou request.jwt.claim.sub (image Postgres seule) :
-- on renseigne les deux.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

SELECT throws_ok(
  'SELECT access_token_secret_id FROM public.wearable_connections',
  '42501', NULL,
  'authenticated : lecture de la colonne du jeton refusée');
SELECT throws_ok(
  'SELECT * FROM public.wearable_connections',
  '42501', NULL,
  'authenticated : SELECT * sur la table refusé');
SELECT throws_ok(
  $$SELECT public.wearable_get_access_token('00000000-0000-0000-0000-0000000000b1', 'polar')$$,
  '42501', NULL,
  'authenticated : fonction de lecture du jeton interdite');
SELECT throws_ok(
  'SELECT decrypted_secret FROM vault.decrypted_secrets',
  '42501', NULL,
  'authenticated : vault.decrypted_secrets interdit');
SELECT throws_ok(
  $$UPDATE public.wearable_connections SET status = 'revoked'$$,
  '42501', NULL,
  'authenticated : écriture interdite');
SELECT throws_ok(
  $$SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000b2', 'polar', 'p', 'stolen', NULL)$$,
  '42501', NULL,
  'authenticated : fonction d''écriture interdite');

SELECT results_eq(
  'SELECT consultant_id FROM public.wearable_connection_overview',
  $$VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid)$$,
  'praticien : la vue ne montre que ses consultants');
SELECT hasnt_column('public', 'wearable_connection_overview', 'access_token_secret_id', 'la vue n''expose pas le jeton');

-- ---------------------------------------------------------------------------
-- Consultant 1 (authenticated, via consultant_memberships)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
SELECT results_eq(
  'SELECT consultant_id, status::text FROM public.wearable_connection_overview',
  $$VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid, 'active')$$,
  'consultant : la vue ne montre que sa propre connexion');

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT throws_ok('SELECT access_token_secret_id FROM public.wearable_connections', '42501', NULL, 'anon : table interdite');
SELECT throws_ok('SELECT * FROM public.wearable_connection_overview', '42501', NULL, 'anon : vue interdite');
SELECT throws_ok(
  $$SELECT public.wearable_get_access_token('00000000-0000-0000-0000-0000000000b1', 'polar')$$,
  '42501', NULL,
  'anon : fonction de lecture du jeton interdite');

-- ---------------------------------------------------------------------------
-- Révocation et suppression (service_role / postgres)
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT public.wearable_revoke_connection('00000000-0000-0000-0000-0000000000b1', 'polar');
SELECT is(
  public.wearable_get_access_token('00000000-0000-0000-0000-0000000000b1', 'polar'),
  NULL,
  'révocation : plus de jeton lisible');
SELECT is(
  (SELECT count(*)::int FROM vault.secrets WHERE name LIKE 'wearable:polar:00000000-0000-0000-0000-0000000000b1:%'),
  0,
  'révocation : le secret est supprimé de Vault');

DELETE FROM public.consultants WHERE id = '00000000-0000-0000-0000-0000000000b2';
SELECT is(
  (SELECT count(*)::int FROM vault.secrets WHERE name LIKE 'wearable:polar:00000000-0000-0000-0000-0000000000b2:%'),
  0,
  'suppression du consultant : connexion et secret supprimés');

SELECT throws_ok(
  $$SELECT public.wearable_save_connection('00000000-0000-0000-0000-0000000000b1', 'polar', 'p', '', NULL)$$,
  'P0001', 'access token is required',
  'jeton vide refusé');

SELECT * FROM finish();
ROLLBACK;
