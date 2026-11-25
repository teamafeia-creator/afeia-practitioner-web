-- Migration: Bilan de terrain naturopathique
-- Tables: consultant_terrain (1 per consultant), consultant_iris_photos (N per consultant)

-- ============================================
-- TABLE: consultant_terrain
-- ============================================

CREATE TABLE IF NOT EXISTS consultant_terrain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),

  -- Constitution & Tempérament
  constitution TEXT CHECK (constitution IN ('sanguin', 'lymphatique', 'bilieux', 'nerveux')),
  constitution_secondary TEXT CHECK (constitution_secondary IN ('sanguin', 'lymphatique', 'bilieux', 'nerveux')),
  temperament_description TEXT,
  temperament_notes TEXT,

  -- Diathèse de Ménétrier
  diathese_menetrier TEXT CHECK (diathese_menetrier IN ('allergique_mn', 'hyposthenique_mn_cu', 'dystonique_mn_co', 'anergique_cu_au_ag', 'desadaptation_zn_cu', 'desadaptation_zn_ni_co')),
  diathese_notes TEXT,
  diathese_date DATE,

  -- Surcharges humorales
  surcharge_acides TEXT CHECK (surcharge_acides IN ('absent', 'leger', 'modere', 'important')),
  surcharge_colles TEXT CHECK (surcharge_colles IN ('absent', 'leger', 'modere', 'important')),
  surcharge_cristaux TEXT CHECK (surcharge_cristaux IN ('absent', 'leger', 'modere', 'important')),
  surcharges_notes TEXT,

  -- Émonctoires
  emunctoire_foie TEXT CHECK (emunctoire_foie IN ('fonctionnel', 'ralenti', 'surcharge', 'bloque')),
  emunctoire_foie_notes TEXT,
  emunctoire_intestins TEXT CHECK (emunctoire_intestins IN ('fonctionnel', 'ralenti', 'surcharge', 'bloque')),
  emunctoire_intestins_notes TEXT,
  emunctoire_reins TEXT CHECK (emunctoire_reins IN ('fonctionnel', 'ralenti', 'surcharge', 'bloque')),
  emunctoire_reins_notes TEXT,
  emunctoire_peau TEXT CHECK (emunctoire_peau IN ('fonctionnel', 'reactif', 'surcharge', 'bloque')),
  emunctoire_peau_notes TEXT,
  emunctoire_poumons TEXT CHECK (emunctoire_poumons IN ('fonctionnel', 'sous_exploite', 'surcharge', 'bloque')),
  emunctoire_poumons_notes TEXT,

  -- Force vitale
  force_vitale TEXT CHECK (force_vitale IN ('haute', 'moyenne', 'basse', 'epuisee')),
  force_vitale_notes TEXT,

  -- Métadonnées
  bilan_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on consultant_id (one terrain per consultant)
DO $$ BEGIN
  ALTER TABLE consultant_terrain ADD CONSTRAINT consultant_terrain_consultant_id_key UNIQUE (consultant_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index
DO $$ BEGIN
  CREATE INDEX idx_consultant_terrain_consultant_id ON consultant_terrain(consultant_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- RLS
ALTER TABLE consultant_terrain ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY consultant_terrain_select ON consultant_terrain FOR SELECT USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_terrain_insert ON consultant_terrain FOR INSERT WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_terrain_update ON consultant_terrain FOR UPDATE USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_terrain_delete ON consultant_terrain FOR DELETE USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_consultant_terrain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultant_terrain_updated_at ON consultant_terrain;
CREATE TRIGGER trg_consultant_terrain_updated_at
  BEFORE UPDATE ON consultant_terrain
  FOR EACH ROW
  EXECUTE FUNCTION update_consultant_terrain_updated_at();

-- ============================================
-- TABLE: consultant_iris_photos
-- ============================================

CREATE TABLE IF NOT EXISTS consultant_iris_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  eye TEXT NOT NULL CHECK (eye IN ('left', 'right')),
  photo_path TEXT NOT NULL,
  thumbnail_path TEXT,
  annotations JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  taken_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
DO $$ BEGIN
  CREATE INDEX idx_consultant_iris_photos_lookup ON consultant_iris_photos(consultant_id, eye, taken_at DESC);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- RLS
ALTER TABLE consultant_iris_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY consultant_iris_photos_select ON consultant_iris_photos FOR SELECT USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_iris_photos_insert ON consultant_iris_photos FOR INSERT WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_iris_photos_update ON consultant_iris_photos FOR UPDATE USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY consultant_iris_photos_delete ON consultant_iris_photos FOR DELETE USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_consultant_iris_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultant_iris_photos_updated_at ON consultant_iris_photos;
CREATE TRIGGER trg_consultant_iris_photos_updated_at
  BEFORE UPDATE ON consultant_iris_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_consultant_iris_photos_updated_at();

-- ============================================
-- STORAGE: iris-photos bucket
-- Note: Create bucket 'iris-photos' manually in Supabase dashboard
-- Path convention: {practitioner_id}/iris/{consultant_id}/{eye}_{timestamp}.jpg
-- ============================================
