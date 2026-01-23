BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS consultation_reason TEXT;

CREATE INDEX IF NOT EXISTS patients_practitioner_id_idx ON public.patients (practitioner_id);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practitioners can select own patients" ON public.patients;
CREATE POLICY "Practitioners can select own patients" ON public.patients
  FOR SELECT USING (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Practitioners can insert own patients" ON public.patients;
CREATE POLICY "Practitioners can insert own patients" ON public.patients
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Practitioners can update own patients" ON public.patients;
CREATE POLICY "Practitioners can update own patients" ON public.patients
  FOR UPDATE USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Practitioners can delete own patients" ON public.patients;
CREATE POLICY "Practitioners can delete own patients" ON public.patients
  FOR DELETE USING (practitioner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_patients_updated_at ON public.patients;
CREATE TRIGGER set_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
