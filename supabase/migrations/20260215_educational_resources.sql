-- ============================================
-- Educational Resources & Assignments
-- ============================================

-- Table: educational_resources
CREATE TABLE IF NOT EXISTS educational_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  summary TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'pdf', 'image', 'video_link')),
  content_markdown TEXT,
  file_path TEXT,
  file_name TEXT,
  video_url TEXT,
  thumbnail_path TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'alimentation', 'hydratation', 'phytotherapie', 'aromatherapie',
    'respiration', 'activite_physique', 'sommeil', 'gestion_stress',
    'detox', 'digestion', 'immunite', 'peau', 'feminin', 'general'
  )),
  tags TEXT[] DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'practitioner' CHECK (source IN ('afeia', 'practitioner')),
  is_published BOOLEAN DEFAULT TRUE,
  read_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_educational_resources_practitioner_category
  ON educational_resources(practitioner_id, category);
CREATE INDEX IF NOT EXISTS idx_educational_resources_source_published
  ON educational_resources(source, is_published);
CREATE INDEX IF NOT EXISTS idx_educational_resources_tags
  ON educational_resources USING GIN(tags);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_educational_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_educational_resources_updated_at ON educational_resources;
CREATE TRIGGER trg_educational_resources_updated_at
  BEFORE UPDATE ON educational_resources
  FOR EACH ROW EXECUTE FUNCTION update_educational_resources_updated_at();

-- Table: resource_assignments
CREATE TABLE IF NOT EXISTS resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  consultant_plan_id UUID REFERENCES consultant_plans(id) ON DELETE SET NULL,
  plan_section_key TEXT,
  message TEXT,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: no duplicate assignment per resource+consultant+plan
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_assignments_unique
  ON resource_assignments(resource_id, consultant_id, consultant_plan_id)
  WHERE consultant_plan_id IS NOT NULL;

-- Also prevent duplicates when consultant_plan_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_assignments_unique_no_plan
  ON resource_assignments(resource_id, consultant_id)
  WHERE consultant_plan_id IS NULL;

-- Index for consultant lookups
CREATE INDEX IF NOT EXISTS idx_resource_assignments_consultant
  ON resource_assignments(consultant_id, read_at);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE educational_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;

-- educational_resources: AFEIA fiches readable by all authenticated practitioners
DO $$ BEGIN
  CREATE POLICY "afeia_resources_select" ON educational_resources
    FOR SELECT TO authenticated
    USING (
      (practitioner_id IS NULL AND source = 'afeia')
      OR practitioner_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "practitioner_resources_insert" ON educational_resources
    FOR INSERT TO authenticated
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "practitioner_resources_update" ON educational_resources
    FOR UPDATE TO authenticated
    USING (practitioner_id = auth.uid())
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "practitioner_resources_delete" ON educational_resources
    FOR DELETE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- resource_assignments: practitioner CRUD
DO $$ BEGIN
  CREATE POLICY "practitioner_assignments_select" ON resource_assignments
    FOR SELECT TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "practitioner_assignments_insert" ON resource_assignments
    FOR INSERT TO authenticated
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "practitioner_assignments_update" ON resource_assignments
    FOR UPDATE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "practitioner_assignments_delete" ON resource_assignments
    FOR DELETE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Storage bucket for educational resources
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('educational-resources', 'educational-resources', false)
ON CONFLICT (id) DO NOTHING;
