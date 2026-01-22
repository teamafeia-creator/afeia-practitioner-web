BEGIN;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS circular_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_circular_sync_at TIMESTAMPTZ;

ALTER TABLE public.patients
  ALTER COLUMN status SET DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'patients_status_check'
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_status_check CHECK (status IN ('standard', 'premium'));
  END IF;
END
$$;

UPDATE public.patients
SET status = CASE WHEN is_premium THEN 'premium' ELSE 'standard' END
WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  email TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient_invites
  ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.patient_invites AS invites
SET email = patients.email
FROM public.patients
WHERE invites.email IS NULL
  AND invites.patient_id = patients.id
  AND patients.email IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient_invites'
      AND column_name = 'email'
  ) THEN
    IF (SELECT COUNT(*) FROM public.patient_invites WHERE email IS NULL) = 0 THEN
      ALTER TABLE public.patient_invites
        ALTER COLUMN email SET NOT NULL;
    END IF;
  END IF;
END
$$;

ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_invites'
      AND policyname = 'Practitioners can manage own invites'
  ) THEN
    EXECUTE 'CREATE POLICY "Practitioners can manage own invites" ON public.patient_invites
      FOR ALL USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid())';
  END IF;
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
