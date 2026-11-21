-- =============================================================================
-- wearable_summaries et wearable_insights deviennent des VUES sur le pipeline Polar.
--
-- Contexte : la Revue du matin, la synthèse, le bilan visuel et les stats du dashboard
-- lisent encore wearable_summaries / wearable_insights (première version, jamais
-- alimentées par Polar). Le pipeline Polar écrit sleep_sessions, hrv_nightly,
-- daily_activity (migration 20261106). Résultat : ces écrans ne voyaient rien.
--
-- Ici :
--   1. les tables historiques sont renommées *_legacy (données conservées, RLS conservée) ;
--   2. wearable_summaries devient une vue : une ligne par consultant et par jour, calculée
--      depuis les tables Polar, complétée par les lignes legacy des consultants sans
--      donnée Polar ;
--   3. wearable_insights devient une vue : signaux « 4 des 7 dernières nuits hors de
--      l'habituel » (même règle que les points à aborder de l'engine), plus les lignes
--      legacy des consultants sans donnée Polar.
--
-- Les vues sont en security_invoker : la RLS des tables sous-jacentes s'applique
-- (praticien → ses consultants, consultant → lui-même). Lecture seule.
-- =============================================================================

-- 1. Tables historiques ---------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wearable_summaries') THEN
    ALTER TABLE public.wearable_summaries RENAME TO wearable_summaries_legacy;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wearable_insights') THEN
    ALTER TABLE public.wearable_insights RENAME TO wearable_insights_legacy;
  END IF;
END $$;

-- 2. wearable_summaries ---------------------------------------------------------
DROP VIEW IF EXISTS public.wearable_summaries;
CREATE VIEW public.wearable_summaries
WITH (security_invoker = true) AS
WITH polar AS (
  SELECT
    coalesce(s.consultant_id, h.consultant_id, a.consultant_id) AS consultant_id,
    coalesce(s.night_date, h.night_date, a.activity_date)      AS date,
    round((s.total_sleep_s / 3600.0)::numeric, 2)              AS sleep_duration,   -- heures
    s.sleep_score::numeric                                      AS sleep_score,      -- /100
    h.hrv_rmssd_avg_ms::numeric                                 AS hrv_avg,          -- ms
    -- Niveau d'activité /100 : 10 000 pas = 100.
    CASE WHEN a.steps IS NULL THEN NULL ELSE least(100, round(a.steps / 100.0))::numeric END AS activity_level,
    round(((CASE WHEN s.id IS NULL THEN 0 ELSE 1 END
          + CASE WHEN h.id IS NULL THEN 0 ELSE 1 END
          + CASE WHEN a.id IS NULL THEN 0 ELSE 1 END) / 3.0)::numeric, 2) AS completeness,
    least(coalesce(s.created_at, 'infinity'), coalesce(h.created_at, 'infinity'), coalesce(a.created_at, 'infinity')) AS created_at
  FROM public.sleep_sessions s
  FULL OUTER JOIN public.hrv_nightly h
    ON h.consultant_id = s.consultant_id AND h.provider = s.provider AND h.night_date = s.night_date
  FULL OUTER JOIN public.daily_activity a
    ON a.consultant_id = coalesce(s.consultant_id, h.consultant_id)
   AND a.provider = coalesce(s.provider, h.provider)
   AND a.activity_date = coalesce(s.night_date, h.night_date)
)
SELECT
  -- id stable (uuid v5-like) pour les clés React et les caches.
  md5('ws:' || consultant_id::text || ':' || date::text)::uuid AS id,
  consultant_id, date, sleep_duration, sleep_score, hrv_avg, activity_level, completeness, created_at
FROM polar
UNION ALL
-- Lignes historiques : les seeds de démo ont écrit des minutes, des pourcentages et des pas bruts.
-- On ramène tout aux unités attendues par les écrans : heures, score /100, niveau /100, complétude 0–1.
SELECT l.id, l.consultant_id, l.date,
       CASE WHEN l.sleep_duration > 24 THEN round(l.sleep_duration / 60.0, 2) ELSE l.sleep_duration END AS sleep_duration,
       l.sleep_score,
       l.hrv_avg,
       CASE WHEN l.activity_level > 100 THEN least(100, round(l.activity_level / 100.0)) ELSE l.activity_level END AS activity_level,
       CASE WHEN l.completeness > 1 THEN round(l.completeness / 100.0, 2) ELSE l.completeness END AS completeness,
       l.created_at
FROM public.wearable_summaries_legacy l
WHERE NOT EXISTS (SELECT 1 FROM polar p WHERE p.consultant_id = l.consultant_id);

COMMENT ON VIEW public.wearable_summaries IS
  'Vue de compatibilité : résumé quotidien calculé depuis sleep_sessions / hrv_nightly / daily_activity (Polar), '
  'complété par wearable_summaries_legacy pour les consultants sans donnée Polar. Lecture seule.';

