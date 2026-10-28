-- Lot 9 : inscription vérifiée des praticiens + questionnaire préliminaire versionné.

-- ============================================================
-- 1. Statut du compte praticien
-- ============================================================
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS account_status TEXT;

-- Les comptes existants (et les invitations faites par l'équipe) restent ouverts.
UPDATE public.practitioners SET account_status = 'validated' WHERE account_status IS NULL;

ALTER TABLE public.practitioners
  ALTER COLUMN account_status SET DEFAULT 'validated',
  ALTER COLUMN account_status SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.practitioners
    ADD CONSTRAINT practitioners_account_status_check
    CHECK (account_status IN ('pending_validation', 'validated', 'info_requested', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Un praticien ne peut pas changer lui-même son statut.
CREATE OR REPLACE FUNCTION public.protect_practitioner_account_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND current_user IN ('authenticated', 'anon') THEN
    NEW.account_status := OLD.account_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioners_protect_account_status ON public.practitioners;
CREATE TRIGGER practitioners_protect_account_status
  BEFORE UPDATE ON public.practitioners
  FOR EACH ROW EXECUTE FUNCTION public.protect_practitioner_account_status();

-- Toute inscription directe (auth.signUp) part en attente de validation.
-- Les invitations de l'équipe repassent en « validated » côté serveur.
CREATE OR REPLACE FUNCTION public.handle_new_practitioner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') <> 'practitioner' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.practitioners (id, email, full_name, first_name, last_name, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'invited', '') = 'true' THEN 'validated' ELSE 'pending_validation' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Dossier de vérification (lu uniquement par le serveur)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.practitioner_verifications (
  practitioner_id UUID PRIMARY KEY REFERENCES public.practitioners(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  training_year INTEGER NOT NULL,
  siret TEXT NOT NULL,
  city TEXT NOT NULL,
  charter_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  training_doc_path TEXT,
  training_doc_name TEXT,
  id_doc_path TEXT,
  id_doc_name TEXT,
  id_doc_deleted_at TIMESTAMPTZ,
  pappers JSONB,
  pappers_checked_at TIMESTAMPTZ,
  concordance JSONB,
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_status TEXT,
  decision_motive TEXT,
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  practitioner_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practitioner_verifications ENABLE ROW LEVEL SECURITY;
-- Aucune politique : seul le rôle service (routes serveur) y accède.

CREATE INDEX IF NOT EXISTS practitioner_verifications_created_idx
  ON public.practitioner_verifications(created_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('practitioner-verification', 'practitioner-verification', false)
ON CONFLICT (id) DO NOTHING;
-- Pas de politique storage : dépôt et lecture passent par le serveur (URL signées courtes).

-- ============================================================
-- 3. Questionnaire préliminaire versionné
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questionnaire_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  published_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_versions_version_key
  ON public.questionnaire_versions(version) WHERE version IS NOT NULL;
-- Un seul brouillon à la fois.
CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_versions_single_draft
  ON public.questionnaire_versions(status) WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.questionnaire_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.questionnaire_versions(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (version_id, section_key)
);

CREATE TABLE IF NOT EXISTS public.questionnaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.questionnaire_sections(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  label TEXT NOT NULL,
  answer_type TEXT NOT NULL DEFAULT 'text' CHECK (answer_type IN ('text', 'choice', 'multi')),
  options TEXT[] NOT NULL DEFAULT '{}',
  placeholder TEXT NOT NULL DEFAULT '',
  help TEXT NOT NULL DEFAULT '',
  required BOOLEAN NOT NULL DEFAULT false,
  medical_warning BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (section_id, question_key)
);

CREATE INDEX IF NOT EXISTS questionnaire_sections_version_idx ON public.questionnaire_sections(version_id, position);
CREATE INDEX IF NOT EXISTS questionnaire_questions_section_idx ON public.questionnaire_questions(section_id, position);

ALTER TABLE public.questionnaire_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
-- Lecture et écriture par le serveur uniquement (page publique rendue côté serveur, éditeur admin).
