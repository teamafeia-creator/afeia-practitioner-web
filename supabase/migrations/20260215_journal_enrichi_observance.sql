-- Migration: Journal enrichi, Transit Bristol & Observance du conseillancier
-- Date: 2026-02-15
-- Stratégie: enrichir journal_entries en place + nouvelles tables indicateurs et observance

-- ============================================================
-- 1. Enrichir journal_entries avec les nouvelles colonnes
-- ============================================================

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS practitioner_id UUID REFERENCES practitioners(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS stress_level INTEGER;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS energy_level INTEGER;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS bristol_type INTEGER;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS bristol_frequency INTEGER;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS transit_notes TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS hydration_liters NUMERIC(3,1);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS hydration_type TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS hydration_notes TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS exercise_type TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS exercise_duration_minutes INTEGER;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS exercise_intensity TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS exercise_notes TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS custom_indicators JSONB DEFAULT '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'consultant';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add CHECK constraints via DO blocks to be idempotent
DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT chk_sleep_quality CHECK (sleep_quality BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT chk_stress_level CHECK (stress_level BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT chk_energy_level CHECK (energy_level BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT chk_bristol_type CHECK (bristol_type BETWEEN 1 AND 7);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT chk_bristol_frequency CHECK (bristol_frequency >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT chk_exercise_intensity CHECK (exercise_intensity IN ('leger', 'modere', 'intense'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT chk_source CHECK (source IN ('practitioner', 'consultant', 'mobile'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. UNIQUE constraint on (consultant_id, date) — deduplicate first
-- ============================================================

-- Remove duplicates: keep most recent entry per (consultant_id, date)
DO $$ BEGIN
  DELETE FROM journal_entries
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY consultant_id, date ORDER BY created_at DESC) AS rn
      FROM journal_entries
    ) sub
    WHERE sub.rn > 1
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_consultant_date_unique UNIQUE (consultant_id, date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. Backfill practitioner_id from consultants table
-- ============================================================

UPDATE journal_entries
SET practitioner_id = c.practitioner_id
FROM consultants c
WHERE journal_entries.consultant_id = c.id
  AND journal_entries.practitioner_id IS NULL;

-- ============================================================
-- 4. Table: consultant_journal_indicators
-- ============================================================

CREATE TABLE IF NOT EXISTS consultant_journal_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'boolean',
  unit TEXT,
  target_value TEXT,
  source_plan_id UUID REFERENCES consultant_plans(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE consultant_journal_indicators ADD CONSTRAINT chk_indicator_category
    CHECK (category IN ('hydratation', 'alimentation', 'respiration', 'mouvement', 'phytotherapie', 'complement', 'sommeil', 'custom'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE consultant_journal_indicators ADD CONSTRAINT chk_indicator_value_type
    CHECK (value_type IN ('boolean', 'number', 'scale_1_5', 'text'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_journal_indicators_consultant_active
  ON consultant_journal_indicators(consultant_id, is_active);

-- ============================================================
-- 5. Table: plan_observance_items
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_observance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_plan_id UUID NOT NULL REFERENCES consultant_plans(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  weekly_target INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE plan_observance_items ADD CONSTRAINT chk_observance_category
    CHECK (category IN ('alimentation', 'hydratation', 'phytotherapie', 'complement', 'aromatologie', 'hydrologie', 'activite', 'respiration', 'sommeil', 'equilibre_psycho', 'technique_manuelle', 'autre'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE plan_observance_items ADD CONSTRAINT chk_observance_frequency
    CHECK (frequency IN ('daily', 'weekly', 'as_needed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. Table: plan_observance_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_observance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observance_item_id UUID NOT NULL REFERENCES plan_observance_items(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE plan_observance_logs ADD CONSTRAINT observance_logs_item_date_unique
    UNIQUE (observance_item_id, date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_observance_logs_consultant_date
  ON plan_observance_logs(consultant_id, date);

CREATE INDEX IF NOT EXISTS idx_observance_logs_item_date
  ON plan_observance_logs(observance_item_id, date);

-- ============================================================
-- 7. RLS Policies
-- ============================================================

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_journal_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_observance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_observance_logs ENABLE ROW LEVEL SECURITY;

-- journal_entries policies
DROP POLICY IF EXISTS journal_entries_practitioner_select ON journal_entries;
CREATE POLICY journal_entries_practitioner_select ON journal_entries
  FOR SELECT USING (auth.uid() = practitioner_id);

DROP POLICY IF EXISTS journal_entries_practitioner_insert ON journal_entries;
CREATE POLICY journal_entries_practitioner_insert ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

DROP POLICY IF EXISTS journal_entries_practitioner_update ON journal_entries;
CREATE POLICY journal_entries_practitioner_update ON journal_entries
  FOR UPDATE USING (auth.uid() = practitioner_id);

DROP POLICY IF EXISTS journal_entries_consultant_select ON journal_entries;
CREATE POLICY journal_entries_consultant_select ON journal_entries
  FOR SELECT USING (auth.uid() = consultant_id);

DROP POLICY IF EXISTS journal_entries_consultant_insert ON journal_entries;
CREATE POLICY journal_entries_consultant_insert ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = consultant_id);

DROP POLICY IF EXISTS journal_entries_consultant_update ON journal_entries;
CREATE POLICY journal_entries_consultant_update ON journal_entries
  FOR UPDATE USING (auth.uid() = consultant_id);

-- consultant_journal_indicators policies (practitioner only)
DROP POLICY IF EXISTS journal_indicators_practitioner_all ON consultant_journal_indicators;
CREATE POLICY journal_indicators_practitioner_all ON consultant_journal_indicators
  FOR ALL USING (auth.uid() = practitioner_id);

-- plan_observance_items policies
DROP POLICY IF EXISTS observance_items_practitioner_all ON plan_observance_items;
CREATE POLICY observance_items_practitioner_all ON plan_observance_items
  FOR ALL USING (auth.uid() = practitioner_id);

DROP POLICY IF EXISTS observance_items_consultant_select ON plan_observance_items;
CREATE POLICY observance_items_consultant_select ON plan_observance_items
  FOR SELECT USING (auth.uid() = consultant_id);

-- plan_observance_logs policies
DROP POLICY IF EXISTS observance_logs_consultant_all ON plan_observance_logs;
CREATE POLICY observance_logs_consultant_all ON plan_observance_logs
  FOR ALL USING (auth.uid() = consultant_id);

DROP POLICY IF EXISTS observance_logs_practitioner_select ON plan_observance_logs;
CREATE POLICY observance_logs_practitioner_select ON plan_observance_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_observance_items poi
      WHERE poi.id = plan_observance_logs.observance_item_id
        AND poi.practitioner_id = auth.uid()
    )
  );

-- ============================================================
-- 8. Retrocompatibility: create default indicators for existing adherence data
-- ============================================================

DO $$ BEGIN
  INSERT INTO consultant_journal_indicators (consultant_id, practitioner_id, label, category, value_type, sort_order)
  SELECT DISTINCT je.consultant_id, c.practitioner_id, 'Hydratation', 'hydratation', 'boolean', 1
  FROM journal_entries je
  JOIN consultants c ON je.consultant_id = c.id
  WHERE je.adherence_hydratation IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM consultant_journal_indicators cji
      WHERE cji.consultant_id = je.consultant_id AND cji.label = 'Hydratation' AND cji.category = 'hydratation'
    );

  INSERT INTO consultant_journal_indicators (consultant_id, practitioner_id, label, category, value_type, sort_order)
  SELECT DISTINCT je.consultant_id, c.practitioner_id, 'Respiration', 'respiration', 'boolean', 2
  FROM journal_entries je
  JOIN consultants c ON je.consultant_id = c.id
  WHERE je.adherence_respiration IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM consultant_journal_indicators cji
      WHERE cji.consultant_id = je.consultant_id AND cji.label = 'Respiration' AND cji.category = 'respiration'
    );

  INSERT INTO consultant_journal_indicators (consultant_id, practitioner_id, label, category, value_type, sort_order)
  SELECT DISTINCT je.consultant_id, c.practitioner_id, 'Mouvement', 'mouvement', 'boolean', 3
  FROM journal_entries je
  JOIN consultants c ON je.consultant_id = c.id
  WHERE je.adherence_mouvement IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM consultant_journal_indicators cji
      WHERE cji.consultant_id = je.consultant_id AND cji.label = 'Mouvement' AND cji.category = 'mouvement'
    );

  INSERT INTO consultant_journal_indicators (consultant_id, practitioner_id, label, category, value_type, sort_order)
  SELECT DISTINCT je.consultant_id, c.practitioner_id, 'Plantes', 'phytotherapie', 'boolean', 4
  FROM journal_entries je
  JOIN consultants c ON je.consultant_id = c.id
  WHERE je.adherence_plantes IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM consultant_journal_indicators cji
      WHERE cji.consultant_id = je.consultant_id AND cji.label = 'Plantes' AND cji.category = 'phytotherapie'
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Retrocompatibility indicators migration skipped: %', SQLERRM;
END $$;
