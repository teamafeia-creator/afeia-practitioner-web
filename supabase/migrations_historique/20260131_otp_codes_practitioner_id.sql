-- Migration: Add practitioner_id to otp_codes table
-- Created: 2026-01-31
-- Purpose: Link OTP codes to practitioners for proper patient-practitioner association
--          This fixes the issue where patients aren't linked to practitioners after activation

BEGIN;

-- ====================================================================
-- 1. ADD PRACTITIONER_ID COLUMN TO OTP_CODES
-- ====================================================================

-- Add the column (nullable for backward compatibility with existing codes)
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_practitioner_id ON public.otp_codes(practitioner_id);

-- ====================================================================
-- 2. ADD PATIENT_ID COLUMN TO OTP_CODES (for linking to existing patient records)
-- ====================================================================

ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_otp_codes_patient_id ON public.otp_codes(patient_id);

-- ====================================================================
-- 3. UPDATE CLEANUP FUNCTION TO HANDLE NEW COLUMNS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.cleanup_otp_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired codes for this email
  DELETE FROM public.otp_codes
  WHERE email = NEW.email
    AND (expires_at < NOW() OR created_at < NOW() - INTERVAL '1 hour');

  RETURN NEW;
END;
$$;

COMMIT;
