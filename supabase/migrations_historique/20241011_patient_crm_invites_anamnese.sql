BEGIN;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('standard', 'premium')) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS circular_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS circular_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_circular_sync_at TIMESTAMPTZ;

UPDATE public.patients
SET status = CASE WHEN is_premium THEN 'premium' ELSE 'standard' END
WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_memberships (
  patient_id UUID UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (patient_id, patient_user_id)
);

CREATE TABLE IF NOT EXISTS public.anamnese_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('PENDING', 'COMPLETED')) DEFAULT 'PENDING',
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'done', 'cancelled')) DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages
  RENAME COLUMN sender TO sender_role;

ALTER TABLE public.messages
  RENAME COLUMN text TO body;

ALTER TABLE public.messages
  RENAME COLUMN sent_at TO created_at;

ALTER TABLE public.messages
  DROP COLUMN IF EXISTS read_at;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_by_practitioner BOOLEAN DEFAULT FALSE;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_check;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_role_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_role_check CHECK (sender_role IN ('patient', 'practitioner'));

ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnese_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can select own patient" ON public.patients;
CREATE POLICY "Patients can select own patient" ON public.patients
  FOR SELECT USING (
    id IN (
      SELECT patient_id FROM public.patient_memberships
      WHERE patient_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Practitioners can manage own invites" ON public.patient_invites;
CREATE POLICY "Practitioners can manage own invites" ON public.patient_invites
  FOR ALL USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view own membership" ON public.patient_memberships;
CREATE POLICY "Patients can view own membership" ON public.patient_memberships
  FOR SELECT USING (patient_user_id = auth.uid());

DROP POLICY IF EXISTS "Practitioners access own anamnese instances" ON public.anamnese_instances;
CREATE POLICY "Practitioners access own anamnese instances" ON public.anamnese_instances
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients access own anamnese instances" ON public.anamnese_instances;
CREATE POLICY "Patients access own anamnese instances" ON public.anamnese_instances
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
  );

DROP POLICY IF EXISTS "Patients access own messages" ON public.messages;
CREATE POLICY "Patients access own messages" ON public.messages
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
  );

DROP POLICY IF EXISTS "Practitioners access own appointments" ON public.appointments;
CREATE POLICY "Practitioners access own appointments" ON public.appointments
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients access own appointments" ON public.appointments;
CREATE POLICY "Patients access own appointments" ON public.appointments
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
  );

CREATE OR REPLACE FUNCTION public.claim_patient_invite(token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record public.patient_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO invite_record
  FROM public.patient_invites
  WHERE patient_invites.token = claim_patient_invite.token
    AND patient_invites.expires_at > NOW()
    AND patient_invites.used_at IS NULL
  FOR UPDATE;

  IF invite_record.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.patient_memberships
    WHERE patient_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Patient already linked';
  END IF;

  INSERT INTO public.patient_memberships (patient_id, patient_user_id)
  VALUES (invite_record.patient_id, auth.uid());

  UPDATE public.patient_invites
  SET used_at = NOW(),
      updated_at = NOW()
  WHERE id = invite_record.id;

  RETURN invite_record.patient_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_patient_invite(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_practitioner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') <> 'practitioner' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.practitioners (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

COMMIT;
