-- POL-16 (corrections) · FC nocturne et connexion interrompue.
--
-- 1. wearable_daily_summary : la colonne « FC » devient night_hr_bpm = hrv_nightly.hr_avg_bpm
--    (FC moyenne de la nuit, Nightly Recharge), SANS repli sur la FC continue de la journée
--    (une FC de jour affichée sous le libellé « FC nocturne » serait trompeuse).
-- 2. wearable_connections.interrupted_at : date à laquelle la connexion est passée en
--    error ou revoked (première fois) ; NULL quand elle est de nouveau active.
--    Exposée dans wearable_connection_overview pour le bandeau « connexion interrompue ».

ALTER TABLE public.wearable_connections ADD COLUMN IF NOT EXISTS interrupted_at TIMESTAMPTZ;

-- Connexions déjà interrompues : meilleure estimation disponible.
UPDATE public.wearable_connections
SET interrupted_at = updated_at
WHERE status IN ('error', 'revoked') AND interrupted_at IS NULL;

GRANT SELECT (interrupted_at) ON public.wearable_connections TO authenticated;

CREATE OR REPLACE VIEW public.wearable_connection_overview
WITH (security_invoker = true) AS
  SELECT id, consultant_id, provider, status, connected_at, last_sync_at, last_error, token_expires_at,
         backfill_status, backfill_cursor, interrupted_at
  FROM public.wearable_connections;

REVOKE ALL ON public.wearable_connection_overview FROM PUBLIC, anon;
GRANT SELECT ON public.wearable_connection_overview TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- (Re)connexion : interrupted_at remis à NULL (même fonction que 20261108, + 1 colonne).
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
    backfill_updated_at    = NULL,
    -- POL-16 : la connexion n'est plus interrompue.
    interrupted_at         = NULL
  RETURNING wc.id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Révocation : interrupted_at renseigné (même fonction que 20261101, + 1 colonne).
-- ---------------------------------------------------------------------------
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
  SET status = 'revoked', access_token_secret_id = NULL, updated_at = now(),
      interrupted_at = coalesce(interrupted_at, now())
  WHERE consultant_id = p_consultant_id AND provider = p_provider;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Séries quotidiennes : FC nocturne seule (le type de retour change → DROP puis CREATE).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.wearable_daily_summary(UUID, INTEGER, DATE, TEXT);

CREATE FUNCTION public.wearable_daily_summary(
  p_consultant_id UUID,
  p_days          INTEGER,
  p_today         DATE DEFAULT NULL,
  p_timezone      TEXT DEFAULT 'Europe/Paris'
) RETURNS TABLE (
  day          DATE,
  sleep_min    INTEGER,
  hrv_ms       INTEGER,
  night_hr_bpm INTEGER,
  steps        INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH bounds AS (
    SELECT
      coalesce(p_today, (now() AT TIME ZONE p_timezone)::date) AS last_day,
      coalesce(p_today, (now() AT TIME ZONE p_timezone)::date) - (greatest(p_days, 1) - 1) AS first_day
  ),
  allowed AS (
    SELECT 1
    WHERE p_consultant_id IN (SELECT public.auth_practitioner_consultant_ids())
       OR p_consultant_id IN (SELECT public.auth_self_consultant_ids())
  ),
  days AS (
    SELECT d::date AS day
    FROM bounds, allowed, generate_series(bounds.first_day, bounds.last_day, interval '1 day') AS d
  ),
  sleep AS (
    SELECT s.night_date AS day, round(avg(s.total_sleep_s) / 60.0)::int AS sleep_min
    FROM public.sleep_sessions s, bounds
    WHERE s.consultant_id = p_consultant_id AND s.night_date BETWEEN bounds.first_day AND bounds.last_day
    GROUP BY s.night_date
  ),
  hrv AS (
    SELECT h.night_date AS day,
           round(avg(h.hrv_rmssd_avg_ms))::int AS hrv_ms,
           round(avg(h.hr_avg_bpm))::int AS night_hr_bpm
    FROM public.hrv_nightly h, bounds
    WHERE h.consultant_id = p_consultant_id AND h.night_date BETWEEN bounds.first_day AND bounds.last_day
    GROUP BY h.night_date
  ),
  activity AS (
    SELECT a.activity_date AS day, max(a.steps)::int AS steps
    FROM public.daily_activity a, bounds
    WHERE a.consultant_id = p_consultant_id AND a.activity_date BETWEEN bounds.first_day AND bounds.last_day
    GROUP BY a.activity_date
  )
  SELECT d.day, sleep.sleep_min, hrv.hrv_ms, hrv.night_hr_bpm, activity.steps
  FROM days d
  LEFT JOIN sleep USING (day)
  LEFT JOIN hrv USING (day)
  LEFT JOIN activity USING (day)
  ORDER BY d.day;
$$;

COMMENT ON FUNCTION public.wearable_daily_summary(UUID, INTEGER, DATE, TEXT) IS
  'Séries quotidiennes (sommeil, VFC nocturne, FC nocturne, pas) d''un consultant, jours Europe/Paris, NULL sans donnée ; RLS appliquée.';

REVOKE ALL ON FUNCTION public.wearable_daily_summary(UUID, INTEGER, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wearable_daily_summary(UUID, INTEGER, DATE, TEXT) TO authenticated, service_role;
