BEGIN;

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS default_consultation_reason TEXT;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS consultation_reason TEXT;

CREATE TABLE IF NOT EXISTS public.patient_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_plans_patient_id_idx
  ON public.patient_plans (patient_id);

CREATE INDEX IF NOT EXISTS patient_plans_practitioner_id_idx
  ON public.patient_plans (practitioner_id);

CREATE UNIQUE INDEX IF NOT EXISTS patient_plans_patient_version_idx
  ON public.patient_plans (patient_id, version);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_plans_status_check'
  ) THEN
    ALTER TABLE public.patient_plans
      ADD CONSTRAINT patient_plans_status_check CHECK (status IN ('draft', 'shared')) NOT VALID;
    ALTER TABLE public.patient_plans
      VALIDATE CONSTRAINT patient_plans_status_check;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_practitioner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.practitioners (id, email, full_name, default_consultation_reason)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'default_consultation_reason', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_patient_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_patient_plans_updated_at ON public.patient_plans;
CREATE TRIGGER set_patient_plans_updated_at
  BEFORE UPDATE ON public.patient_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_patient_plans_updated_at();

ALTER TABLE public.patient_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_plans'
      AND policyname = 'patient_plans_practitioner_select'
  ) THEN
    CREATE POLICY patient_plans_practitioner_select
      ON public.patient_plans
      FOR SELECT
      USING (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_plans'
      AND policyname = 'patient_plans_practitioner_insert'
  ) THEN
    CREATE POLICY patient_plans_practitioner_insert
      ON public.patient_plans
      FOR INSERT
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_plans'
      AND policyname = 'patient_plans_practitioner_update'
  ) THEN
    CREATE POLICY patient_plans_practitioner_update
      ON public.patient_plans
      FOR UPDATE
      USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_plans'
      AND policyname = 'patient_plans_practitioner_delete'
  ) THEN
    CREATE POLICY patient_plans_practitioner_delete
      ON public.patient_plans
      FOR DELETE
      USING (practitioner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_plans'
      AND policyname = 'patient_plans_patient_read_shared'
  ) THEN
    CREATE POLICY patient_plans_patient_read_shared
      ON public.patient_plans
      FOR SELECT
      USING (
        status = 'shared'
        AND EXISTS (
          SELECT 1
          FROM public.patient_memberships pm
          WHERE pm.patient_id = patient_plans.patient_id
            AND pm.patient_user_id = auth.uid()
        )
      );
  END IF;
END
$$;

COMMIT;
