-- ============================================
-- Migration: Renommer "Patient" en "Consultant"
-- Date: 2026-02-07
-- Description: Renommage global de toutes les références
--   "patient" → "consultant" dans le schéma de base de données
-- ============================================

BEGIN;

-- ============================================
-- 0. SUPPRIMER TOUTES LES CONTRAINTES CHECK CONTENANT 'patient'
--    (DOIT être fait AVANT de modifier les données)
-- ============================================

-- Suppression dynamique de TOUTES les contraintes CHECK sur les colonnes affectées
-- Cela gère les noms auto-générés par PostgreSQL
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Trouver et supprimer toutes les contraintes CHECK sur messages (sender, sender_role, sender_type)
  FOR r IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND con.contype = 'c'  -- CHECK constraint
      AND rel.relname = 'messages'
  LOOP
    EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped CHECK constraint % on messages', r.conname;
  END LOOP;

  -- Trouver et supprimer toutes les contraintes CHECK sur preliminary_questionnaires
  FOR r IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND con.contype = 'c'
      AND rel.relname = 'preliminary_questionnaires'
  LOOP
    EXECUTE format('ALTER TABLE public.preliminary_questionnaires DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped CHECK constraint % on preliminary_questionnaires', r.conname;
  END LOOP;

  -- Trouver et supprimer toutes les contraintes CHECK sur anamnesis_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'anamnesis_history' AND table_schema = 'public') THEN
    FOR r IN
      SELECT con.conname, rel.relname
      FROM pg_constraint con
      JOIN pg_class rel ON con.conrelid = rel.oid
      JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
      WHERE nsp.nspname = 'public'
        AND con.contype = 'c'
        AND rel.relname = 'anamnesis_history'
    LOOP
      EXECUTE format('ALTER TABLE public.anamnesis_history DROP CONSTRAINT IF EXISTS %I', r.conname);
      RAISE NOTICE 'Dropped CHECK constraint % on anamnesis_history', r.conname;
    END LOOP;
  END IF;
END $$;

-- ============================================
-- 1. RENOMMER LES TABLES PRINCIPALES
-- ============================================

ALTER TABLE IF EXISTS patients RENAME TO consultants;
ALTER TABLE IF EXISTS patient_memberships RENAME TO consultant_memberships;
ALTER TABLE IF EXISTS patient_invitations RENAME TO consultant_invitations;
ALTER TABLE IF EXISTS patient_invites RENAME TO consultant_invites;
ALTER TABLE IF EXISTS patient_questionnaire_codes RENAME TO consultant_questionnaire_codes;
ALTER TABLE IF EXISTS patient_anamnesis RENAME TO consultant_anamnesis;
ALTER TABLE IF EXISTS patient_plans RENAME TO consultant_plans;
ALTER TABLE IF EXISTS patient_analysis_results RENAME TO consultant_analysis_results;
ALTER TABLE IF EXISTS patients_identity RENAME TO consultants_identity;
ALTER TABLE IF EXISTS patients_health RENAME TO consultants_health;

-- ============================================
-- 2. RENOMMER LES COLONNES patient_id → consultant_id
-- ============================================

-- Tables principales
DO $$
DECLARE
  tbl TEXT;
  col TEXT;
BEGIN
  -- Liste des (table, colonne) à renommer
  FOR tbl, col IN VALUES
    ('anamneses', 'patient_id'),
    ('consultations', 'patient_id'),
    ('plans', 'patient_id'),
    ('journal_entries', 'patient_id'),
    ('messages', 'patient_id'),
    ('wearable_summaries', 'patient_id'),
    ('wearable_insights', 'patient_id'),
    ('notifications', 'patient_id'),
    ('appointments', 'patient_id'),
    ('consultant_memberships', 'patient_user_id'),
    ('consultant_invitations', 'patient_id'),
    ('consultant_questionnaire_codes', 'patient_id'),
    ('consultant_anamnesis', 'patient_id'),
    ('consultant_plans', 'patient_id'),
    ('consultant_analysis_results', 'patient_id'),
    ('otp_codes', 'patient_id'),
    ('preliminary_questionnaires', 'linked_patient_id'),
    ('anamnesis_history', 'patient_id'),
    ('practitioner_notes', 'patient_id'),
    ('consultants_identity', 'patient_id'),
    ('consultants_health', 'patient_id'),
    ('anamnese_instances', 'patient_id'),
    ('anamnese_drafts', 'patient_id'),
    ('conseils', 'patient_id'),
    ('prescriptions', 'patient_id'),
    ('complement_tracking', 'patient_id'),
    ('wearable_data', 'patient_id')
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = col
    ) THEN
      -- Calculer le nouveau nom de colonne
      IF col = 'patient_user_id' THEN
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO consultant_user_id', tbl, col);
      ELSIF col = 'linked_patient_id' THEN
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO linked_consultant_id', tbl, col);
      ELSE
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO consultant_id', tbl, col);
      END IF;
      RAISE NOTICE 'Renamed %.% → consultant', tbl, col;
    END IF;
  END LOOP;
