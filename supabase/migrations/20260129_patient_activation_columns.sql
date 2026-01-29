-- Migration: Patient Activation Columns
-- Created: 2026-01-29
-- Purpose: Add activated/activated_at columns to patients table for tracking activation status

BEGIN;

-- ============================================
-- Add activation tracking columns to patients
-- ============================================

-- Add activated column (boolean) - tracks if the patient has activated their account
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS activated BOOLEAN DEFAULT FALSE;

-- Add activated_at column (timestamp) - when the patient activated their account
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Create index for querying activated patients
CREATE INDEX IF NOT EXISTS idx_patients_activated
  ON public.patients(activated);

-- ============================================
-- Update existing patients with memberships as activated
-- If a patient has a membership entry, they are considered activated
-- ============================================

UPDATE public.patients p
SET
  activated = TRUE,
  activated_at = COALESCE(
    (SELECT pm.created_at FROM public.patient_memberships pm WHERE pm.patient_id = p.id LIMIT 1),
    p.updated_at
  )
WHERE
  p.activated IS NOT TRUE
  AND EXISTS (
    SELECT 1 FROM public.patient_memberships pm WHERE pm.patient_id = p.id
  );

-- ============================================
-- Add helpful comments
-- ============================================

COMMENT ON COLUMN public.patients.activated IS 'Whether the patient has activated their mobile account';
COMMENT ON COLUMN public.patients.activated_at IS 'Timestamp when the patient activated their account';

COMMIT;
