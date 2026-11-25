-- Migration: Enriched Client File
-- Adds: admin fields on consultants, medical_history, allergies, current_treatments, consultant_relationships
-- Date: 2026-02-13

-- ============================================
-- 1.1 — Additional columns on consultants
-- ============================================

ALTER TABLE consultants ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS referring_doctor_name TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS referring_doctor_phone TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- Gender check constraint (idempotent)
DO $$ BEGIN
  ALTER TABLE consultants ADD CONSTRAINT consultants_gender_check CHECK (gender IN ('male', 'female', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 1.2 — Table medical_history
-- ============================================

CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  year_onset INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE medical_history ADD CONSTRAINT medical_history_category_check CHECK (category IN ('personal', 'family', 'surgical'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_medical_history_consultant_id ON medical_history(consultant_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_practitioner_id ON medical_history(practitioner_id);

-- ============================================
-- 1.3 — Table allergies
-- ============================================

CREATE TABLE IF NOT EXISTS allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  type TEXT NOT NULL,
  substance TEXT NOT NULL,
  severity TEXT,
  reaction TEXT,
  diagnosed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE allergies ADD CONSTRAINT allergies_type_check CHECK (type IN ('allergy', 'intolerance', 'sensitivity'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE allergies ADD CONSTRAINT allergies_severity_check CHECK (severity IN ('mild', 'moderate', 'severe'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_allergies_consultant_id ON allergies(consultant_id);
CREATE INDEX IF NOT EXISTS idx_allergies_practitioner_id ON allergies(practitioner_id);

-- ============================================
-- 1.4 — Table current_treatments
-- ============================================

CREATE TABLE IF NOT EXISTS current_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  name TEXT NOT NULL,
  dosage TEXT,
  prescriber TEXT,
  start_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_current_treatments_consultant_id ON current_treatments(consultant_id);
CREATE INDEX IF NOT EXISTS idx_current_treatments_practitioner_id ON current_treatments(practitioner_id);

-- ============================================
-- 1.5 — Table consultant_relationships
-- ============================================

CREATE TABLE IF NOT EXISTS consultant_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  related_consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE consultant_relationships ADD CONSTRAINT consultant_relationships_type_check CHECK (relationship_type IN ('parent', 'child', 'spouse', 'sibling', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE consultant_relationships ADD CONSTRAINT consultant_relationships_unique UNIQUE (consultant_id, related_consultant_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultant_relationships_consultant_id ON consultant_relationships(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_relationships_related_consultant_id ON consultant_relationships(related_consultant_id);

-- ============================================
-- 1.6 — RLS Policies
-- ============================================

-- medical_history
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY medical_history_select ON medical_history FOR SELECT USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY medical_history_insert ON medical_history FOR INSERT WITH CHECK (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY medical_history_update ON medical_history FOR UPDATE USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY medical_history_delete ON medical_history FOR DELETE USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- allergies
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY allergies_select ON allergies FOR SELECT USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY allergies_insert ON allergies FOR INSERT WITH CHECK (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY allergies_update ON allergies FOR UPDATE USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY allergies_delete ON allergies FOR DELETE USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- current_treatments
ALTER TABLE current_treatments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY current_treatments_select ON current_treatments FOR SELECT USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY current_treatments_insert ON current_treatments FOR INSERT WITH CHECK (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY current_treatments_update ON current_treatments FOR UPDATE USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY current_treatments_delete ON current_treatments FOR DELETE USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- consultant_relationships
ALTER TABLE consultant_relationships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY consultant_relationships_select ON consultant_relationships FOR SELECT
    USING (EXISTS (SELECT 1 FROM consultants WHERE id = consultant_relationships.consultant_id AND practitioner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_relationships_insert ON consultant_relationships FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM consultants WHERE id = consultant_relationships.consultant_id AND practitioner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_relationships_update ON consultant_relationships FOR UPDATE
    USING (EXISTS (SELECT 1 FROM consultants WHERE id = consultant_relationships.consultant_id AND practitioner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_relationships_delete ON consultant_relationships FOR DELETE
    USING (EXISTS (SELECT 1 FROM consultants WHERE id = consultant_relationships.consultant_id AND practitioner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 1.7 — Triggers updated_at
-- ============================================

-- Create trigger function if not exists (reuse existing pattern)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_medical_history
    BEFORE UPDATE ON medical_history
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_allergies
    BEFORE UPDATE ON allergies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_current_treatments
    BEFORE UPDATE ON current_treatments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
