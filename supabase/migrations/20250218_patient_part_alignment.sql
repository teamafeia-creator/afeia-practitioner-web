BEGIN;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS circular_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS circular_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_circular_sync_at TIMESTAMPTZ;

ALTER TABLE public.patients
  ALTER COLUMN status SET DEFAULT 'standard';

UPDATE public.patients
SET status = CASE WHEN is_premium THEN 'premium' ELSE 'standard' END
WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_status_check'
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_status_check CHECK (status IN ('standard', 'premium')) NOT VALID;
    ALTER TABLE public.patients
      VALIDATE CONSTRAINT patients_status_check;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  email TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient_invites
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.patient_invites
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

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

CREATE TABLE IF NOT EXISTS public.patient_memberships (
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (patient_id, patient_user_id)
);

CREATE TABLE IF NOT EXISTS public.anamnese_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING',
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.anamnese_instances
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.anamnese_instances
  ALTER COLUMN status SET DEFAULT 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'anamnese_instances_status_check'
  ) THEN
    ALTER TABLE public.anamnese_instances
      ADD CONSTRAINT anamnese_instances_status_check CHECK (status IN ('PENDING', 'COMPLETED')) NOT VALID;
    ALTER TABLE public.anamnese_instances
      VALIDATE CONSTRAINT anamnese_instances_status_check;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.appointments
  ALTER COLUMN status SET DEFAULT 'scheduled';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'done', 'cancelled')) NOT VALID;
    ALTER TABLE public.appointments
      VALIDATE CONSTRAINT appointments_status_check;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS sender_role TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS read_by_practitioner BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'messages'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'messages'
        AND column_name = 'text'
    ) THEN
      UPDATE public.messages SET body = text WHERE body IS NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'messages'
        AND column_name = 'sender'
    ) THEN
      UPDATE public.messages SET sender_role = sender WHERE sender_role IS NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'messages'
        AND column_name = 'sent_at'
    ) THEN
      UPDATE public.messages SET created_at = sent_at WHERE created_at IS NULL;
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'messages'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_role_check'
    ) THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_sender_role_check CHECK (sender_role IN ('patient', 'practitioner')) NOT VALID;
      ALTER TABLE public.messages
        VALIDATE CONSTRAINT messages_sender_role_check;
    END IF;
  END IF;
END
$$;

ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnese_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_memberships'
      AND policyname = 'Patients can view own membership'
  ) THEN
    EXECUTE 'CREATE POLICY "Patients can view own membership" ON public.patient_memberships
      FOR SELECT USING (patient_user_id = auth.uid())';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'anamnese_instances'
      AND policyname = 'Practitioners access own anamnese instances'
  ) THEN
    EXECUTE 'CREATE POLICY "Practitioners access own anamnese instances" ON public.anamnese_instances
      FOR ALL USING (
        patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
      ) WITH CHECK (
        patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
      )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'anamnese_instances'
      AND policyname = 'Patients access own anamnese instances'
  ) THEN
    EXECUTE 'CREATE POLICY "Patients access own anamnese instances" ON public.anamnese_instances
      FOR ALL USING (
        patient_id IN (
          SELECT patient_id FROM public.patient_memberships
          WHERE patient_user_id = auth.uid()
        )
      ) WITH CHECK (
        patient_id IN (
          SELECT patient_id FROM public.patient_memberships
          WHERE patient_user_id = auth.uid()
        )
      )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'Practitioners access own appointments'
  ) THEN
    EXECUTE 'CREATE POLICY "Practitioners access own appointments" ON public.appointments
      FOR ALL USING (
        patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
      ) WITH CHECK (
        patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
      )';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'Patients access own appointments'
  ) THEN
    EXECUTE 'CREATE POLICY "Patients access own appointments" ON public.appointments
      FOR ALL USING (
        patient_id IN (
          SELECT patient_id FROM public.patient_memberships
          WHERE patient_user_id = auth.uid()
        )
      ) WITH CHECK (
        patient_id IN (
          SELECT patient_id FROM public.patient_memberships
          WHERE patient_user_id = auth.uid()
        )
      )';
  END IF;
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
