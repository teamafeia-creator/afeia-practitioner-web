BEGIN;

CREATE TABLE IF NOT EXISTS public.patient_questionnaire_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  sent_to_email TEXT NOT NULL,
  created_by_user_id UUID,
  attempts INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS patient_questionnaire_codes_patient_id_idx
  ON public.patient_questionnaire_codes (patient_id);

CREATE INDEX IF NOT EXISTS patient_questionnaire_codes_expires_at_idx
  ON public.patient_questionnaire_codes (expires_at);

CREATE INDEX IF NOT EXISTS patient_questionnaire_codes_active_idx
  ON public.patient_questionnaire_codes (patient_id, created_at DESC)
  WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.patient_questionnaire_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practitioners manage questionnaire codes" ON public.patient_questionnaire_codes;
CREATE POLICY "Practitioners manage questionnaire codes" ON public.patient_questionnaire_codes
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  )
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

COMMIT;