END $$;

-- Colonnes patient_* dans otp_codes
DO $$
DECLARE
  old_col TEXT;
  new_col TEXT;
BEGIN
  FOR old_col, new_col IN VALUES
    ('patient_first_name', 'consultant_first_name'),
    ('patient_last_name', 'consultant_last_name'),
    ('patient_phone', 'consultant_phone'),
    ('patient_phone_number', 'consultant_phone_number'),
    ('patient_city', 'consultant_city'),
    ('patient_date_of_birth', 'consultant_date_of_birth'),
    ('patient_is_premium', 'consultant_is_premium'),
    ('patient_circular_enabled', 'consultant_circular_enabled')
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = old_col) THEN
      EXECUTE format('ALTER TABLE otp_codes RENAME COLUMN %I TO %I', old_col, new_col);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 3. METTRE À JOUR LES DONNÉES (valeurs contenant 'patient')
--    Les contraintes CHECK ont déjà été supprimées en étape 0
-- ============================================

-- Messages: sender 'patient' → 'consultant'
UPDATE messages SET sender = 'consultant' WHERE sender = 'patient';

-- Messages: sender_role 'patient' → 'consultant'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_role') THEN
    UPDATE messages SET sender_role = 'consultant' WHERE sender_role = 'patient';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_type') THEN
    UPDATE messages SET sender_type = 'consultant' WHERE sender_type = 'patient';
  END IF;
END $$;

-- Anamnesis history: modified_by_type 'patient' → 'consultant'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnesis_history' AND column_name = 'modified_by_type') THEN
    UPDATE anamnesis_history SET modified_by_type = 'consultant' WHERE modified_by_type = 'patient';
  END IF;
END $$;

-- Preliminary questionnaires: status 'linked_to_patient' → 'linked_to_consultant'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'preliminary_questionnaires') THEN
    UPDATE preliminary_questionnaires SET status = 'linked_to_consultant' WHERE status = 'linked_to_patient';
  END IF;
END $$;

-- ============================================
-- 4. RECRÉER LES CONTRAINTES CHECK AVEC NOUVELLES VALEURS
-- ============================================

-- Messages: sender CHECK
ALTER TABLE messages ADD CONSTRAINT messages_sender_check
  CHECK (sender IN ('consultant', 'praticien'));

