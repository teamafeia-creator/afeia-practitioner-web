-- Migration: Add is_demo column to consultants table
-- Purpose: Allow creating demo consultants that bypass OTP verification
-- Date: 2026-02-16

-- Add is_demo column to consultants table
ALTER TABLE consultants
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN consultants.is_demo IS 'Indicates if the consultant is a demo/test consultant created without OTP verification';
