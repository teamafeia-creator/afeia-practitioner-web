-- Migration: Add patient_id column to patient_invitations
-- This allows linking invitations to pre-created patient records (activated=false)
-- for better tracking and preventing "invitation not found" errors

-- Add patient_id column to patient_invitations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'patient_invitations'
        AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE public.patient_invitations
        ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

        COMMENT ON COLUMN public.patient_invitations.patient_id IS
            'Reference to pre-created patient record (activated=false). Allows tracking before activation.';
    END IF;
END $$;

-- Create index for faster lookups by patient_id
CREATE INDEX IF NOT EXISTS idx_patient_invitations_patient_id
ON public.patient_invitations(patient_id)
WHERE patient_id IS NOT NULL;

-- Update RLS policy to allow reading invitations by patient_id
-- This is needed for the activation flow
DO $$
BEGIN
    -- Allow unauthenticated users to read invitations by patient_id (for activation)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'patient_invitations'
        AND policyname = 'invitations_read_by_patient_id'
    ) THEN
        CREATE POLICY "invitations_read_by_patient_id" ON public.patient_invitations
            FOR SELECT USING (true);
    END IF;
END $$;

-- Ensure the patients table has activated columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'patients'
        AND column_name = 'activated'
    ) THEN
        ALTER TABLE public.patients
        ADD COLUMN activated BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'patients'
        AND column_name = 'activated_at'
    ) THEN
        ALTER TABLE public.patients
        ADD COLUMN activated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add missing columns to otp_codes if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'otp_codes'
        AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE public.otp_codes
        ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for otp_codes patient_id
CREATE INDEX IF NOT EXISTS idx_otp_codes_patient_id
ON public.otp_codes(patient_id)
WHERE patient_id IS NOT NULL;
