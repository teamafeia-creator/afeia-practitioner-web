-- ============================================
-- Migration: Public Questionnaire System
-- Date: 2026-01-29
-- Description: Complete refactoring of questionnaire system
--   - Public preliminary questionnaires
--   - Automatic patient linking
--   - Anamnesis history tracking
--   - Enhanced notifications with Realtime support
-- ============================================

BEGIN;

-- ============================================
-- 1. TABLE: preliminary_questionnaires
-- Stores questionnaires submitted publicly before patient creation
-- ============================================

CREATE TABLE IF NOT EXISTS public.preliminary_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Naturopath selection
  naturopath_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,

  -- Contact information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Questionnaire responses (JSONB for flexibility)
  -- Structure: { "section_id": { "question_key": "answer_value" } }
  responses JSONB NOT NULL DEFAULT '{}',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked_to_patient', 'archived')),
  linked_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ,

  -- Metadata
  submitted_from_ip TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for preliminary_questionnaires
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_naturopath_id
  ON public.preliminary_questionnaires(naturopath_id);
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_email
  ON public.preliminary_questionnaires(email);
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_status
  ON public.preliminary_questionnaires(status);
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_created_at
  ON public.preliminary_questionnaires(created_at DESC);
-- Composite index for matching
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_match
  ON public.preliminary_questionnaires(naturopath_id, LOWER(email), LOWER(first_name), LOWER(last_name));

-- ============================================
-- 2. TABLE: anamnesis_history
-- Tracks all modifications to patient anamnesis
-- ============================================

CREATE TABLE IF NOT EXISTS public.anamnesis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  anamnesis_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

  -- Change tracking
  modified_section TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,

  -- Full snapshot for rollback capability
  full_snapshot JSONB,

  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,

  -- Actor tracking (who made the change)
  modified_by_type TEXT NOT NULL CHECK (modified_by_type IN ('patient', 'practitioner', 'system')),
  modified_by_id UUID,

  -- Timestamp
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for anamnesis_history
CREATE INDEX IF NOT EXISTS idx_anamnesis_history_patient_id
  ON public.anamnesis_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_anamnesis_history_anamnesis_id
  ON public.anamnesis_history(anamnesis_id);
CREATE INDEX IF NOT EXISTS idx_anamnesis_history_modified_at
  ON public.anamnesis_history(modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_anamnesis_history_section
  ON public.anamnesis_history(modified_section);

-- ============================================
-- 3. ENHANCE: patient_anamnesis table
-- Add version tracking to existing table
-- ============================================

-- Add version column if not exists
ALTER TABLE public.patient_anamnesis
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add naturopath_id for easier queries
ALTER TABLE public.patient_anamnesis
  ADD COLUMN IF NOT EXISTS naturopath_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE;

-- Add source tracking (where the initial data came from)
ALTER TABLE public.patient_anamnesis
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'preliminary_questionnaire', 'mobile_app'));

-- Add preliminary_questionnaire_id reference
ALTER TABLE public.patient_anamnesis
  ADD COLUMN IF NOT EXISTS preliminary_questionnaire_id UUID REFERENCES public.preliminary_questionnaires(id) ON DELETE SET NULL;

-- Update naturopath_id from existing patients
UPDATE public.patient_anamnesis pa
SET naturopath_id = p.practitioner_id
FROM public.patients p
WHERE pa.patient_id = p.id AND pa.naturopath_id IS NULL;

-- ============================================
-- 4. ENHANCE: notifications table
-- Add metadata JSONB for Realtime support
-- ============================================

-- Add metadata column for rich notification data
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add type column for categorization
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general'
    CHECK (type IN ('general', 'anamnesis_modified', 'new_preliminary_questionnaire', 'questionnaire_linked', 'message', 'appointment'));

-- Index for notification type
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications(type);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(practitioner_id, read) WHERE read = FALSE;

-- ============================================
-- 5. FUNCTION: set_updated_at
-- Reusable trigger function for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 6. TRIGGERS: updated_at for new tables
-- ============================================

