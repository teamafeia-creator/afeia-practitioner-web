-- ============================================
-- Migration: Fix questionnaire functions after patient→consultant rename
-- Date: 2026-02-15
-- Description: All stored functions created by 20260129_public_questionnaire_system.sql
--   still reference old table/column names (patients, patient_id, patient_anamnesis).
--   The rename migration 20260207 renamed tables/columns but did NOT update functions.
--   This migration recreates all affected functions with correct names.
-- ============================================

BEGIN;

-- ============================================
-- 1. Rename create_patient_from_questionnaire → create_consultant_from_questionnaire
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS public.create_patient_from_questionnaire(UUID);

CREATE OR REPLACE FUNCTION public.create_consultant_from_questionnaire(
  p_questionnaire_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_questionnaire RECORD;
  v_consultant_id UUID;
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

  -- Create consultant
  INSERT INTO public.consultants (
    practitioner_id,
    name,
    first_name,
    last_name,
    email,
    phone,
    status
  )
  VALUES (
    v_questionnaire.naturopath_id,
    v_questionnaire.first_name || ' ' || v_questionnaire.last_name,
    v_questionnaire.first_name,
    v_questionnaire.last_name,
    v_questionnaire.email,
    v_questionnaire.phone,
    'standard'
  )
  RETURNING id INTO v_consultant_id;

  -- The trigger will handle linking the questionnaire and creating anamnesis

  RETURN v_consultant_id;
END;
$$;

-- ============================================
-- 2. Fix link_preliminary_questionnaire trigger function
--    Now references consultants, consultant_id, consultant_anamnesis
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
  -- Only process if consultant has email
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
      status = 'linked_to_consultant',
      linked_consultant_id = NEW.id,
      linked_at = NOW(),
      updated_at = NOW()
    WHERE id = v_questionnaire_id;

    -- Create anamnesis record with questionnaire data
    INSERT INTO public.consultant_anamnesis (
      consultant_id,
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
    ON CONFLICT (consultant_id)
    DO UPDATE SET
      answers = EXCLUDED.answers,
      source = EXCLUDED.source,
      preliminary_questionnaire_id = EXCLUDED.preliminary_questionnaire_id,
      updated_at = NOW();

    -- Create notification for practitioner
    INSERT INTO public.notifications (
      practitioner_id,
      consultant_id,
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
      'Le questionnaire préliminaire de ' || NEW.name || ' a été automatiquement associé à sa fiche consultant.',
      'info',
      jsonb_build_object(
        'questionnaire_id', v_questionnaire_id,
        'consultant_name', NEW.name,
        'linked_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger on consultants table (was on patients)
DROP TRIGGER IF EXISTS trigger_link_preliminary_questionnaire ON public.patients;
DROP TRIGGER IF EXISTS trigger_link_preliminary_questionnaire ON public.consultants;
CREATE TRIGGER trigger_link_preliminary_questionnaire
  AFTER INSERT ON public.consultants
  FOR EACH ROW
  EXECUTE FUNCTION public.link_preliminary_questionnaire_on_patient_create();

-- ============================================
-- 3. Fix track_anamnesis_changes function
--    Now references consultants, consultant_id
-- ============================================

CREATE OR REPLACE FUNCTION public.track_anamnesis_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practitioner_id UUID;
  v_consultant_name TEXT;
  v_old_sections TEXT[];
  v_modified_sections TEXT[];
  v_section TEXT;
  v_old_section_value JSONB;
  v_new_section_value JSONB;
BEGIN
  -- Get practitioner_id and consultant name
  SELECT c.practitioner_id, c.name
  INTO v_practitioner_id, v_consultant_name
  FROM public.consultants c
  WHERE c.id = NEW.consultant_id;

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
        consultant_id,
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
        NEW.consultant_id,
        v_section,
        v_old_section_value,
        v_new_section_value,
        NEW.answers,
        NEW.version,
        'consultant',
        NULL
      );
    END IF;
  END LOOP;

  -- Create notification if sections were modified
  IF array_length(v_modified_sections, 1) > 0 THEN
    INSERT INTO public.notifications (
      practitioner_id,
      consultant_id,
      type,
      title,
      description,
      level,
      metadata
    )
    VALUES (
      v_practitioner_id,
      NEW.consultant_id,
      'anamnesis_modified',
      'Anamnèse modifiée',
      'Le consultant ' || v_consultant_name || ' a modifié la section ' ||
        CASE
          WHEN array_length(v_modified_sections, 1) = 1 THEN v_modified_sections[1]
          ELSE array_to_string(v_modified_sections, ', ')
        END || ' de son anamnèse.',
      'info',
      jsonb_build_object(
        'consultant_id', NEW.consultant_id,
        'consultant_name', v_consultant_name,
        'modified_sections', v_modified_sections,
        'version', NEW.version,
        'modified_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger on consultant_anamnesis (was on patient_anamnesis)
DROP TRIGGER IF EXISTS trigger_track_anamnesis_changes ON public.patient_anamnesis;
DROP TRIGGER IF EXISTS trigger_track_anamnesis_changes ON public.consultant_anamnesis;
CREATE TRIGGER trigger_track_anamnesis_changes
  BEFORE UPDATE ON public.consultant_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION public.track_anamnesis_changes();

-- ============================================
-- 4. Fix notify_new_preliminary_questionnaire function
--    consultant_id column instead of patient_id
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
    consultant_id,
    type,
    title,
    description,
    level,
    metadata
  )
  VALUES (
    NEW.naturopath_id,
    NULL, -- No consultant yet
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

-- ============================================
-- 5. Fix get_preliminary_questionnaires function
--    Return linked_consultant_id instead of linked_patient_id
-- ============================================

CREATE OR REPLACE FUNCTION public.get_preliminary_questionnaires(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  naturopath_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  responses JSONB,
  status TEXT,
  linked_consultant_id UUID,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    pq.id,
    pq.naturopath_id,
    pq.first_name,
    pq.last_name,
    pq.email,
    pq.phone,
    pq.responses,
    pq.status,
    pq.linked_consultant_id,
    pq.linked_at,
    pq.created_at,
    pq.updated_at
  FROM public.preliminary_questionnaires pq
  WHERE pq.naturopath_id = auth.uid()
    AND (p_status IS NULL OR pq.status = p_status)
  ORDER BY pq.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ============================================
-- 6. Fix get_anamnesis_history function
--    Parameter p_patient_id → p_consultant_id
-- ============================================

-- Drop old function signature first (parameter names differ)
DROP FUNCTION IF EXISTS public.get_anamnesis_history(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.get_anamnesis_history(
  p_consultant_id UUID,
  p_section TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  anamnesis_id UUID,
  consultant_id UUID,
  modified_section TEXT,
  old_value JSONB,
  new_value JSONB,
  version INTEGER,
  modified_by_type TEXT,
  modified_by_id UUID,
  modified_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ah.id,
    ah.anamnesis_id,
    ah.consultant_id,
    ah.modified_section,
    ah.old_value,
    ah.new_value,
    ah.version,
    ah.modified_by_type,
    ah.modified_by_id,
    ah.modified_at
  FROM public.anamnesis_history ah
  WHERE ah.consultant_id = p_consultant_id
    AND (p_section IS NULL OR ah.modified_section = p_section)
    AND ah.consultant_id IN (
      SELECT id FROM public.consultants WHERE practitioner_id = auth.uid()
    )
  ORDER BY ah.modified_at DESC
  LIMIT p_limit;
$$;

-- ============================================
-- 7. Fix RLS policies on anamnesis_history
--    Reference consultants instead of patients
-- ============================================

DROP POLICY IF EXISTS "Practitioners view patient anamnesis_history" ON public.anamnesis_history;
DROP POLICY IF EXISTS "Patients view own anamnesis_history" ON public.anamnesis_history;
DROP POLICY IF EXISTS "Practitioners view consultant anamnesis_history" ON public.anamnesis_history;
DROP POLICY IF EXISTS "Consultants view own anamnesis_history" ON public.anamnesis_history;

CREATE POLICY "Practitioners view consultant anamnesis_history"
  ON public.anamnesis_history
  FOR SELECT
  USING (
    consultant_id IN (
      SELECT id FROM public.consultants WHERE practitioner_id = auth.uid()
    )
  );

CREATE POLICY "Consultants view own anamnesis_history"
  ON public.anamnesis_history
  FOR SELECT
  USING (
    consultant_id IN (
      SELECT consultant_id FROM public.consultant_memberships
      WHERE consultant_user_id = auth.uid()
    )
  );

-- ============================================
-- 8. Fix RLS policies on consultant_questionnaire_codes
--    Reference consultants instead of patients
-- ============================================

DROP POLICY IF EXISTS "Practitioners manage questionnaire codes" ON public.consultant_questionnaire_codes;

CREATE POLICY "Practitioners manage questionnaire codes" ON public.consultant_questionnaire_codes
  FOR ALL USING (
    consultant_id IN (SELECT id FROM public.consultants WHERE practitioner_id = auth.uid())
  )
  WITH CHECK (
    consultant_id IN (SELECT id FROM public.consultants WHERE practitioner_id = auth.uid())
  );

COMMIT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
