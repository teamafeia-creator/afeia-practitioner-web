-- POL-15 · Séries quotidiennes prêtes à afficher (lecture agrégée).
--
-- wearable_daily_summary(consultant, jours) renvoie une ligne par jour civil Europe/Paris,
-- du plus ancien au plus récent, jusqu'à p_today inclus. Jour sans donnée → NULL (jamais 0).
--   sleep_min      : sleep_sessions.total_sleep_s / 60, nuit rattachée au jour du réveil (night_date)
--   hrv_ms         : hrv_nightly.hrv_rmssd_avg_ms (VFC nocturne, RMSSD)
--   resting_hr_bpm : hrv_nightly.hr_avg_bpm (FC nocturne) ; à défaut, la plus basse FC continue
--                    à 5 min du jour civil (hr_samples, découpé en Europe/Paris)
--   steps          : daily_activity.steps
-- Plusieurs fournisseurs le même jour : moyenne (sommeil, VFC, FC), maximum (pas).
--
-- SECURITY INVOKER : la RLS des tables normalisées (POL-12) s'applique. Un appelant sans lien
-- avec le consultant (praticien d'un autre, anon, service_role sans session) reçoit 0 ligne,
-- et non une série de jours vides.

CREATE OR REPLACE FUNCTION public.wearable_daily_summary(
  p_consultant_id UUID,
  p_days          INTEGER,
  p_today         DATE DEFAULT NULL,
  p_timezone      TEXT DEFAULT 'Europe/Paris'
) RETURNS TABLE (
  day            DATE,
  sleep_min      INTEGER,
  hrv_ms         INTEGER,
  resting_hr_bpm INTEGER,
  steps          INTEGER
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
  hr AS (
    -- Bornes en instants : minuit Europe/Paris du premier jour → minuit du lendemain du dernier.
    SELECT (x.recorded_at AT TIME ZONE p_timezone)::date AS day, min(x.hr_bpm)::int AS min_hr_bpm
    FROM public.hr_samples x, bounds
    WHERE x.consultant_id = p_consultant_id
      AND x.recorded_at >= (bounds.first_day::timestamp AT TIME ZONE p_timezone)
      AND x.recorded_at <  ((bounds.last_day + 1)::timestamp AT TIME ZONE p_timezone)
    GROUP BY 1
  ),
  activity AS (
    SELECT a.activity_date AS day, max(a.steps)::int AS steps
    FROM public.daily_activity a, bounds
    WHERE a.consultant_id = p_consultant_id AND a.activity_date BETWEEN bounds.first_day AND bounds.last_day
    GROUP BY a.activity_date
  )
  SELECT d.day, sleep.sleep_min, hrv.hrv_ms, coalesce(hrv.night_hr_bpm, hr.min_hr_bpm), activity.steps
  FROM days d
  LEFT JOIN sleep USING (day)
  LEFT JOIN hrv USING (day)
  LEFT JOIN hr USING (day)
  LEFT JOIN activity USING (day)
  ORDER BY d.day;
$$;

COMMENT ON FUNCTION public.wearable_daily_summary(UUID, INTEGER, DATE, TEXT) IS
  'Séries quotidiennes (sommeil, VFC, FC de repos, pas) d''un consultant, jours Europe/Paris, NULL sans donnée ; RLS appliquée.';

REVOKE ALL ON FUNCTION public.wearable_daily_summary(UUID, INTEGER, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wearable_daily_summary(UUID, INTEGER, DATE, TEXT) TO authenticated, service_role;
