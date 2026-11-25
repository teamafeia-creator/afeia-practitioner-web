-- Bibliothèque : thèmes personnalisés, favoris, motifs libres des blocs, ressources praticiens

-- 1. Fiches : thème libre ajouté par le praticien (« + Ajouter un thème »).
--    category reste l'énumération existante ('general' pour un thème libre) ; theme_label prime à l'affichage.
ALTER TABLE educational_resources ADD COLUMN IF NOT EXISTS theme_label TEXT;

-- 2. Fiches : favoris par praticien
CREATE TABLE IF NOT EXISTS educational_resource_favorites (
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (practitioner_id, resource_id)
);
ALTER TABLE educational_resource_favorites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "own_resource_favorites" ON educational_resource_favorites
    FOR ALL TO authenticated
    USING (practitioner_id = auth.uid())
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Blocs : motifs ajoutés par le praticien (« Ajouter un motif »), en plus de l'énumération
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS custom_motifs TEXT[] NOT NULL DEFAULT '{}';

-- 4. Ressources pour les praticiens (alimentées par l'équipe Afeia et par des praticiens)
CREATE TABLE IF NOT EXISTS practitioner_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Outils',
  format TEXT NOT NULL CHECK (format IN ('link', 'pdf', 'video', 'model')),
  url TEXT,
  file_path TEXT,
  file_name TEXT,
  source TEXT NOT NULL DEFAULT 'practitioner' CHECK (source IN ('afeia', 'practitioner')),
  owner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  author_label TEXT,
  -- private : visible par son auteur seul ; pending : en relecture ; published : visible par tous ; rejected : refusée
  review_status TEXT NOT NULL DEFAULT 'private' CHECK (review_status IN ('private', 'pending', 'published', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practitioner_resources_status ON practitioner_resources(review_status);
CREATE INDEX IF NOT EXISTS idx_practitioner_resources_owner ON practitioner_resources(owner_id);
ALTER TABLE practitioner_resources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "practitioner_resources_read" ON practitioner_resources
    FOR SELECT TO authenticated
    USING (review_status = 'published' OR owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "practitioner_resources_insert_own" ON practitioner_resources
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid() AND source = 'practitioner' AND review_status IN ('private', 'pending'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "practitioner_resources_update_own" ON practitioner_resources
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() AND source = 'practitioner')
    WITH CHECK (owner_id = auth.uid() AND source = 'practitioner' AND review_status IN ('private', 'pending'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "practitioner_resources_delete_own" ON practitioner_resources
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid() AND source = 'practitioner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS practitioner_resource_favorites (
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES practitioner_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (practitioner_id, resource_id)
);
ALTER TABLE practitioner_resource_favorites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "own_practitioner_resource_favorites" ON practitioner_resource_favorites
    FOR ALL TO authenticated
    USING (practitioner_id = auth.uid())
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fichiers des ressources : dossier par praticien ({owner_id}/...), lecture par tout praticien connecté
INSERT INTO storage.buckets (id, name, public)
VALUES ('practitioner-resources', 'practitioner-resources', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "practitioner_resources_files_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'practitioner-resources');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "practitioner_resources_files_write" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'practitioner-resources' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "practitioner_resources_files_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'practitioner-resources' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
