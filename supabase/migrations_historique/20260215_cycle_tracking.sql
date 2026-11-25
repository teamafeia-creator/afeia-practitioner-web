-- ============================================
-- Cycle Tracking: cycle_profiles & cycle_entries
-- ============================================

-- Configuration du suivi du cycle par consultant (une ligne max par consultant)
CREATE TABLE IF NOT EXISTS cycle_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL UNIQUE REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL,
  is_tracking   BOOLEAN NOT NULL DEFAULT FALSE,
  average_cycle_length  INTEGER NOT NULL DEFAULT 28 CHECK (average_cycle_length BETWEEN 21 AND 45),
  average_period_length INTEGER NOT NULL DEFAULT 5  CHECK (average_period_length BETWEEN 2 AND 8),
  cycle_regularity TEXT NOT NULL DEFAULT 'regular'
    CHECK (cycle_regularity IN ('regular', 'somewhat_irregular', 'irregular', 'absent')),
  contraception TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logs quotidiens du cycle (un par jour par consultant)
CREATE TABLE IF NOT EXISTS cycle_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  UNIQUE (consultant_id, date),

  -- Règles
  is_period       BOOLEAN NOT NULL DEFAULT FALSE,
  flow_intensity  TEXT CHECK (flow_intensity IN ('spotting', 'light', 'medium', 'heavy')),
  period_pain     INTEGER CHECK (period_pain BETWEEN 0 AND 10),

  -- Symptômes (13 colonnes booléennes)
  symptom_cramps            BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_bloating          BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_headache          BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_breast_tenderness BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_mood_swings       BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_fatigue           BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_acne              BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_cravings          BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_insomnia          BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_water_retention   BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_back_pain         BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_nausea            BOOLEAN NOT NULL DEFAULT FALSE,
  symptom_libido_high       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Glaire cervicale
  symptom_cervical_mucus TEXT CHECK (symptom_cervical_mucus IN ('dry', 'sticky', 'creamy', 'egg_white', 'watery')),

  -- Température basale
  temperature NUMERIC(4,2),

  -- Méta
  notes       TEXT,
  source      TEXT NOT NULL DEFAULT 'consultant' CHECK (source IN ('consultant', 'practitioner')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_cycle_entries_consultant_date
  ON cycle_entries (consultant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_cycle_profiles_consultant
  ON cycle_profiles (consultant_id);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE cycle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_entries  ENABLE ROW LEVEL SECURITY;

-- Praticien : accès via la FK consultants.practitioner_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cycle_profiles_practitioner_all') THEN
    CREATE POLICY cycle_profiles_practitioner_all ON cycle_profiles
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM consultants c
          WHERE c.id = cycle_profiles.consultant_id
            AND c.practitioner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM consultants c
          WHERE c.id = cycle_profiles.consultant_id
            AND c.practitioner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cycle_entries_practitioner_all') THEN
    CREATE POLICY cycle_entries_practitioner_all ON cycle_entries
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM consultants c
          WHERE c.id = cycle_entries.consultant_id
            AND c.practitioner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM consultants c
          WHERE c.id = cycle_entries.consultant_id
            AND c.practitioner_id = auth.uid()
        )
      );
  END IF;
END $$;
