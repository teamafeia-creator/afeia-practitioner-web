-- POL-04 · Connexions aux objets connectés (Polar en premier) et chiffrement du jeton.
--
-- Les jetons Polar durent environ un an, peut-être sans limite, et il n'y a pas de
-- refresh token (docs/wearables/polar.md §4). Une fuite donne donc un accès durable.
--  * Le jeton est stocké dans Supabase Vault (chiffrement authentifié, clé gérée par
--    Supabase, hors de la base). La table ne garde que l'identifiant du secret.
--  * Seul service_role peut écrire ou lire le jeton, via des fonctions
--    SECURITY DEFINER dont l'exécution est retirée à anon et authenticated.
--  * Praticiens et consultants voient l'état de la connexion (sans le jeton) via la
--    vue wearable_connection_overview, qui applique la RLS de la table (security_invoker).

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.wearable_provider AS ENUM ('polar');   -- extensible : ALTER TYPE … ADD VALUE
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wearable_connection_status AS ENUM ('active', 'revoked', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_connections (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id          UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider               public.wearable_provider NOT NULL,
  provider_user_id       TEXT NOT NULL,
  -- Identifiant du secret dans vault.secrets (le jeton chiffré y est stocké).
  -- NULL une fois la connexion révoquée : le jeton est alors supprimé.
  access_token_secret_id UUID,
  token_expires_at       TIMESTAMPTZ,
  status                 public.wearable_connection_status NOT NULL DEFAULT 'active',
  connected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at           TIMESTAMPTZ,
  last_error             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wearable_connections_consultant_provider_key UNIQUE (consultant_id, provider),
  CONSTRAINT wearable_connections_provider_user_key UNIQUE (provider, provider_user_id),
  CONSTRAINT wearable_connections_active_has_token
    CHECK (status <> 'active' OR access_token_secret_id IS NOT NULL)
);

COMMENT ON TABLE public.wearable_connections IS
  'Connexions OAuth aux objets connectés. Jeton dans Vault ; lecture/écriture du jeton réservée à service_role.';

-- ---------------------------------------------------------------------------
-- Droits : RLS + privilèges par colonne (défense en profondeur)
-- ---------------------------------------------------------------------------
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_connections FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.wearable_connections FROM PUBLIC, anon, authenticated;
-- authenticated ne peut lire que les colonnes sans lien avec le jeton.
GRANT SELECT (id, consultant_id, provider, status, connected_at, last_sync_at, last_error, token_expires_at)
  ON public.wearable_connections TO authenticated;
GRANT ALL ON public.wearable_connections TO service_role;

DROP POLICY IF EXISTS wearable_connections_practitioner_select ON public.wearable_connections;
CREATE POLICY wearable_connections_practitioner_select ON public.wearable_connections
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consultants c
    WHERE c.id = wearable_connections.consultant_id
      AND c.practitioner_id = auth.uid()
  ));

DROP POLICY IF EXISTS wearable_connections_consultant_select ON public.wearable_connections;
CREATE POLICY wearable_connections_consultant_select ON public.wearable_connections
  FOR SELECT TO authenticated
  USING (consultant_id IN (
    SELECT m.consultant_id FROM public.consultant_memberships m
    WHERE m.consultant_user_id = auth.uid()
  ));

-- Aucune policy INSERT/UPDATE/DELETE : seules les fonctions ci-dessous et
-- service_role (qui contourne la RLS) modifient la table.

-- ---------------------------------------------------------------------------
-- Vue d'état (sans le jeton), RLS de la table appliquée à l'appelant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.wearable_connection_overview
WITH (security_invoker = true) AS
  SELECT id, consultant_id, provider, status, connected_at, last_sync_at, last_error, token_expires_at
  FROM public.wearable_connections;

REVOKE ALL ON public.wearable_connection_overview FROM PUBLIC, anon;
GRANT SELECT ON public.wearable_connection_overview TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fonctions (service_role uniquement)
-- ---------------------------------------------------------------------------

