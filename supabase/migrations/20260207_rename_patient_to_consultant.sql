-- ============================================
-- Migration: Renommer "Patient" en "Consultant"
-- Date: 2026-02-07
-- Description: Renommage global de toutes les références
--   "patient" → "consultant" dans le schéma de base de données
-- ============================================

BEGIN;

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

-- Table consultants (anciennement patients)
-- (pas de patient_id dans cette table)

-- Table anamneses
ALTER TABLE anamneses RENAME COLUMN patient_id TO consultant_id;

-- Table consultations
ALTER TABLE consultations RENAME COLUMN patient_id TO consultant_id;

-- Table plans
ALTER TABLE plans RENAME COLUMN patient_id TO consultant_id;

-- Table journal_entries
ALTER TABLE journal_entries RENAME COLUMN patient_id TO consultant_id;

-- Table messages
ALTER TABLE messages RENAME COLUMN patient_id TO consultant_id;

-- Table wearable_summaries
ALTER TABLE wearable_summaries RENAME COLUMN patient_id TO consultant_id;

-- Table wearable_insights
ALTER TABLE wearable_insights RENAME COLUMN patient_id TO consultant_id;

-- Table notifications
ALTER TABLE notifications RENAME COLUMN patient_id TO consultant_id;

-- Table appointments
ALTER TABLE appointments RENAME COLUMN patient_id TO consultant_id;

-- Table consultant_memberships (anciennement patient_memberships)
ALTER TABLE consultant_memberships RENAME COLUMN patient_user_id TO consultant_user_id;

-- Table consultant_invitations (anciennement patient_invitations)
ALTER TABLE consultant_invitations RENAME COLUMN patient_id TO consultant_id;

-- Table consultant_questionnaire_codes (anciennement patient_questionnaire_codes)
ALTER TABLE consultant_questionnaire_codes RENAME COLUMN patient_id TO consultant_id;

-- Table consultant_anamnesis (anciennement patient_anamnesis)
ALTER TABLE consultant_anamnesis RENAME COLUMN patient_id TO consultant_id;

-- Table consultant_plans (anciennement patient_plans)
ALTER TABLE consultant_plans RENAME COLUMN patient_id TO consultant_id;

-- Table consultant_analysis_results (anciennement patient_analysis_results)
ALTER TABLE consultant_analysis_results RENAME COLUMN patient_id TO consultant_id;

-- Table otp_codes
ALTER TABLE IF EXISTS otp_codes RENAME COLUMN patient_id TO consultant_id;

-- Colonnes patient_* dans otp_codes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_first_name') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_first_name TO consultant_first_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_last_name') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_last_name TO consultant_last_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_phone') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_phone TO consultant_phone;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_phone_number') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_phone_number TO consultant_phone_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_city') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_city TO consultant_city;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_date_of_birth') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_date_of_birth TO consultant_date_of_birth;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_is_premium') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_is_premium TO consultant_is_premium;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_codes' AND column_name = 'patient_circular_enabled') THEN
    ALTER TABLE otp_codes RENAME COLUMN patient_circular_enabled TO consultant_circular_enabled;
  END IF;
END $$;

-- Table preliminary_questionnaires
ALTER TABLE IF EXISTS preliminary_questionnaires RENAME COLUMN linked_patient_id TO linked_consultant_id;

-- Table anamnesis_history
ALTER TABLE IF EXISTS anamnesis_history RENAME COLUMN patient_id TO consultant_id;

-- Table practitioner_notes
ALTER TABLE IF EXISTS practitioner_notes RENAME COLUMN patient_id TO consultant_id;

-- Tables admin (consultants_identity, consultants_health)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultants_identity' AND column_name = 'patient_id') THEN
    ALTER TABLE consultants_identity RENAME COLUMN patient_id TO consultant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultants_health' AND column_name = 'patient_id') THEN
    ALTER TABLE consultants_health RENAME COLUMN patient_id TO consultant_id;
  END IF;
END $$;

