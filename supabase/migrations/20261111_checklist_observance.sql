-- Checklist d'observance reliée au conseillancier (canvas « Espace praticien », 11 novembre 2026)
--  1. consultant_plans.tracked_items : conseils cochés « Suivre dans le journal » dans l'éditeur
--     [{ field_key, line_index, line, label, freq: { mode: 'daily' } | { mode: 'custom', count, unit } }]
--  2. plan_observance_items : origine de l'item (rubrique + ligne du conseillancier) et fréquence libre
--     « N fois par jour / semaine / mois / an ». frequency + weekly_target restent renseignés pour l'app mobile.

ALTER TABLE consultant_plans ADD COLUMN IF NOT EXISTS tracked_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE plan_observance_items ADD COLUMN IF NOT EXISTS source_key TEXT;
ALTER TABLE plan_observance_items ADD COLUMN IF NOT EXISTS source_line TEXT;
ALTER TABLE plan_observance_items ADD COLUMN IF NOT EXISTS period_count INTEGER;
ALTER TABLE plan_observance_items ADD COLUMN IF NOT EXISTS period_unit TEXT;

DO $$ BEGIN
  ALTER TABLE plan_observance_items ADD CONSTRAINT chk_observance_period_count CHECK (period_count IS NULL OR period_count > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE plan_observance_items ADD CONSTRAINT chk_observance_period_unit CHECK (period_unit IS NULL OR period_unit IN ('day', 'week', 'month', 'year'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_observance_items_consultant_source
  ON plan_observance_items(consultant_id, source_key) WHERE is_active;
