-- ============================================================
-- MIGRATION AFEIA V1+V2 : Filtres, Stats, Contre-indications
-- Adapted to actual DB schema (consultants, consultant_plans, etc.)
-- ============================================================

-- 1. Colonne main_concern sur consultants (motif principal, pour filtres)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultants' AND column_name='main_concern') THEN
    ALTER TABLE public.consultants ADD COLUMN main_concern TEXT;
  END IF;
END $$;

-- 2. Table saved_views (vues sauvegardees — V2)
CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  sort_by TEXT DEFAULT 'name',
  sort_order TEXT DEFAULT 'asc',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_practitioner ON public.saved_views(practitioner_id);

-- 3. Tables contre-indications (V2)
CREATE TABLE IF NOT EXISTS public.substances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('plante', 'complement', 'huile_essentielle', 'autre')),
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('etat_physiologique', 'pathologie', 'traitement_medicamenteux', 'allergie')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contraindication_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id UUID NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES public.conditions(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message_fr TEXT NOT NULL,
  recommendation_fr TEXT,
  source TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(substance_id, condition_id)
);

CREATE TABLE IF NOT EXISTS public.substance_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_a_id UUID NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  substance_b_id UUID NOT NULL REFERENCES public.substances(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message_fr TEXT NOT NULL,
  recommendation_fr TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (substance_a_id < substance_b_id)
);

CREATE TABLE IF NOT EXISTS public.contraindication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  consultant_plan_id UUID REFERENCES public.consultant_plans(id) ON DELETE SET NULL,
  rule_id UUID,
  rule_type TEXT CHECK (rule_type IN ('condition', 'interaction')),
  severity TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contraindication_logs_practitioner ON public.contraindication_logs(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_contraindication_logs_plan ON public.contraindication_logs(consultant_plan_id);

-- 4. Vue pour la liste consultants avec metadonnees agregees
-- Utilisee pour les filtres — filtrage cote client sur cette vue
CREATE OR REPLACE VIEW public.consultant_list_view AS
SELECT
  c.id,
  c.name,
  c.full_name,
  c.first_name,
  c.last_name,
  c.email,
  c.city,
  c.age,
  c.is_premium,
  c.status,
  c.main_concern,
  c.consultation_reason,
  c.practitioner_id,
  c.created_at,
  c.activated,
  c.deleted_at,
  MAX(je.created_at) AS last_journal_entry,
  COUNT(DISTINCT je.id) FILTER (WHERE je.created_at > NOW() - INTERVAL '7 days') AS journal_entries_last_7d,
  COUNT(DISTINCT je.id) FILTER (WHERE je.created_at > NOW() - INTERVAL '30 days') AS journal_entries_last_30d,
  MIN(a.starts_at) FILTER (WHERE a.starts_at > NOW() AND a.status = 'scheduled') AS next_appointment,
  cp.status AS plan_status,
  cp.updated_at AS plan_updated_at,
  COUNT(DISTINCT con.id) AS total_sessions,
  MAX(con.date) AS last_consultation_date,
  MAX(a2.starts_at) FILTER (WHERE a2.status IN ('completed', 'done')) AS last_appointment_date
FROM consultants c
LEFT JOIN journal_entries je ON je.consultant_id = c.id
LEFT JOIN appointments a ON a.consultant_id = c.id
LEFT JOIN LATERAL (
  SELECT status, updated_at FROM consultant_plans
  WHERE consultant_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) cp ON true
LEFT JOIN consultations con ON con.consultant_id = c.id
LEFT JOIN appointments a2 ON a2.consultant_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.full_name, c.first_name, c.last_name, c.email, c.city, c.age,
         c.is_premium, c.status, c.main_concern, c.consultation_reason,
         c.practitioner_id, c.created_at, c.activated, c.deleted_at, cp.status, cp.updated_at;

-- 5. RLS policies pour les nouvelles tables
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contraindication_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substance_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contraindication_logs ENABLE ROW LEVEL SECURITY;

-- Saved views : chaque praticien gere ses vues
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'saved_views_practitioner') THEN
    CREATE POLICY "saved_views_practitioner" ON public.saved_views
      FOR ALL USING (practitioner_id = auth.uid());
  END IF;
END $$;

-- Substances et conditions : lecture pour tous les praticiens authentifies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'substances_read') THEN
    CREATE POLICY "substances_read" ON public.substances
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conditions_read') THEN
    CREATE POLICY "conditions_read" ON public.conditions
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contraindication_rules_read') THEN
    CREATE POLICY "contraindication_rules_read" ON public.contraindication_rules
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'substance_interactions_read') THEN
    CREATE POLICY "substance_interactions_read" ON public.substance_interactions
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Logs : le praticien voit ses propres logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contraindication_logs_practitioner') THEN
    CREATE POLICY "contraindication_logs_practitioner" ON public.contraindication_logs
      FOR ALL USING (practitioner_id = auth.uid());
  END IF;