-- Tables additionnelles si elles existent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnese_instances' AND column_name = 'patient_id') THEN
    ALTER TABLE anamnese_instances RENAME COLUMN patient_id TO consultant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anamnese_drafts' AND column_name = 'patient_id') THEN
    ALTER TABLE anamnese_drafts RENAME COLUMN patient_id TO consultant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conseils' AND column_name = 'patient_id') THEN
    ALTER TABLE conseils RENAME COLUMN patient_id TO consultant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'patient_id') THEN
    ALTER TABLE prescriptions RENAME COLUMN patient_id TO consultant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complement_tracking' AND column_name = 'patient_id') THEN
    ALTER TABLE complement_tracking RENAME COLUMN patient_id TO consultant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wearable_data' AND column_name = 'patient_id') THEN
    ALTER TABLE wearable_data RENAME COLUMN patient_id TO consultant_id;
  END IF;
END $$;

-- ============================================
-- 3. METTRE À JOUR LES DONNÉES (valeurs de sender/role)
-- ============================================

-- Messages: sender 'patient' → 'consultant'
UPDATE messages SET sender = 'consultant' WHERE sender = 'patient';

-- Messages: sender_role 'patient' → 'consultant' (si la colonne existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_role') THEN
    UPDATE messages SET sender_role = 'consultant' WHERE sender_role = 'patient';
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
UPDATE preliminary_questionnaires SET status = 'linked_to_consultant' WHERE status = 'linked_to_patient';

-- ============================================
-- 4. METTRE À JOUR LES CONTRAINTES CHECK
-- ============================================

-- Messages sender CHECK
DO $$
BEGIN
  -- Drop old constraint if exists and create new one
  BEGIN
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE messages ADD CONSTRAINT messages_sender_check CHECK (sender IN ('consultant', 'praticien'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Messages sender_role CHECK
DO $$
BEGIN
  BEGIN
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_role_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE messages ADD CONSTRAINT messages_sender_role_check CHECK (sender_role IN ('consultant', 'practitioner'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Anamnesis history modified_by_type CHECK
DO $$
BEGIN
  BEGIN
    ALTER TABLE anamnesis_history DROP CONSTRAINT IF EXISTS anamnesis_history_modified_by_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE anamnesis_history ADD CONSTRAINT anamnesis_history_modified_by_type_check CHECK (modified_by_type IN ('consultant', 'practitioner', 'system'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Preliminary questionnaires status CHECK
DO $$
BEGIN
  BEGIN
    ALTER TABLE preliminary_questionnaires DROP CONSTRAINT IF EXISTS preliminary_questionnaires_status_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE preliminary_questionnaires ADD CONSTRAINT preliminary_questionnaires_status_check CHECK (status IN ('pending', 'linked_to_consultant', 'archived'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
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

CREATE INDEX IF NOT EXISTS consultants_identity_practitioner_id_idx ON consultants_identity(practitioner_id);
CREATE INDEX IF NOT EXISTS consultants_health_practitioner_id_idx ON consultants_health(practitioner_id);

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

-- Politiques sur les tables liées (remplacer les références à patients par consultants)
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
DROP POLICY IF EXISTS "Admin access patients identity" ON consultants_identity;
DROP POLICY IF EXISTS "Practitioner access patients identity" ON consultants_identity;
DROP POLICY IF EXISTS "Practitioner access patients health" ON consultants_health;

DO $$
BEGIN
  -- Recreate admin policies if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultants_identity') THEN
    CREATE POLICY "Admin access consultants identity" ON consultants_identity FOR ALL USING (true);
    CREATE POLICY "Practitioner access consultants identity" ON consultants_identity
      FOR ALL USING (practitioner_id = auth.uid());
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultants_health') THEN
    CREATE POLICY "Practitioner access consultants health" ON consultants_health
      FOR ALL USING (practitioner_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- 7. RENOMMER LA FONCTION TRIGGER
-- ============================================

-- Remplacer la fonction trigger pour consultant_plans
CREATE OR REPLACE FUNCTION public.set_consultant_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS set_patient_plans_updated_at ON consultant_plans;
CREATE TRIGGER set_consultant_plans_updated_at
  BEFORE UPDATE ON consultant_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_consultant_plans_updated_at();

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.set_patient_plans_updated_at();

COMMIT;
