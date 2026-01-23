BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'start_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN start_at TO starts_at;
  END IF;
END;
$$;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.appointments a
SET practitioner_id = p.practitioner_id
FROM public.patients p
WHERE a.practitioner_id IS NULL
  AND a.patient_id = p.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'starts_at'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE starts_at IS NULL) THEN
      ALTER TABLE public.appointments ALTER COLUMN starts_at SET NOT NULL;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE practitioner_id IS NULL) THEN
    ALTER TABLE public.appointments ALTER COLUMN practitioner_id SET NOT NULL;
  END IF;
END;
$$;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'cancelled', 'completed'));

CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS appointments_practitioner_id_idx ON public.appointments (practitioner_id);
CREATE INDEX IF NOT EXISTS appointments_starts_at_idx ON public.appointments (starts_at);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practitioners access own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients access own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can select own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can delete own appointments" ON public.appointments;

CREATE POLICY "Practitioners can select own appointments" ON public.appointments
  FOR SELECT USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can insert own appointments" ON public.appointments
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can update own appointments" ON public.appointments
  FOR UPDATE USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can delete own appointments" ON public.appointments
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

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
