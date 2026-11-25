-- ============================================
-- AFEIA Complete Patch - LOT 1, 5, 6, 7
-- Migration idempotente pour corrections multiples
-- ============================================

BEGIN;

-- ============================================
-- LOT 1 & 5: Ensure all patient columns exist
-- ============================================

-- Add phone column if not exists
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add consultation_reason column if not exists
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS consultation_reason TEXT;

-- Add status column if not exists
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Set default for status
ALTER TABLE public.patients
  ALTER COLUMN status SET DEFAULT 'standard';

-- Add status constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_status_check'
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_status_check CHECK (status IN ('standard', 'premium'));
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Sync status with is_premium for existing rows
UPDATE public.patients
SET status = CASE WHEN is_premium THEN 'premium' ELSE 'standard' END
WHERE status IS NULL;

-- ============================================
-- LOT 6: Ensure CASCADE delete for all patient-related tables
-- ============================================

-- Add ON DELETE CASCADE to all FK constraints if not already present
-- This ensures hard delete works properly

-- patient_anamnesis
ALTER TABLE public.patient_anamnesis
  DROP CONSTRAINT IF EXISTS patient_anamnesis_patient_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_anamnesis') THEN
    ALTER TABLE public.patient_anamnesis
      ADD CONSTRAINT patient_anamnesis_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- practitioner_notes
ALTER TABLE public.practitioner_notes
  DROP CONSTRAINT IF EXISTS practitioner_notes_patient_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'practitioner_notes') THEN
    ALTER TABLE public.practitioner_notes
      ADD CONSTRAINT practitioner_notes_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- patient_plans
ALTER TABLE public.patient_plans
  DROP CONSTRAINT IF EXISTS patient_plans_patient_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_plans') THEN
    ALTER TABLE public.patient_plans
      ADD CONSTRAINT patient_plans_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- anamnese_instances
ALTER TABLE public.anamnese_instances
  DROP CONSTRAINT IF EXISTS anamnese_instances_patient_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anamnese_instances') THEN
    ALTER TABLE public.anamnese_instances
      ADD CONSTRAINT anamnese_instances_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- LOT 7: Patient Analysis Results
-- ============================================

-- Create table for patient analysis results (lab results, medical documents)
CREATE TABLE IF NOT EXISTS public.patient_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  analysis_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_analysis_results_patient_id
  ON public.patient_analysis_results(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_analysis_results_practitioner_id
  ON public.patient_analysis_results(practitioner_id);

-- Enable RLS on patient_analysis_results
ALTER TABLE public.patient_analysis_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for patient_analysis_results
DO $$
BEGIN
  -- Practitioners can manage analysis results for their patients
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_analysis_results'
      AND policyname = 'analysis_results_practitioner_access'
  ) THEN
    CREATE POLICY analysis_results_practitioner_access
      ON public.patient_analysis_results
      FOR ALL
      USING (
        practitioner_id = auth.uid()
        OR patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
      )
      WITH CHECK (
        practitioner_id = auth.uid()
        OR patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================
-- Storage bucket for analysis files
-- ============================================

-- Note: Storage buckets must be created via Supabase Dashboard or API
-- The SQL below documents the expected configuration:
-- Bucket name: patient-analysis-files
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, image/png, image/jpeg, image/jpg

-- ============================================
-- Trigger for updated_at on patient_analysis_results
-- ============================================

DROP TRIGGER IF EXISTS set_updated_at_on_patient_analysis_results ON public.patient_analysis_results;

CREATE TRIGGER set_updated_at_on_patient_analysis_results
  BEFORE UPDATE ON public.patient_analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;

NOTIFY pgrst, 'reload schema';