-- Messages: sender_role CHECK (si la colonne existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_role') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_sender_role_check
      CHECK (sender_role IN ('consultant', 'practitioner'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_type') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_sender_type_check
      CHECK (sender_type IN ('consultant', 'practitioner'));
  END IF;
END $$;

-- Anamnesis history: modified_by_type CHECK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'anamnesis_history') THEN
    ALTER TABLE anamnesis_history ADD CONSTRAINT anamnesis_history_modified_by_type_check
      CHECK (modified_by_type IN ('consultant', 'practitioner', 'system'));
  END IF;
END $$;

-- Preliminary questionnaires: status CHECK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'preliminary_questionnaires') THEN
    ALTER TABLE preliminary_questionnaires ADD CONSTRAINT preliminary_questionnaires_status_check
      CHECK (status IN ('pending', 'linked_to_consultant', 'archived'));
  END IF;
END $$;

-- ============================================
-- 5. RECRÉER LES INDEX AVEC NOUVEAUX NOMS
-- ============================================

-- Index sur consultants (anciennement patients)
DROP INDEX IF EXISTS idx_patients_practitioner;
DROP INDEX IF EXISTS idx_patients_email;
DROP INDEX IF EXISTS idx_patients_activated;
DROP INDEX IF EXISTS idx_patients_deleted_at;
DROP INDEX IF EXISTS idx_patients_email_lower;
DROP INDEX IF EXISTS patients_practitioner_id_idx;
DROP INDEX IF EXISTS patients_deleted_at_idx;

CREATE INDEX IF NOT EXISTS idx_consultants_practitioner ON consultants(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_consultants_email ON consultants(email);
CREATE INDEX IF NOT EXISTS idx_consultants_activated ON consultants(activated);
CREATE INDEX IF NOT EXISTS idx_consultants_deleted_at ON consultants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_consultants_email_lower ON consultants(lower(email));

-- Index sur les tables liées (consultant_id)
DROP INDEX IF EXISTS idx_consultations_patient;
DROP INDEX IF EXISTS idx_messages_patient;
DROP INDEX IF EXISTS idx_journal_patient_date;
DROP INDEX IF EXISTS idx_wearable_patient_date;
DROP INDEX IF EXISTS idx_notifications_patient;
DROP INDEX IF EXISTS idx_appointments_patient;
DROP INDEX IF EXISTS idx_wearable_insights_patient;
DROP INDEX IF EXISTS idx_journal_entries_patient;

DROP INDEX IF EXISTS consultations_patient_id_idx;
DROP INDEX IF EXISTS messages_patient_id_idx;
DROP INDEX IF EXISTS journal_entries_patient_id_idx;
DROP INDEX IF EXISTS wearable_summaries_patient_id_idx;
DROP INDEX IF EXISTS wearable_insights_patient_id_idx;
DROP INDEX IF EXISTS appointments_patient_id_idx;
DROP INDEX IF EXISTS anamneses_patient_id_idx;
DROP INDEX IF EXISTS plans_patient_id_idx;

CREATE INDEX IF NOT EXISTS idx_consultations_consultant ON consultations(consultant_id);
CREATE INDEX IF NOT EXISTS idx_messages_consultant ON messages(consultant_id);
CREATE INDEX IF NOT EXISTS idx_journal_consultant_date ON journal_entries(consultant_id, date);
CREATE INDEX IF NOT EXISTS idx_wearable_consultant_date ON wearable_summaries(consultant_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_consultant ON notifications(consultant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_consultant ON appointments(consultant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_insights_consultant ON wearable_insights(consultant_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_consultant ON anamneses(consultant_id);
CREATE INDEX IF NOT EXISTS idx_plans_consultant ON plans(consultant_id);

-- Index sur consultant_invitations
DROP INDEX IF EXISTS idx_patient_invitations_practitioner;
DROP INDEX IF EXISTS idx_patient_invitations_email;
DROP INDEX IF EXISTS idx_patient_invitations_status;
DROP INDEX IF EXISTS idx_patient_invitations_patient_id;

CREATE INDEX IF NOT EXISTS idx_consultant_invitations_practitioner ON consultant_invitations(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_consultant_invitations_email ON consultant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_consultant_invitations_status ON consultant_invitations(status);
CREATE INDEX IF NOT EXISTS idx_consultant_invitations_consultant_id ON consultant_invitations(consultant_id);

-- Index sur consultant_questionnaire_codes
DROP INDEX IF EXISTS idx_patient_questionnaire_codes_patient_id_idx;
DROP INDEX IF EXISTS idx_patient_questionnaire_codes_expires_at_idx;
DROP INDEX IF EXISTS idx_patient_questionnaire_codes_active_idx;
DROP INDEX IF EXISTS patient_questionnaire_codes_patient_id_idx;
DROP INDEX IF EXISTS patient_questionnaire_codes_expires_at_idx;
DROP INDEX IF EXISTS patient_questionnaire_codes_active_idx;

CREATE INDEX IF NOT EXISTS idx_consultant_questionnaire_codes_consultant_id ON consultant_questionnaire_codes(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_questionnaire_codes_expires_at ON consultant_questionnaire_codes(expires_at);

-- Index sur consultant_plans
DROP INDEX IF EXISTS patient_plans_patient_id_idx;
DROP INDEX IF EXISTS patient_plans_practitioner_id_idx;
DROP INDEX IF EXISTS patient_plans_patient_version_idx;
DROP INDEX IF EXISTS idx_patient_plans_patient;
DROP INDEX IF EXISTS idx_patient_plans_practitioner;
DROP INDEX IF EXISTS idx_patient_plans_status;

CREATE INDEX IF NOT EXISTS idx_consultant_plans_consultant ON consultant_plans(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_plans_practitioner ON consultant_plans(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_consultant_plans_status ON consultant_plans(status);
CREATE INDEX IF NOT EXISTS idx_consultant_plans_consultant_version ON consultant_plans(consultant_id, version);

-- Index sur consultant_anamnesis
DROP INDEX IF EXISTS idx_patient_anamnesis_patient;
DROP INDEX IF EXISTS idx_patient_anamnesis_naturopath;

CREATE INDEX IF NOT EXISTS idx_consultant_anamnesis_consultant ON consultant_anamnesis(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_anamnesis_naturopath ON consultant_anamnesis(naturopath_id);

-- Index sur consultant_analysis_results
DROP INDEX IF EXISTS idx_patient_analysis_results_patient_id;
DROP INDEX IF EXISTS idx_patient_analysis_results_practitioner_id;

CREATE INDEX IF NOT EXISTS idx_consultant_analysis_results_consultant ON consultant_analysis_results(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_analysis_results_practitioner ON consultant_analysis_results(practitioner_id);

-- Index sur tables admin
DROP INDEX IF EXISTS patients_identity_practitioner_id_idx;
DROP INDEX IF EXISTS patients_identity_created_at_idx;
DROP INDEX IF EXISTS patients_identity_status_idx;
DROP INDEX IF EXISTS patients_health_practitioner_id_idx;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultants_identity') THEN
    CREATE INDEX IF NOT EXISTS consultants_identity_practitioner_id_idx ON consultants_identity(practitioner_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultants_health') THEN
    CREATE INDEX IF NOT EXISTS consultants_health_practitioner_id_idx ON consultants_health(practitioner_id);
  END IF;
END $$;

-- Index sur otp_codes
DROP INDEX IF EXISTS idx_otp_codes_patient_id;
CREATE INDEX IF NOT EXISTS idx_otp_codes_consultant_id ON otp_codes(consultant_id);

-- ============================================
-- 6. RECRÉER LES POLITIQUES RLS
-- ============================================

-- Supprimer les anciennes politiques sur consultants (anciennement patients)
DROP POLICY IF EXISTS "Practitioners can select own patients" ON consultants;
DROP POLICY IF EXISTS "Practitioners can insert own patients" ON consultants;
DROP POLICY IF EXISTS "Practitioners can update own patients" ON consultants;
DROP POLICY IF EXISTS "Practitioners can delete own patients" ON consultants;
DROP POLICY IF EXISTS "patients_practitioner" ON consultants;
DROP POLICY IF EXISTS "patients_select_own" ON consultants;
DROP POLICY IF EXISTS "patients_insert_own" ON consultants;
DROP POLICY IF EXISTS "patients_update_own" ON consultants;
DROP POLICY IF EXISTS "patients_delete_own" ON consultants;
DROP POLICY IF EXISTS "Patients can select own patient" ON consultants;

-- Créer les nouvelles politiques sur consultants
CREATE POLICY "Practitioners can select own consultants" ON consultants
  FOR SELECT USING (practitioner_id = auth.uid());
CREATE POLICY "Practitioners can insert own consultants" ON consultants
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());
CREATE POLICY "Practitioners can update own consultants" ON consultants
  FOR UPDATE USING (practitioner_id = auth.uid()) WITH CHECK (practitioner_id = auth.uid());
CREATE POLICY "Practitioners can delete own consultants" ON consultants
  FOR DELETE USING (practitioner_id = auth.uid());

-- Politiques sur les tables liées
DROP POLICY IF EXISTS "Access own patient anamneses" ON anamneses;
DROP POLICY IF EXISTS "Access own patient consultations" ON consultations;
DROP POLICY IF EXISTS "Access own patient plans" ON plans;
DROP POLICY IF EXISTS "Access own patient plan_versions" ON plan_versions;
DROP POLICY IF EXISTS "Access own patient plan_sections" ON plan_sections;
DROP POLICY IF EXISTS "Access own patient journal" ON journal_entries;
DROP POLICY IF EXISTS "Access own patient messages" ON messages;
DROP POLICY IF EXISTS "Access own patient wearable_summaries" ON wearable_summaries;
DROP POLICY IF EXISTS "Access own patient wearable_insights" ON wearable_insights;

CREATE POLICY "Access own consultant anamneses" ON anamneses
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant consultations" ON consultations
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant plans" ON plans
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant plan_versions" ON plan_versions
  FOR ALL USING (plan_id IN (SELECT p.id FROM plans p JOIN consultants ct ON p.consultant_id = ct.id WHERE ct.practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant plan_sections" ON plan_sections
  FOR ALL USING (plan_version_id IN (SELECT pv.id FROM plan_versions pv JOIN plans p ON pv.plan_id = p.id JOIN consultants ct ON p.consultant_id = ct.id WHERE ct.practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant journal" ON journal_entries
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant messages" ON messages
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant wearable_summaries" ON wearable_summaries
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));
CREATE POLICY "Access own consultant wearable_insights" ON wearable_insights
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

-- Politiques sur consultant_invitations
DROP POLICY IF EXISTS "invitations_practitioner" ON consultant_invitations;
DROP POLICY IF EXISTS "invitations_read_by_patient_id" ON consultant_invitations;
CREATE POLICY "invitations_practitioner" ON consultant_invitations
  FOR ALL USING (practitioner_id = auth.uid());

-- Politiques sur consultant_memberships
DROP POLICY IF EXISTS "Patients can view own membership" ON consultant_memberships;
DROP POLICY IF EXISTS "Patients can insert own membership" ON consultant_memberships;
CREATE POLICY "Consultants can view own membership" ON consultant_memberships
  FOR SELECT USING (consultant_user_id = auth.uid());
CREATE POLICY "Consultants can insert own membership" ON consultant_memberships
  FOR INSERT WITH CHECK (consultant_user_id = auth.uid());

-- Politiques sur consultant_anamnesis
DROP POLICY IF EXISTS "Practitioners access own patient anamnesis" ON consultant_anamnesis;
DROP POLICY IF EXISTS "Patients access own patient anamnesis" ON consultant_anamnesis;
CREATE POLICY "Practitioners access own consultant anamnesis" ON consultant_anamnesis
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

-- Politiques sur consultant_plans
DROP POLICY IF EXISTS "patient_plans_practitioner_select" ON consultant_plans;
DROP POLICY IF EXISTS "patient_plans_practitioner_insert" ON consultant_plans;
DROP POLICY IF EXISTS "patient_plans_practitioner_update" ON consultant_plans;
DROP POLICY IF EXISTS "patient_plans_practitioner_delete" ON consultant_plans;
DROP POLICY IF EXISTS "patient_plans_patient_read_shared" ON consultant_plans;

CREATE POLICY "consultant_plans_practitioner_select" ON consultant_plans
  FOR SELECT USING (practitioner_id = auth.uid());
CREATE POLICY "consultant_plans_practitioner_insert" ON consultant_plans
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());
CREATE POLICY "consultant_plans_practitioner_update" ON consultant_plans
  FOR UPDATE USING (practitioner_id = auth.uid());
CREATE POLICY "consultant_plans_practitioner_delete" ON consultant_plans
  FOR DELETE USING (practitioner_id = auth.uid());

-- Politiques consultant sur tables liées
DROP POLICY IF EXISTS "Patients access own messages" ON messages;
DROP POLICY IF EXISTS "Patients access own appointments" ON appointments;
DROP POLICY IF EXISTS "Patients access own anamnese instances" ON anamnese_instances;
DROP POLICY IF EXISTS "Practitioners view patient anamnesis_history" ON anamnesis_history;
DROP POLICY IF EXISTS "Patients view own anamnesis_history" ON anamnesis_history;

-- Admin platform policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultants_identity') THEN
    DROP POLICY IF EXISTS "Admin access patients identity" ON consultants_identity;
    DROP POLICY IF EXISTS "Practitioner access patients identity" ON consultants_identity;
    CREATE POLICY "Admin access consultants identity" ON consultants_identity FOR ALL USING (true);
    CREATE POLICY "Practitioner access consultants identity" ON consultants_identity
      FOR ALL USING (practitioner_id = auth.uid());
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultants_health') THEN
    DROP POLICY IF EXISTS "Practitioner access patients health" ON consultants_health;
    CREATE POLICY "Practitioner access consultants health" ON consultants_health
      FOR ALL USING (practitioner_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- 7. RENOMMER LA FONCTION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.set_consultant_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_patient_plans_updated_at ON consultant_plans;
CREATE TRIGGER set_consultant_plans_updated_at
  BEFORE UPDATE ON consultant_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_consultant_plans_updated_at();

DROP FUNCTION IF EXISTS public.set_patient_plans_updated_at();

COMMIT;
