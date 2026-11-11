-- Objet connecté, phase 2 : récap planifié, coches par l'objet, points épinglés, objectifs reliés à une mesure.
-- Règles : lib/wearables/insights (validées sur la maquette du 11 novembre 2026).

-- 1. Réglage du récap, par consultant (« Me le proposer régulièrement »).
--    frequency : 1d chaque jour · 1w chaque semaine · 2w toutes les 2 semaines · 1m chaque mois
--    weekdays  : jours ISO cochés (1 = lundi … 7 = dimanche). En « 1m » : le premier de ces jours du mois.
--    anchor    : semaine de référence pour « toutes les 2 semaines ».
CREATE TABLE IF NOT EXISTS public.wearable_recap_settings (
  consultant_id   UUID PRIMARY KEY REFERENCES public.consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  frequency       TEXT NOT NULL DEFAULT '1w' CHECK (frequency IN ('1d', '1w', '2w', '1m')),
  weekdays        SMALLINT[] NOT NULL DEFAULT '{1}' CHECK (cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]),
  anchor          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wearable_recap_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wearable_recap_settings_own ON public.wearable_recap_settings;
CREATE POLICY wearable_recap_settings_own ON public.wearable_recap_settings
  FOR ALL TO authenticated
  USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid() AND consultant_id IN (SELECT public.auth_practitioner_consultant_ids()));

-- 2. Récaps préparés (brouillons) et envoyés.
--    status : draft (à valider) · sent · skipped (« Pas cette fois ») · expired (remplacé)
--             · nothing (rien à encourager) · not_enough (pas assez de nuits : rappel de port proposé)
CREATE TABLE IF NOT EXISTS public.wearable_recaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id   UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  frequency       TEXT NOT NULL CHECK (frequency IN ('1d', '1w', '2w', '1m')),
  prepared_for    DATE NOT NULL,
  period_from     DATE NOT NULL,
  period_to       DATE NOT NULL,
  valid_until     DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'skipped', 'expired', 'nothing', 'not_enough')),
  -- Points proposés : [{ id, label, why, checked }]
  options         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Points retenus à l'envoi et variante de phrase utilisée (pour ne pas la reprendre la fois suivante).
  points          TEXT[] NOT NULL DEFAULT '{}',
  variants        JSONB NOT NULL DEFAULT '{}'::jsonb,
  body            TEXT,
  message_id      UUID,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wearable_recaps_once UNIQUE (consultant_id, prepared_for)
);
CREATE INDEX IF NOT EXISTS idx_wearable_recaps_practitioner ON public.wearable_recaps (practitioner_id, status, valid_until);
ALTER TABLE public.wearable_recaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wearable_recaps_own ON public.wearable_recaps;
CREATE POLICY wearable_recaps_own ON public.wearable_recaps
  FOR ALL TO authenticated
  USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid() AND consultant_id IN (SELECT public.auth_practitioner_consultant_ids()));

-- 3. Coches par l'objet.
--    auto_check : activé par le praticien, item par item (désactivé par défaut).
--    source     : qui a coché. La saisie du consultant a toujours priorité : l'objet n'écrit
--                 que là où aucune coche n'existe encore pour ce jour.
ALTER TABLE public.plan_observance_items ADD COLUMN IF NOT EXISTS auto_check BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.plan_observance_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'consultant';
DO $$ BEGIN
  ALTER TABLE public.plan_observance_logs ADD CONSTRAINT plan_observance_logs_source_check CHECK (source IN ('consultant', 'object'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Points épinglés pour la prochaine séance (« À aborder », onglet Rendez-vous).
CREATE TABLE IF NOT EXISTS public.consultant_session_topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id   UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  text            TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  detail          TEXT,
  source          TEXT NOT NULL DEFAULT 'wearable' CHECK (source IN ('wearable', 'practitioner')),
  source_key      TEXT,
  done_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_topics_consultant ON public.consultant_session_topics (consultant_id, done_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_topics_open_key
  ON public.consultant_session_topics (consultant_id, source_key) WHERE done_at IS NULL AND source_key IS NOT NULL;
ALTER TABLE public.consultant_session_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consultant_session_topics_own ON public.consultant_session_topics;
CREATE POLICY consultant_session_topics_own ON public.consultant_session_topics
  FOR ALL TO authenticated
  USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid() AND consultant_id IN (SELECT public.auth_practitioner_consultant_ids()));

-- 5. Objectifs reliés à une mesure de l'objet.
ALTER TABLE public.consultant_goals ADD COLUMN IF NOT EXISTS metric TEXT;
DO $$ BEGIN
  ALTER TABLE public.consultant_goals ADD CONSTRAINT consultant_goals_metric_check CHECK (metric IS NULL OR metric IN ('sleep', 'hrv', 'hr', 'steps'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
