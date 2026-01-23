CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS practitioner_id UUID;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS consultation_reason TEXT;

CREATE INDEX IF NOT EXISTS patients_practitioner_id_idx
  ON public.patients (practitioner_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_on_patients ON public.patients;
CREATE TRIGGER set_updated_at_on_patients
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patients'
      AND policyname = 'patients_select_own'
  ) THEN
    CREATE POLICY patients_select_own
      ON public.patients
      FOR SELECT
      USING (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patients'
      AND policyname = 'patients_insert_own'
  ) THEN
    CREATE POLICY patients_insert_own
      ON public.patients
      FOR INSERT
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patients'
      AND policyname = 'patients_update_own'
  ) THEN
    CREATE POLICY patients_update_own
      ON public.patients
      FOR UPDATE
      USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patients'
      AND policyname = 'patients_delete_own'
  ) THEN
    CREATE POLICY patients_delete_own
      ON public.patients
      FOR DELETE
      USING (practitioner_id = auth.uid());
  END IF;
END
$$;
