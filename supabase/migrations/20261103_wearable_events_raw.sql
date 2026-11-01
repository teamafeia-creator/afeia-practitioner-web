-- POL-08 · Journal des événements webhook (wearable_events) et stockage brut (wearable_raw).
--
-- Le webhook Polar prévient seulement qu'une donnée existe (docs/wearables/polar.md §6).
-- La route vérifie la signature, enregistre l'événement, répond 200, puis
-- processPolarEvent va chercher la donnée et l'ingère dans wearable_raw (POL-10).
--
-- Re-notifications : une ligne par ressource (clé d'idempotence sans timestamp).
--  * doublon → last_notified_at = now() quel que soit le statut ;
--    si done/failed/ignored → retour en pending, attempts = 0 ;
--  * notification reçue pendant le traitement (last_notified_at > processing_started_at)
--    → l'événement repasse en pending à la fin et il est retraité.
--
-- Tables internes au serveur : service_role uniquement.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.wearable_event_status AS ENUM ('pending', 'processing', 'done', 'failed', 'ignored');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Périmètre MVP (fiche §3). Extensible : ALTER TYPE … ADD VALUE.
  CREATE TYPE public.wearable_data_type AS ENUM ('sleep', 'nightly_recharge', 'continuous_heart_rate', 'activity');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- wearable_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              public.wearable_provider NOT NULL,
  -- Type Polar (SLEEP, CONTINUOUS_HEART_RATE, ACTIVITY_SUMMARY…) ou NIGHTLY_RECHARGE,
  -- événement interne créé au traitement d'un SLEEP (Polar n'a pas de webhook Nightly Recharge).
  event_type            TEXT NOT NULL,
  provider_user_id      TEXT NOT NULL,
  consultant_id         UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
  event_date            DATE,
  resource_url          TEXT,
  payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key       TEXT NOT NULL,
  status                public.wearable_event_status NOT NULL DEFAULT 'pending',
  attempts              INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT,
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_notified_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_attempt_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_started_at TIMESTAMPTZ,
  processed_at          TIMESTAMPTZ,
  CONSTRAINT wearable_events_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_wearable_events_queue
  ON public.wearable_events (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_wearable_events_provider_user
  ON public.wearable_events (provider, provider_user_id);

-- ---------------------------------------------------------------------------
-- wearable_raw (structure POL-10)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_raw (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id      UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider           public.wearable_provider NOT NULL,
  data_type          public.wearable_data_type NOT NULL,
  -- Identifiant stable de l'enregistrement chez le fournisseur
  -- (Polar, données journalières : '<polar_user_id>:<YYYY-MM-DD>').
  provider_record_id TEXT NOT NULL,
  data_date          DATE NOT NULL,
  payload            JSONB NOT NULL,
  source_event_id    UUID REFERENCES public.wearable_events(id) ON DELETE SET NULL,
  fetched_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wearable_raw_provider_record_key UNIQUE (provider, data_type, provider_record_id)
);

CREATE INDEX IF NOT EXISTS idx_wearable_raw_consultant_type_date
  ON public.wearable_raw (consultant_id, data_type, data_date);

-- ---------------------------------------------------------------------------
-- Droits : service_role uniquement
-- ---------------------------------------------------------------------------
ALTER TABLE public.wearable_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_raw FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.wearable_events, public.wearable_raw FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.wearable_events, public.wearable_raw TO service_role;
-- Aucune policy : anon et authenticated n'ont ni droit ni ligne visible.

-- ---------------------------------------------------------------------------
-- Fonctions de file (atomiques)
-- ---------------------------------------------------------------------------

-- Enregistre une notification. Renvoie l'événement et s'il faut lancer le traitement
-- (should_process = l'événement est pending et dû).
CREATE OR REPLACE FUNCTION public.wearable_record_event(
  p_provider         public.wearable_provider,
  p_event_type       TEXT,
  p_provider_user_id TEXT,
  p_event_date       DATE,
  p_resource_url     TEXT,
  p_payload          JSONB,
  p_idempotency_key  TEXT,
  p_next_attempt_at  TIMESTAMPTZ DEFAULT now()
) RETURNS TABLE (id UUID, status public.wearable_event_status, should_process BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.wearable_events AS e (
    provider, event_type, provider_user_id, event_date, resource_url, payload,
    idempotency_key, next_attempt_at
  ) VALUES (
    p_provider, p_event_type, p_provider_user_id, p_event_date, p_resource_url,
    coalesce(p_payload, '{}'::jsonb), p_idempotency_key, coalesce(p_next_attempt_at, now())
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    last_notified_at = clock_timestamp(),
    payload          = EXCLUDED.payload,
    resource_url     = coalesce(EXCLUDED.resource_url, e.resource_url),
    status           = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN 'pending'::public.wearable_event_status ELSE e.status END,
    attempts         = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN 0 ELSE e.attempts END,
    next_attempt_at  = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN EXCLUDED.next_attempt_at ELSE e.next_attempt_at END,
    last_error       = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN NULL ELSE e.last_error END
  RETURNING e.id, e.status, (e.status = 'pending' AND e.next_attempt_at <= now()) AS should_process;
$$;

-- Prend un événement en charge (pending et dû → processing). Aucune ligne si déjà pris.
CREATE OR REPLACE FUNCTION public.wearable_claim_event(p_id UUID)
RETURNS SETOF public.wearable_events
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.wearable_events
  SET status = 'processing', processing_started_at = clock_timestamp()
  WHERE id = p_id AND status = 'pending' AND next_attempt_at <= now()
  RETURNING *;
$$;

-- Termine un traitement. Si une notification est arrivée pendant le traitement
-- (last_notified_at > processing_started_at), l'événement repasse en pending
-- (attempts = 0) et la fonction renvoie requeued = true.
CREATE OR REPLACE FUNCTION public.wearable_finish_event(
  p_id            UUID,
  p_status        public.wearable_event_status,
  p_error         TEXT DEFAULT NULL,
  p_retry_at      TIMESTAMPTZ DEFAULT NULL,
  p_consultant_id UUID DEFAULT NULL
) RETURNS TABLE (requeued BOOLEAN, status public.wearable_event_status, attempts INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requeue BOOLEAN;
BEGIN
  IF p_status NOT IN ('done', 'failed', 'ignored', 'pending') THEN
    RAISE EXCEPTION 'statut final invalide : %', p_status;
  END IF;

  SELECT e.last_notified_at > e.processing_started_at INTO v_requeue
  FROM public.wearable_events e
  WHERE e.id = p_id AND e.status = 'processing'
  FOR UPDATE;

  IF v_requeue IS NULL THEN
    RAISE EXCEPTION 'événement % introuvable ou pas en cours de traitement', p_id;
  END IF;

  RETURN QUERY
  UPDATE public.wearable_events e SET
    status                = CASE WHEN v_requeue THEN 'pending'::public.wearable_event_status ELSE p_status END,
    attempts              = CASE WHEN v_requeue THEN 0
                                 WHEN p_status = 'failed' THEN e.attempts + 1
                                 ELSE e.attempts END,
    last_error            = CASE WHEN v_requeue OR p_status <> 'failed' THEN NULL ELSE p_error END,
    next_attempt_at       = CASE WHEN v_requeue THEN now() ELSE coalesce(p_retry_at, e.next_attempt_at) END,
    consultant_id         = coalesce(p_consultant_id, e.consultant_id),
    processed_at          = now(),
    processing_started_at = NULL
  WHERE e.id = p_id
  RETURNING v_requeue, e.status, e.attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.wearable_record_event(public.wearable_provider, TEXT, TEXT, DATE, TEXT, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wearable_claim_event(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wearable_finish_event(UUID, public.wearable_event_status, TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_record_event(public.wearable_provider, TEXT, TEXT, DATE, TEXT, JSONB, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.wearable_claim_event(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.wearable_finish_event(UUID, public.wearable_event_status, TEXT, TIMESTAMPTZ, UUID) TO service_role;