END $$;

-- 6. Fonction RPC pour les statistiques du praticien
-- Adapted to actual table names: consultants, consultant_plans, consultations, journal_entries, invoices
CREATE OR REPLACE FUNCTION public.get_practitioner_stats(
  p_practitioner_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'sessions_count', (
      SELECT COUNT(*) FROM consultations con
      JOIN consultants c ON c.id = con.consultant_id
      WHERE c.practitioner_id = p_practitioner_id
      AND con.created_at BETWEEN p_period_start AND p_period_end
    ),
    'new_consultants', (
      SELECT COUNT(*) FROM consultants
      WHERE practitioner_id = p_practitioner_id
      AND deleted_at IS NULL
      AND created_at BETWEEN p_period_start AND p_period_end
    ),
    'active_consultants', (
      SELECT COUNT(DISTINCT je.consultant_id) FROM journal_entries je
      JOIN consultants c ON je.consultant_id = c.id
      WHERE c.practitioner_id = p_practitioner_id
      AND c.deleted_at IS NULL
      AND je.created_at > NOW() - INTERVAL '7 days'
    ),
    'total_consultants', (
      SELECT COUNT(*) FROM consultants
      WHERE practitioner_id = p_practitioner_id
      AND activated = true
      AND deleted_at IS NULL
    ),
    'retention_rate', (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
          COUNT(*) FILTER (WHERE session_count > 1)::NUMERIC / COUNT(*)::NUMERIC * 100,
          1
        )
      END
      FROM (
        SELECT c.id, COUNT(con.id) AS session_count
        FROM consultants c
        LEFT JOIN consultations con ON con.consultant_id = c.id
        WHERE c.practitioner_id = p_practitioner_id
        AND c.deleted_at IS NULL
        GROUP BY c.id
      ) sub
    ),
    'avg_journal_fill_rate', (
      SELECT COALESCE(ROUND(AVG(fill_rate), 1), 0)
      FROM (
        SELECT c.id,
          COUNT(DISTINCT je.date) FILTER (WHERE je.created_at > NOW() - INTERVAL '30 days')::NUMERIC / 30 * 100 AS fill_rate
        FROM consultants c
        LEFT JOIN journal_entries je ON je.consultant_id = c.id
        WHERE c.practitioner_id = p_practitioner_id AND c.activated = true AND c.deleted_at IS NULL
        GROUP BY c.id
      ) sub
    ),
    'revenue', (
      SELECT COALESCE(SUM(i.amount_total), 0) FROM invoices i
      WHERE i.practitioner_id = p_practitioner_id
      AND i.status = 'paid'
      AND i.created_at BETWEEN p_period_start AND p_period_end
    ),
    'sessions_by_week', (
      SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json)
      FROM (
        SELECT
          date_trunc('week', con.created_at)::date AS week_start,
          COUNT(*) AS count
        FROM consultations con
        JOIN consultants c ON c.id = con.consultant_id
        WHERE c.practitioner_id = p_practitioner_id
        AND con.created_at > NOW() - INTERVAL '12 weeks'
        GROUP BY date_trunc('week', con.created_at)
        ORDER BY week_start
      ) sub
    ),
    'revenue_by_month', (
      SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json)
      FROM (
        SELECT
          date_trunc('month', i.created_at)::date AS month_start,
          SUM(i.amount_total) AS total
        FROM invoices i
        WHERE i.practitioner_id = p_practitioner_id
        AND i.status = 'paid'
        AND i.created_at > NOW() - INTERVAL '12 months'
        GROUP BY date_trunc('month', i.created_at)
        ORDER BY month_start
      ) sub
    ),
    'care_plans_count', (
      SELECT COUNT(*) FROM consultant_plans
      WHERE practitioner_id = p_practitioner_id
      AND created_at BETWEEN p_period_start AND p_period_end
    ),
    'care_plans_shared', (
      SELECT COUNT(*) FROM consultant_plans
      WHERE practitioner_id = p_practitioner_id
      AND status = 'shared'
      AND created_at BETWEEN p_period_start AND p_period_end
    ),
    'top_concerns', (
      SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json)
      FROM (
        SELECT COALESCE(main_concern, consultation_reason) AS concern, COUNT(*) AS count
        FROM consultants
        WHERE practitioner_id = p_practitioner_id
        AND COALESCE(main_concern, consultation_reason) IS NOT NULL
        AND deleted_at IS NULL
        GROUP BY COALESCE(main_concern, consultation_reason)
        ORDER BY count DESC
        LIMIT 6
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