-- preliminary_questionnaires
DROP TRIGGER IF EXISTS set_updated_at_on_preliminary_questionnaires ON public.preliminary_questionnaires;
CREATE TRIGGER set_updated_at_on_preliminary_questionnaires
  BEFORE UPDATE ON public.preliminary_questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 7. FUNCTION: Auto-link preliminary questionnaire
-- Called when a patient is created to check for matches
-- ============================================

CREATE OR REPLACE FUNCTION public.link_preliminary_questionnaire_on_patient_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_questionnaire_id UUID;
  v_questionnaire_responses JSONB;
BEGIN
  -- Only process if patient has email
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  -- Find matching pending preliminary questionnaire
  -- Match by: naturopath_id + email (case-insensitive)
  SELECT id, responses INTO v_questionnaire_id, v_questionnaire_responses
  FROM public.preliminary_questionnaires
  WHERE naturopath_id = NEW.practitioner_id
    AND LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If found, link it
  IF v_questionnaire_id IS NOT NULL THEN
    -- Update questionnaire status
    UPDATE public.preliminary_questionnaires
    SET
      status = 'linked_to_patient',
      linked_patient_id = NEW.id,
      linked_at = NOW(),
      updated_at = NOW()
    WHERE id = v_questionnaire_id;

    -- Create anamnesis record with questionnaire data
    INSERT INTO public.patient_anamnesis (
      patient_id,
      naturopath_id,
      answers,
      source,
      preliminary_questionnaire_id,
      version
    )
    VALUES (
      NEW.id,
      NEW.practitioner_id,
      v_questionnaire_responses,
      'preliminary_questionnaire',
      v_questionnaire_id,
      1
    )
    ON CONFLICT (patient_id)
    DO UPDATE SET
      answers = EXCLUDED.answers,
      source = EXCLUDED.source,
      preliminary_questionnaire_id = EXCLUDED.preliminary_questionnaire_id,
      updated_at = NOW();

    -- Create notification for practitioner
    INSERT INTO public.notifications (
      practitioner_id,
      patient_id,
      type,
      title,
      description,
      level,
      metadata
    )
    VALUES (
      NEW.practitioner_id,
      NEW.id,
      'questionnaire_linked',
      'Questionnaire lié automatiquement',
      'Le questionnaire préliminaire de ' || NEW.name || ' a été automatiquement associé à sa fiche patient.',
      'info',
      jsonb_build_object(
        'questionnaire_id', v_questionnaire_id,
        'patient_name', NEW.name,
        'linked_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-linking
DROP TRIGGER IF EXISTS trigger_link_preliminary_questionnaire ON public.patients;
CREATE TRIGGER trigger_link_preliminary_questionnaire
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.link_preliminary_questionnaire_on_patient_create();

-- ============================================
-- 8. FUNCTION: Track anamnesis modifications
-- Creates history records and notifications
-- ============================================

CREATE OR REPLACE FUNCTION public.track_anamnesis_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practitioner_id UUID;
  v_patient_name TEXT;
  v_old_sections TEXT[];
  v_new_sections TEXT[];
  v_modified_sections TEXT[];
  v_section TEXT;
  v_old_section_value JSONB;
  v_new_section_value JSONB;
BEGIN
  -- Get practitioner_id and patient name
  SELECT p.practitioner_id, p.name
  INTO v_practitioner_id, v_patient_name
  FROM public.patients p
  WHERE p.id = NEW.patient_id;

  -- Skip if this is the initial insert
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Increment version
  NEW.version := COALESCE(OLD.version, 0) + 1;

  -- Get all section keys from both old and new
  SELECT ARRAY(
    SELECT DISTINCT key
    FROM (
      SELECT jsonb_object_keys(COALESCE(OLD.answers, '{}'::jsonb)) AS key
      UNION
      SELECT jsonb_object_keys(COALESCE(NEW.answers, '{}'::jsonb)) AS key
    ) keys
  ) INTO v_old_sections;

  -- Find modified sections
  v_modified_sections := ARRAY[]::TEXT[];

  FOREACH v_section IN ARRAY v_old_sections
  LOOP
    v_old_section_value := OLD.answers->v_section;
    v_new_section_value := NEW.answers->v_section;

    -- Check if section changed
    IF v_old_section_value IS DISTINCT FROM v_new_section_value THEN
      v_modified_sections := array_append(v_modified_sections, v_section);

      -- Create history record for this section
      INSERT INTO public.anamnesis_history (
        anamnesis_id,
        patient_id,
        modified_section,
        old_value,
        new_value,
        full_snapshot,
        version,
        modified_by_type,
        modified_by_id
      )
      VALUES (
        NEW.id,
        NEW.patient_id,
        v_section,
        v_old_section_value,
        v_new_section_value,
        NEW.answers,
        NEW.version,
        'patient', -- Default to patient, can be overridden via RPC
        NULL
      );
    END IF;
  END LOOP;

  -- Create notification if sections were modified
  IF array_length(v_modified_sections, 1) > 0 THEN
    INSERT INTO public.notifications (
      practitioner_id,
      patient_id,
      type,
      title,
      description,
      level,
      metadata
    )
    VALUES (
      v_practitioner_id,
      NEW.patient_id,
      'anamnesis_modified',
      'Anamnèse modifiée',
      'Le patient ' || v_patient_name || ' a modifié la section ' ||
        CASE
          WHEN array_length(v_modified_sections, 1) = 1 THEN v_modified_sections[1]
          ELSE array_to_string(v_modified_sections, ', ')
        END || ' de son anamnèse.',
      'info',
      jsonb_build_object(
        'patient_id', NEW.patient_id,
        'patient_name', v_patient_name,
        'modified_sections', v_modified_sections,
        'version', NEW.version,
        'modified_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for tracking changes
DROP TRIGGER IF EXISTS trigger_track_anamnesis_changes ON public.patient_anamnesis;
CREATE TRIGGER trigger_track_anamnesis_changes
  BEFORE UPDATE ON public.patient_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION public.track_anamnesis_changes();

-- ============================================
-- 9. FUNCTION: Notify on new preliminary questionnaire
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_new_preliminary_questionnaire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notification for practitioner
  INSERT INTO public.notifications (
    practitioner_id,
    patient_id,
    type,
    title,
    description,
    level,
    metadata
  )
  VALUES (
    NEW.naturopath_id,
    NULL, -- No patient yet
    'new_preliminary_questionnaire',
    'Nouveau questionnaire préliminaire',
    NEW.first_name || ' ' || NEW.last_name || ' a soumis un questionnaire préliminaire.',
    'info',
    jsonb_build_object(
      'questionnaire_id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'email', NEW.email,
      'submitted_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new questionnaire notification
DROP TRIGGER IF EXISTS trigger_notify_new_preliminary_questionnaire ON public.preliminary_questionnaires;
CREATE TRIGGER trigger_notify_new_preliminary_questionnaire
  AFTER INSERT ON public.preliminary_questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_preliminary_questionnaire();

-- ============================================
-- 10. ROW LEVEL SECURITY: preliminary_questionnaires
-- ============================================

ALTER TABLE public.preliminary_questionnaires ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public INSERT (anonymous users can submit questionnaires)
DROP POLICY IF EXISTS "Allow public insert preliminary_questionnaires" ON public.preliminary_questionnaires;
CREATE POLICY "Allow public insert preliminary_questionnaires"
  ON public.preliminary_questionnaires
  FOR INSERT
  WITH CHECK (true);

-- Policy: Practitioners can SELECT their own questionnaires
DROP POLICY IF EXISTS "Practitioners select own preliminary_questionnaires" ON public.preliminary_questionnaires;
CREATE POLICY "Practitioners select own preliminary_questionnaires"
  ON public.preliminary_questionnaires
  FOR SELECT
  USING (naturopath_id = auth.uid());

-- Policy: Practitioners can UPDATE their own questionnaires (for status changes)
DROP POLICY IF EXISTS "Practitioners update own preliminary_questionnaires" ON public.preliminary_questionnaires;
CREATE POLICY "Practitioners update own preliminary_questionnaires"
  ON public.preliminary_questionnaires
  FOR UPDATE
  USING (naturopath_id = auth.uid())
  WITH CHECK (naturopath_id = auth.uid());

-- Policy: Practitioners can DELETE their own questionnaires
DROP POLICY IF EXISTS "Practitioners delete own preliminary_questionnaires" ON public.preliminary_questionnaires;
CREATE POLICY "Practitioners delete own preliminary_questionnaires"
  ON public.preliminary_questionnaires
  FOR DELETE
  USING (naturopath_id = auth.uid());

-- ============================================
-- 11. ROW LEVEL SECURITY: anamnesis_history
-- ============================================

ALTER TABLE public.anamnesis_history ENABLE ROW LEVEL SECURITY;

-- Policy: Practitioners can view history for their patients
DROP POLICY IF EXISTS "Practitioners view patient anamnesis_history" ON public.anamnesis_history;
CREATE POLICY "Practitioners view patient anamnesis_history"
  ON public.anamnesis_history
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE practitioner_id = auth.uid()
    )
  );

-- Policy: Patients can view their own history
DROP POLICY IF EXISTS "Patients view own anamnesis_history" ON public.anamnesis_history;
CREATE POLICY "Patients view own anamnesis_history"
  ON public.anamnesis_history
  FOR SELECT
  USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships
      WHERE patient_user_id = auth.uid()
    )
  );

-- ============================================
-- 12. VIEW: Public practitioners list
-- For the public questionnaire dropdown
-- ============================================

-- Create a view that exposes only necessary practitioner info for public access
CREATE OR REPLACE VIEW public.practitioners_public AS
SELECT
  id,
  full_name
FROM public.practitioners
ORDER BY full_name;

-- Grant SELECT on this view to anon role
GRANT SELECT ON public.practitioners_public TO anon;

-- ============================================
-- 13. FUNCTION: Get public practitioners list
-- RPC function for public access
-- ============================================

CREATE OR REPLACE FUNCTION public.get_public_practitioners()
RETURNS TABLE (
  id UUID,
  full_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, full_name
  FROM public.practitioners
  ORDER BY full_name;
$$;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION public.get_public_practitioners() TO anon;

-- ============================================
-- 14. FUNCTION: Submit preliminary questionnaire
-- RPC function for public submission
-- ============================================

CREATE OR REPLACE FUNCTION public.submit_preliminary_questionnaire(
  p_naturopath_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_responses JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_questionnaire_id UUID;
BEGIN
  -- Validate required fields
  IF p_naturopath_id IS NULL THEN
    RAISE EXCEPTION 'naturopath_id is required';
  END IF;

  IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
    RAISE EXCEPTION 'first_name is required';
  END IF;

  IF p_last_name IS NULL OR TRIM(p_last_name) = '' THEN
    RAISE EXCEPTION 'last_name is required';
  END IF;

  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'email is required';
  END IF;

  -- Validate email format (basic)
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Verify naturopath exists
  IF NOT EXISTS (SELECT 1 FROM public.practitioners WHERE id = p_naturopath_id) THEN
    RAISE EXCEPTION 'Invalid naturopath_id';
  END IF;

  -- Insert questionnaire
  INSERT INTO public.preliminary_questionnaires (
    naturopath_id,
    first_name,
    last_name,
    email,
    phone,
    responses
  )
  VALUES (
    p_naturopath_id,
    TRIM(p_first_name),
    TRIM(p_last_name),
    LOWER(TRIM(p_email)),
    TRIM(p_phone),
    p_responses
  )
  RETURNING id INTO v_questionnaire_id;

  RETURN v_questionnaire_id;
END;
$$;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION public.submit_preliminary_questionnaire(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon;

-- ============================================
-- 15. FUNCTION: Create patient from questionnaire
-- RPC function for practitioners
-- ============================================

CREATE OR REPLACE FUNCTION public.create_patient_from_questionnaire(
  p_questionnaire_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_questionnaire RECORD;
  v_patient_id UUID;
BEGIN
  -- Get questionnaire
  SELECT * INTO v_questionnaire
  FROM public.preliminary_questionnaires
  WHERE id = p_questionnaire_id
    AND naturopath_id = auth.uid()
    AND status = 'pending';

  IF v_questionnaire IS NULL THEN
    RAISE EXCEPTION 'Questionnaire not found or already linked';
  END IF;

  -- Create patient
  INSERT INTO public.patients (
    practitioner_id,
    name,
    email,
    phone,
    status
  )
  VALUES (
    v_questionnaire.naturopath_id,
    v_questionnaire.first_name || ' ' || v_questionnaire.last_name,
    v_questionnaire.email,
    v_questionnaire.phone,
    'standard'
  )
  RETURNING id INTO v_patient_id;

  -- The trigger will handle linking the questionnaire and creating anamnesis

  RETURN v_patient_id;
END;
$$;

-- ============================================
-- 16. FUNCTION: Get preliminary questionnaires for practitioner
-- ============================================

CREATE OR REPLACE FUNCTION public.get_preliminary_questionnaires(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  responses JSONB,
  status TEXT,
  linked_patient_id UUID,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    pq.id,
    pq.first_name,
    pq.last_name,
    pq.email,
    pq.phone,
    pq.responses,
    pq.status,
    pq.linked_patient_id,
    pq.linked_at,
    pq.created_at
  FROM public.preliminary_questionnaires pq
  WHERE pq.naturopath_id = auth.uid()
    AND (p_status IS NULL OR pq.status = p_status)
  ORDER BY pq.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ============================================
-- 17. FUNCTION: Get anamnesis history
-- ============================================

CREATE OR REPLACE FUNCTION public.get_anamnesis_history(
  p_patient_id UUID,
  p_section TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  modified_section TEXT,
  old_value JSONB,
  new_value JSONB,
  version INTEGER,
  modified_by_type TEXT,
  modified_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ah.id,
    ah.modified_section,
    ah.old_value,
    ah.new_value,
    ah.version,
    ah.modified_by_type,
    ah.modified_at
  FROM public.anamnesis_history ah
  WHERE ah.patient_id = p_patient_id
    AND (p_section IS NULL OR ah.modified_section = p_section)
    AND ah.patient_id IN (
      SELECT id FROM public.patients WHERE practitioner_id = auth.uid()
    )
  ORDER BY ah.modified_at DESC
  LIMIT p_limit;
$$;

-- ============================================
-- 18. REALTIME: Enable for notifications
-- ============================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- 19. CLEANUP: Remove deprecated code flows
-- ============================================

-- Drop anamnese_instances table if exists (deprecated)
-- Note: Keep for data migration, can drop later
-- DROP TABLE IF EXISTS public.anamnese_instances;

-- ============================================
-- 20. INDEXES: Additional performance indexes
-- ============================================

-- Index for patient lookup by email (for matching)
CREATE INDEX IF NOT EXISTS idx_patients_email_lower
  ON public.patients(LOWER(email)) WHERE email IS NOT NULL;

-- Index for notification realtime queries
CREATE INDEX IF NOT EXISTS idx_notifications_practitioner_created
  ON public.notifications(practitioner_id, created_at DESC);

COMMIT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- DOCUMENTATION: RLS Policies Summary
-- ============================================
/*
TABLE: preliminary_questionnaires
  - INSERT: Public (anyone can submit)
  - SELECT: Only practitioner who owns the questionnaire
  - UPDATE: Only practitioner who owns the questionnaire
  - DELETE: Only practitioner who owns the questionnaire

TABLE: anamnesis_history
  - SELECT: Practitioner for their patients, Patient for their own

TABLE: patient_anamnesis (existing + enhanced)
  - ALL: Practitioner for their patients
  - ALL: Patient for their own (via patient_memberships)

TABLE: notifications (enhanced)
  - ALL: Practitioner for their own

FUNCTIONS (RPC):
  - get_public_practitioners(): Public (anon)
  - submit_preliminary_questionnaire(): Public (anon)
  - create_patient_from_questionnaire(): Authenticated practitioners
  - get_preliminary_questionnaires(): Authenticated practitioners
  - get_anamnesis_history(): Authenticated practitioners

TRIGGERS:
  - trigger_link_preliminary_questionnaire: Auto-links questionnaire on patient create
  - trigger_track_anamnesis_changes: Creates history records and notifications
  - trigger_notify_new_preliminary_questionnaire: Notifies practitioner on new submission
*/
