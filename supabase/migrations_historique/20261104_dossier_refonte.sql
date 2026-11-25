-- Dossier consultant, refonte du 4 novembre 2026 (canvas « Espace praticien »)
--  1. consultant_goals   : objectifs fixés avec le consultant en première séance (modifiables, ajout / retrait)
--  2. anamnesis_notes    : notes du praticien sur l'anamnèse (« Ma première note » + notes par rubrique).
--                          Les réponses du consultant restent en lecture seule.
--  3. current_treatments : date et raison d'arrêt
--  4. source             : « anamnese » quand une ligne du dossier est reprise de l'anamnèse

-- 1. Objectifs
CREATE TABLE IF NOT EXISTS consultant_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  -- Point de départ au moment où l'objectif est fixé (ex. « 3 à 4 crises par mois »)
  baseline TEXT,
  -- Où en est le consultant (ex. « En progrès · 2 par mois »)
  progress TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'progressing', 'reached')),
  set_on DATE NOT NULL DEFAULT CURRENT_DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultant_goals_consultant ON consultant_goals(consultant_id, position);
ALTER TABLE consultant_goals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "own_consultant_goals" ON consultant_goals
    FOR ALL TO authenticated
    USING (practitioner_id = auth.uid())
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Notes du praticien sur l'anamnèse
--    section_id : identifiant de rubrique (ANAMNESIS_SECTIONS) ou 'first_note' pour « Ma première note »
CREATE TABLE IF NOT EXISTS anamnesis_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL CHECK (char_length(section_id) BETWEEN 1 AND 80),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anamnesis_notes_consultant ON anamnesis_notes(consultant_id, section_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_anamnesis_first_note
  ON anamnesis_notes(consultant_id, practitioner_id) WHERE section_id = 'first_note';
ALTER TABLE anamnesis_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "own_anamnesis_notes" ON anamnesis_notes
    FOR ALL TO authenticated
    USING (practitioner_id = auth.uid())
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Traitements arrêtés
ALTER TABLE current_treatments ADD COLUMN IF NOT EXISTS stopped_at DATE;
ALTER TABLE current_treatments ADD COLUMN IF NOT EXISTS stop_reason TEXT;

-- 4. Provenance des lignes du dossier
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'practitioner';
ALTER TABLE allergies ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'practitioner';
ALTER TABLE current_treatments ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'practitioner';
DO $$ BEGIN
  ALTER TABLE medical_history ADD CONSTRAINT medical_history_source_check CHECK (source IN ('practitioner', 'anamnese'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE allergies ADD CONSTRAINT allergies_source_check CHECK (source IN ('practitioner', 'anamnese'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE current_treatments ADD CONSTRAINT current_treatments_source_check CHECK (source IN ('practitioner', 'anamnese'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
