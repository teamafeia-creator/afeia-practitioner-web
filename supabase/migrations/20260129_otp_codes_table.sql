-- Migration: OTP Codes Table
-- Created: 2026-01-29
-- Purpose: Create otp_codes table for patient account activation and password reset

BEGIN;

-- Drop table if exists to ensure clean state
DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- Create the otp_codes table
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT DEFAULT 'activation', -- 'activation' or 'password-reset'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX idx_otp_codes_code ON public.otp_codes(code);
CREATE INDEX idx_otp_codes_email_code ON public.otp_codes(email, code);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);
CREATE INDEX idx_otp_codes_type ON public.otp_codes(type);

-- Enable RLS (Row Level Security)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert OTP codes
CREATE POLICY "Allow authenticated users to insert OTP codes"
  ON public.otp_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to read OTP codes
CREATE POLICY "Allow authenticated users to read OTP codes"
  ON public.otp_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to delete OTP codes
CREATE POLICY "Allow authenticated users to delete OTP codes"
  ON public.otp_codes
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Allow anon to insert OTP codes (for account activation)
CREATE POLICY "Allow anon to insert OTP codes"
  ON public.otp_codes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow anon to read OTP codes (for account activation)
CREATE POLICY "Allow anon to read OTP codes"
  ON public.otp_codes
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anon to delete OTP codes (for account activation)
CREATE POLICY "Allow anon to delete OTP codes"
  ON public.otp_codes
  FOR DELETE
  TO anon
  USING (true);

-- Service role can access all OTP codes
CREATE POLICY "Service role full access to otp_codes"
  ON public.otp_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to cleanup expired OTP codes
CREATE OR REPLACE FUNCTION public.delete_expired_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.otp_codes
  WHERE expires_at < NOW();
END;
$$;

-- Trigger function to cleanup old codes for the same email before inserting new one
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

-- Create trigger for automatic cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_otp_codes ON public.otp_codes;
CREATE TRIGGER trigger_cleanup_otp_codes
  BEFORE INSERT ON public.otp_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_otp_before_insert();

COMMIT;