-- Crée ou met à jour la connexion et son jeton. Renvoie l'id de la connexion.
CREATE OR REPLACE FUNCTION public.wearable_save_connection(
  p_consultant_id    UUID,
  p_provider         public.wearable_provider,
  p_provider_user_id TEXT,
  p_access_token     TEXT,
  p_token_expires_at TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id        UUID;
  v_secret_id UUID;
BEGIN
  IF coalesce(p_access_token, '') = '' THEN
    RAISE EXCEPTION 'access token is required';
  END IF;

  SELECT id, access_token_secret_id INTO v_id, v_secret_id
  FROM public.wearable_connections
  WHERE consultant_id = p_consultant_id AND provider = p_provider
  FOR UPDATE;

  IF v_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_secret_id, p_access_token);
  ELSE
    v_secret_id := vault.create_secret(
      p_access_token,
      'wearable:' || p_provider || ':' || p_consultant_id || ':' || gen_random_uuid(),
      'Jeton OAuth objet connecté'
    );
  END IF;

  INSERT INTO public.wearable_connections AS wc (
    consultant_id, provider, provider_user_id, access_token_secret_id,
    token_expires_at, status, connected_at, last_error, updated_at
  ) VALUES (
    p_consultant_id, p_provider, p_provider_user_id, v_secret_id,
    p_token_expires_at, 'active', now(), NULL, now()
  )
  ON CONFLICT (consultant_id, provider) DO UPDATE SET
    provider_user_id       = EXCLUDED.provider_user_id,
    access_token_secret_id = EXCLUDED.access_token_secret_id,
    token_expires_at       = EXCLUDED.token_expires_at,
    status                 = 'active',
    connected_at           = now(),
    last_error             = NULL,
    updated_at             = now()
  RETURNING wc.id INTO v_id;

  RETURN v_id;
END;
$$;

-- Jeton en clair, NULL si la connexion est révoquée ou absente.
-- Une connexion en 'error' garde son jeton : la prochaine synchro doit pouvoir réessayer.
CREATE OR REPLACE FUNCTION public.wearable_get_access_token(
  p_consultant_id UUID,
  p_provider      public.wearable_provider
) RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.decrypted_secret
  FROM public.wearable_connections wc
  JOIN vault.decrypted_secrets s ON s.id = wc.access_token_secret_id
  WHERE wc.consultant_id = p_consultant_id
    AND wc.provider = p_provider
    AND wc.status IN ('active', 'error');
$$;

-- Révoque la connexion et supprime le jeton de Vault.
CREATE OR REPLACE FUNCTION public.wearable_revoke_connection(
  p_consultant_id UUID,
  p_provider      public.wearable_provider
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  SELECT access_token_secret_id INTO v_secret_id
  FROM public.wearable_connections
  WHERE consultant_id = p_consultant_id AND provider = p_provider
  FOR UPDATE;

  UPDATE public.wearable_connections
  SET status = 'revoked', access_token_secret_id = NULL, updated_at = now()
  WHERE consultant_id = p_consultant_id AND provider = p_provider;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$;

-- Nettoyage du secret quand une connexion est supprimée (y compris par cascade).
CREATE OR REPLACE FUNCTION public.wearable_connections_delete_secret()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.access_token_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.access_token_secret_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS wearable_connections_delete_secret ON public.wearable_connections;
CREATE TRIGGER wearable_connections_delete_secret
  AFTER DELETE ON public.wearable_connections
  FOR EACH ROW EXECUTE FUNCTION public.wearable_connections_delete_secret();

REVOKE ALL ON FUNCTION public.wearable_save_connection(UUID, public.wearable_provider, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wearable_get_access_token(UUID, public.wearable_provider) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wearable_revoke_connection(UUID, public.wearable_provider) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wearable_connections_delete_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_save_connection(UUID, public.wearable_provider, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.wearable_get_access_token(UUID, public.wearable_provider) TO service_role;
GRANT EXECUTE ON FUNCTION public.wearable_revoke_connection(UUID, public.wearable_provider) TO service_role;
