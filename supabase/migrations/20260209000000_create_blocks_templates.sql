-- Migration: Create blocks, templates, and inserted_blocks tables
-- for the reusable blocks & templates library feature.

-- ENUM: block_section — maps to section IDs from CONSEILLANCIER_SECTIONS
CREATE TYPE block_section AS ENUM (
  'en_tete',
  'objectifs',
  'alimentation',
  'phytotherapie',
  'micronutrition',
  'aromatologie',
  'hydrologie',
  'activite',
  'equilibre_psycho',
  'respiration',
  'techniques_manuelles',
  'sommeil',
  'environnement',
  'suivi',
  'cloture',
  'notes_libres'
);

-- ENUM: consultation_motif
CREATE TYPE consultation_motif AS ENUM (
  'digestif', 'fatigue', 'stress', 'sommeil', 'feminin', 'perte_poids',
  'immunite', 'peau', 'douleurs', 'detox', 'cardiovasculaire', 'enfant', 'universel'
);

-- ENUM: block_source
CREATE TYPE block_source AS ENUM ('afeia_base', 'praticien', 'communautaire');

-- TABLE: blocks
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  content TEXT NOT NULL,
  section block_section NOT NULL,
  motifs consultation_motif[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  source block_source NOT NULL DEFAULT 'praticien',
  owner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  ai_keywords TEXT[] NOT NULL DEFAULT '{}',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocks_owner ON blocks(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_blocks_section ON blocks(section);
CREATE INDEX idx_blocks_source ON blocks(source);
CREATE INDEX idx_blocks_motifs ON blocks USING GIN(motifs);
CREATE INDEX idx_blocks_tags ON blocks USING GIN(tags);
CREATE INDEX idx_blocks_favorite ON blocks(owner_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_blocks_usage ON blocks(owner_id, usage_count DESC);
CREATE INDEX idx_blocks_search ON blocks USING GIN(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(content, ''))
);

-- TABLE: templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 150),
  description TEXT,
  primary_motif consultation_motif NOT NULL,
  secondary_motifs consultation_motif[] NOT NULL DEFAULT '{}',
  source block_source NOT NULL DEFAULT 'praticien',
  owner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  blocks_mapping JSONB NOT NULL DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_owner ON templates(owner_id);
CREATE INDEX idx_templates_motif ON templates(primary_motif);

-- TABLE: inserted_blocks (traceability)
CREATE TABLE inserted_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id UUID NOT NULL,
  source_block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
  section block_section NOT NULL,
  content_snapshot TEXT NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inserted_blocks_plan ON inserted_blocks(plan_version_id);
CREATE INDEX idx_inserted_blocks_source ON inserted_blocks(source_block_id);

-- RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inserted_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses blocs et blocs AFEIA" ON blocks FOR SELECT
  USING (source = 'afeia_base' OR owner_id = auth.uid());
CREATE POLICY "Créer ses blocs" ON blocks FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND source = 'praticien');
CREATE POLICY "Modifier ses blocs" ON blocks FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Supprimer ses blocs" ON blocks FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Voir ses modèles et modèles AFEIA" ON templates FOR SELECT
  USING (source = 'afeia_base' OR owner_id = auth.uid());
CREATE POLICY "Créer ses modèles" ON templates FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND source = 'praticien');
CREATE POLICY "Modifier ses modèles" ON templates FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Supprimer ses modèles" ON templates FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Accès insertions" ON inserted_blocks FOR ALL USING (TRUE);

-- Trigger updated_at (reuse if function already exists)
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blocks_updated_at BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