-- 3. wearable_insights ----------------------------------------------------------
DROP VIEW IF EXISTS public.wearable_insights;
CREATE VIEW public.wearable_insights
WITH (security_invoker = true) AS
WITH days AS (
  -- Les 28 nuits d'habituel puis les 7 dernières, par consultant à connexion Polar.
  SELECT wc.consultant_id, d::date AS day
  FROM public.wearable_connections wc
  CROSS JOIN generate_series(CURRENT_DATE - 35, CURRENT_DATE - 1, interval '1 day') d
  WHERE wc.provider = 'polar' AND wc.status = 'active'
),
vals AS (
  SELECT d.consultant_id, d.day,
         CASE WHEN s.total_sleep_s >= 3 * 3600 THEN s.total_sleep_s / 60.0 END AS sleep_min,
         h.hrv_rmssd_avg_ms::numeric AS hrv,
         a.steps::numeric AS steps
  FROM days d
  LEFT JOIN public.sleep_sessions s ON s.consultant_id = d.consultant_id AND s.provider = 'polar' AND s.night_date = d.day
  LEFT JOIN public.hrv_nightly h ON h.consultant_id = d.consultant_id AND h.provider = 'polar' AND h.night_date = d.day
  LEFT JOIN public.daily_activity a ON a.consultant_id = d.consultant_id AND a.provider = 'polar' AND a.activity_date = d.day
),
metrics AS (
  SELECT consultant_id, 'sleep'::text AS type, day, sleep_min AS v FROM vals
  UNION ALL SELECT consultant_id, 'hrv', day, hrv FROM vals
  UNION ALL SELECT consultant_id, 'activity', day, steps FROM vals
),
base AS (
  SELECT consultant_id, type, avg(v) AS mean, stddev_samp(v) AS sd, count(v) AS n
  FROM metrics WHERE day < CURRENT_DATE - 7 GROUP BY consultant_id, type
),
recent AS (
  SELECT m.consultant_id, m.type,
         count(m.v) FILTER (WHERE m.v < b.mean - b.sd) AS below,
         count(m.v) FILTER (WHERE m.v > b.mean + b.sd) AS above,
         b.mean, b.sd, b.n
  FROM metrics m JOIN base b ON b.consultant_id = m.consultant_id AND b.type = m.type
  WHERE m.day >= CURRENT_DATE - 7
  GROUP BY m.consultant_id, m.type, b.mean, b.sd, b.n
),
signals AS (
  SELECT consultant_id, type,
         CASE WHEN below >= 4 THEN -1 ELSE 1 END AS side, greatest(below, above) AS nights
  FROM recent
  WHERE n >= 7 AND sd > 0 AND (below >= 4 OR above >= 4)
)
SELECT
  md5('wi:' || consultant_id || ':' || type || ':' || side::text || ':' || (CURRENT_DATE - 1)::text)::uuid AS id,
  consultant_id,
  type,
  -- « attention » quand la variation va dans le mauvais sens (sommeil / VFC / activité en baisse).
  CASE WHEN side < 0 THEN 'attention' ELSE 'info' END AS level,
  CASE type
    WHEN 'sleep'    THEN CASE WHEN side < 0 THEN 'Sommeil en dessous de son habituel ' ELSE 'Sommeil au-dessus de son habituel ' END
    WHEN 'hrv'      THEN CASE WHEN side < 0 THEN 'VFC nocturne en dessous de son habituel ' ELSE 'VFC nocturne au-dessus de son habituel ' END
    ELSE                 CASE WHEN side < 0 THEN 'Activité en dessous de son habituel ' ELSE 'Activité au-dessus de son habituel ' END
  END || nights || ' nuits sur les 7 dernières.' AS message,
  CASE WHEN side < 0 THEN 'À aborder en séance : voir l’onglet Objet connecté.' ELSE NULL END AS suggested_action,
  (CURRENT_DATE - 1)::timestamptz AS created_at
FROM signals
UNION ALL
SELECT l.id, l.consultant_id, l.type, l.level, l.message, l.suggested_action, l.created_at
FROM public.wearable_insights_legacy l
WHERE NOT EXISTS (
  SELECT 1 FROM public.wearable_connections wc WHERE wc.consultant_id = l.consultant_id AND wc.provider = 'polar'
);

COMMENT ON VIEW public.wearable_insights IS
  'Vue de compatibilité : signaux « 4 des 7 dernières nuits hors de l''habituel (28 nuits) » calculés depuis les tables Polar, '
  'complétés par wearable_insights_legacy pour les consultants sans connexion Polar. Lecture seule.';

-- 4. Droits ---------------------------------------------------------------------
GRANT SELECT ON public.wearable_summaries, public.wearable_insights TO authenticated, service_role;
