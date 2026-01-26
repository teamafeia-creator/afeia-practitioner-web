-- Migration: Mobile Auth Improvements
-- Created: 2026-01-26
-- Purpose: Add tables for mobile app authentication and anamnese drafts

BEGIN;

-- Table: anamnese_drafts
-- Stores partial anamnese questionnaire data for progressive saving
CREATE TABLE IF NOT EXISTS public.anamnese_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id) -- Only one draft per patient
);

-- Indexes
CREATE INDEX IF NOT EXISTS anamnese_drafts_patient_id_idx
  ON public.anamnese_drafts (patient_id);

-- Enable RLS
ALTER TABLE public.anamnese_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Practitioners can manage drafts for their patients
DROP POLICY IF EXISTS "Practitioners manage anamnese drafts" ON public.anamnese_drafts;
CREATE POLICY "Practitioners manage anamnese drafts" ON public.anamnese_drafts
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  )
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

-- Service role can access all drafts (for mobile API)
DROP POLICY IF EXISTS "Service role full access to drafts" ON public.anamnese_drafts;
CREATE POLICY "Service role full access to drafts" ON public.anamnese_drafts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
