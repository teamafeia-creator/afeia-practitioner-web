-- Migration: Add patient info columns to otp_codes
-- Created: 2026-01-29
-- Purpose: Store patient information in otp_codes during creation
--          Patient entry in `patients` table will only be created during activation
--          This fixes the "Patient existe déjà" conflict

BEGIN;

-- ====================================================================
-- 1. ADD PATIENT INFO COLUMNS TO OTP_CODES
-- ====================================================================

-- Patient personal info
ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS patient_first_name TEXT;

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS patient_last_name TEXT;

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS patient_phone_number TEXT;

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS patient_date_of_birth DATE;

-- Patient additional info
ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS patient_city TEXT;

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS patient_is_premium BOOLEAN DEFAULT FALSE;

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS patient_circular_enabled BOOLEAN DEFAULT FALSE;

-- ====================================================================
-- 2. ADD USED/USED_AT COLUMNS FOR TRACKING
-- ====================================================================

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- ====================================================================
-- 3. ADD INDEX FOR USED COLUMN
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON public.otp_codes(used);

-- ====================================================================
-- 4. UPDATE RLS POLICIES FOR ANON TO UPDATE (mark as used)
-- ====================================================================

-- Allow anon to update OTP codes (for marking as used during activation)
DROP POLICY IF EXISTS "Allow anon to update OTP codes" ON public.otp_codes;
CREATE POLICY "Allow anon to update OTP codes"
  ON public.otp_codes
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow authenticated to update OTP codes
DROP POLICY IF EXISTS "Allow authenticated to update OTP codes" ON public.otp_codes;
CREATE POLICY "Allow authenticated to update OTP codes"
  ON public.otp_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;

-- ====================================================================
-- VERIFICATION (run separately)
-- ====================================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'otp_codes'
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;
