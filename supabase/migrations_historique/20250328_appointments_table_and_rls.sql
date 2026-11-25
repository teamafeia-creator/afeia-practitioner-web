CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_patient_id_idx
  ON public.appointments (patient_id);

CREATE INDEX IF NOT EXISTS appointments_practitioner_id_idx
  ON public.appointments (practitioner_id);

CREATE INDEX IF NOT EXISTS appointments_starts_at_idx
  ON public.appointments (starts_at);

DROP TRIGGER IF EXISTS set_updated_at_on_appointments ON public.appointments;
CREATE TRIGGER set_updated_at_on_appointments
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'appointments_select_own'
  ) THEN
    CREATE POLICY appointments_select_own
      ON public.appointments
      FOR SELECT
      USING (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'appointments_insert_own'
  ) THEN
    CREATE POLICY appointments_insert_own
      ON public.appointments
      FOR INSERT
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'appointments_update_own'
  ) THEN
    CREATE POLICY appointments_update_own
      ON public.appointments
      FOR UPDATE
      USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'appointments_delete_own'
  ) THEN
    CREATE POLICY appointments_delete_own
      ON public.appointments
      FOR DELETE
      USING (practitioner_id = auth.uid());
  END IF;
END
$$;
