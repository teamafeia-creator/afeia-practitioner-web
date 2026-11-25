-- POL-14 · Import de l'historique à la connexion.
--
-- Avancement de l'import stocké sur la connexion :
--  * backfill_status : pending (à faire ou à reprendre), running (en cours), done, failed ;
--  * backfill_cursor : date la plus ancienne déjà importée (l'import va du plus récent
--    au plus ancien, par tranches de 28 jours) ; NULL = rien d'importé ;
--  * backfill_days : profondeur demandée (90 jours par défaut, bornée par type) ;
--  * backfill_updated_at : dernière progression (un import « running » figé est repris).
-- Les connexions existantes passent en pending : le cron importera leur historique.

DO $$ BEGIN
  CREATE TYPE public.wearable_backfill_status AS ENUM ('pending', 'running', 'done', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.wearable_connections
  ADD COLUMN IF NOT EXISTS backfill_status     public.wearable_backfill_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS backfill_cursor     DATE,
  ADD COLUMN IF NOT EXISTS backfill_days       INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS backfill_updated_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.wearable_connections
    ADD CONSTRAINT wearable_connections_backfill_days_check CHECK (backfill_days BETWEEN 1 AND 365);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_wearable_connections_backfill
  ON public.wearable_connections (backfill_status)
  WHERE backfill_status IN ('pending', 'running');

-- Lecture de l'avancement par le praticien et le consultant (colonnes sans lien avec le jeton).
GRANT SELECT (backfill_status, backfill_cursor) ON public.wearable_connections TO authenticated;

CREATE OR REPLACE VIEW public.wearable_connection_overview
WITH (security_invoker = true) AS
  SELECT id, consultant_id, provider, status, connected_at, last_sync_at, last_error, token_expires_at,
         backfill_status, backfill_cursor
  FROM public.wearable_connections;

REVOKE ALL ON public.wearable_connection_overview FROM PUBLIC, anon;
GRANT SELECT ON public.wearable_connection_overview TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Reconnexion : l'import repart de zéro (même fonction que 20261101, + 3 colonnes).
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
    updated_at             = now(),
    -- POL-14 : une (re)connexion relance l'import d'historique depuis le début (idempotent).
    backfill_status        = 'pending',
    backfill_cursor        = NULL,
    backfill_updated_at    = NULL
  RETURNING wc.id INTO v_id;

  RETURN v_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- Prise en charge atomique d'un import (callback OAuth et cron peuvent se croiser).
-- pending → running ; running figé depuis plus de p_stale_after → repris.
-- Renvoie la connexion prise en charge, ou aucune ligne.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wearable_claim_backfill(
  p_connection_id UUID,
  p_stale_after   INTERVAL DEFAULT interval '10 minutes'
) RETURNS TABLE (
  id               UUID,
  consultant_id    UUID,
  provider         public.wearable_provider,
  provider_user_id TEXT,
  backfill_cursor  DATE,
  backfill_days    INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.wearable_connections c
  SET backfill_status = 'running', backfill_updated_at = clock_timestamp()
  WHERE c.id = p_connection_id
    AND c.status = 'active'
    AND (c.backfill_status = 'pending'
         OR (c.backfill_status = 'running'
             AND coalesce(c.backfill_updated_at, '-infinity') < clock_timestamp() - p_stale_after))
  RETURNING c.id, c.consultant_id, c.provider, c.provider_user_id, c.backfill_cursor, c.backfill_days;
$$;

REVOKE ALL ON FUNCTION public.wearable_claim_backfill(UUID, INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_claim_backfill(UUID, INTERVAL) TO service_role;
