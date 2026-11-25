BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- Base tables
-- =========================================================
CREATE TABLE IF NOT EXISTS public.practitioners (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'standard',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  circular_enabled BOOLEAN NOT NULL DEFAULT false,
  circular_connected BOOLEAN NOT NULL DEFAULT false,
  last_circular_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN,
  ADD COLUMN IF NOT EXISTS circular_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS circular_connected BOOLEAN,
  ADD COLUMN IF NOT EXISTS last_circular_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  motif TEXT,
  objectifs TEXT,
  alimentation TEXT,
  digestion TEXT,
  sommeil TEXT,
  stress TEXT,
  complement TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anamneses
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS motif TEXT,
  ADD COLUMN IF NOT EXISTS objectifs TEXT,
  ADD COLUMN IF NOT EXISTS alimentation TEXT,
  ADD COLUMN IF NOT EXISTS digestion TEXT,
  ADD COLUMN IF NOT EXISTS sommeil TEXT,
  ADD COLUMN IF NOT EXISTS stress TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  published_at TIMESTAMPTZ
);

ALTER TABLE public.plan_versions
  ADD COLUMN IF NOT EXISTS plan_id UUID,
  ADD COLUMN IF NOT EXISTS version INTEGER,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.plan_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.plan_sections
  ADD COLUMN IF NOT EXISTS plan_version_id UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  date DATE NOT NULL,
  mood TEXT,
  energy TEXT,
  text TEXT,
  adherence_hydratation BOOLEAN NOT NULL DEFAULT false,
  adherence_respiration BOOLEAN NOT NULL DEFAULT false,
  adherence_mouvement BOOLEAN NOT NULL DEFAULT false,
  adherence_plantes BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS mood TEXT,
  ADD COLUMN IF NOT EXISTS energy TEXT,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS adherence_hydratation BOOLEAN,
  ADD COLUMN IF NOT EXISTS adherence_respiration BOOLEAN,
  ADD COLUMN IF NOT EXISTS adherence_mouvement BOOLEAN,
  ADD COLUMN IF NOT EXISTS adherence_plantes BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  text TEXT,
  body TEXT,
  sender TEXT,
  sender_role TEXT,
  read_by_practitioner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS sender TEXT,
  ADD COLUMN IF NOT EXISTS sender_role TEXT,
  ADD COLUMN IF NOT EXISTS read_by_practitioner BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.wearable_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  date DATE NOT NULL,
  sleep_duration NUMERIC,
  sleep_score NUMERIC,
  hrv_avg NUMERIC,
  activity_level NUMERIC,
  completeness NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wearable_summaries
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS sleep_duration NUMERIC,
  ADD COLUMN IF NOT EXISTS sleep_score NUMERIC,
  ADD COLUMN IF NOT EXISTS hrv_avg NUMERIC,
  ADD COLUMN IF NOT EXISTS activity_level NUMERIC,
  ADD COLUMN IF NOT EXISTS completeness NUMERIC,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.wearable_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  type TEXT,
  level TEXT,
  message TEXT,
  suggested_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wearable_insights
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS suggested_action TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL,
  patient_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS read BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.anamnese_instances (
  patient_id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'PENDING',
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anamnese_instances
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  token TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_invites
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS token TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.patient_memberships (
  patient_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, patient_user_id)
);

ALTER TABLE public.patient_memberships
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS patient_user_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.patient_questionnaire_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_to_email TEXT NOT NULL,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

ALTER TABLE public.patient_questionnaire_codes
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS code_hash TEXT,
  ADD COLUMN IF NOT EXISTS attempts INTEGER,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_to_email TEXT,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- =========================================================
-- Constraints (idempotent via pg_constraint checks)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'practitioners_id_fkey'
      AND conrelid = 'public.practitioners'::regclass
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_id_fkey FOREIGN KEY (id)
      REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_practitioner_id_fkey'
      AND conrelid = 'public.patients'::regclass
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_practitioner_id_fkey FOREIGN KEY (practitioner_id)
      REFERENCES public.practitioners(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_status_check'
      AND conrelid = 'public.patients'::regclass
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_status_check CHECK (status IN ('standard', 'premium'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'anamneses_patient_id_fkey'
      AND conrelid = 'public.anamneses'::regclass
  ) THEN
    ALTER TABLE public.anamneses
      ADD CONSTRAINT anamneses_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultations_patient_id_fkey'
      AND conrelid = 'public.consultations'::regclass
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plans_patient_id_fkey'
      AND conrelid = 'public.plans'::regclass
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plan_versions_plan_id_fkey'
      AND conrelid = 'public.plan_versions'::regclass
  ) THEN
    ALTER TABLE public.plan_versions
      ADD CONSTRAINT plan_versions_plan_id_fkey FOREIGN KEY (plan_id)
      REFERENCES public.plans(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plan_sections_plan_version_id_fkey'
      AND conrelid = 'public.plan_sections'::regclass
  ) THEN
    ALTER TABLE public.plan_sections
      ADD CONSTRAINT plan_sections_plan_version_id_fkey FOREIGN KEY (plan_version_id)
      REFERENCES public.plan_versions(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_entries_patient_id_fkey'
      AND conrelid = 'public.journal_entries'::regclass
  ) THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_patient_id_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_sender_role_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_role_check CHECK (sender_role IN ('patient', 'practitioner'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wearable_summaries_patient_id_fkey'
      AND conrelid = 'public.wearable_summaries'::regclass
  ) THEN
    ALTER TABLE public.wearable_summaries
      ADD CONSTRAINT wearable_summaries_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wearable_insights_patient_id_fkey'
      AND conrelid = 'public.wearable_insights'::regclass
  ) THEN
    ALTER TABLE public.wearable_insights
      ADD CONSTRAINT wearable_insights_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_practitioner_id_fkey'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_practitioner_id_fkey FOREIGN KEY (practitioner_id)
      REFERENCES public.practitioners(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_patient_id_fkey'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_level_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_level_check CHECK (level IN ('info', 'attention'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_patient_id_fkey'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_status_check'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'done', 'cancelled'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'anamnese_instances_patient_id_fkey'
      AND conrelid = 'public.anamnese_instances'::regclass
  ) THEN
    ALTER TABLE public.anamnese_instances
      ADD CONSTRAINT anamnese_instances_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'anamnese_instances_status_check'
      AND conrelid = 'public.anamnese_instances'::regclass
  ) THEN
    ALTER TABLE public.anamnese_instances
      ADD CONSTRAINT anamnese_instances_status_check CHECK (status IN ('PENDING', 'COMPLETED'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_invites_practitioner_id_fkey'
      AND conrelid = 'public.patient_invites'::regclass
  ) THEN
    ALTER TABLE public.patient_invites
      ADD CONSTRAINT patient_invites_practitioner_id_fkey FOREIGN KEY (practitioner_id)
      REFERENCES public.practitioners(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_invites_patient_id_fkey'
      AND conrelid = 'public.patient_invites'::regclass
  ) THEN
    ALTER TABLE public.patient_invites
      ADD CONSTRAINT patient_invites_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_invites_token_key'
      AND conrelid = 'public.patient_invites'::regclass
  ) THEN
    ALTER TABLE public.patient_invites
      ADD CONSTRAINT patient_invites_token_key UNIQUE (token);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_memberships_patient_id_fkey'
      AND conrelid = 'public.patient_memberships'::regclass
  ) THEN
    ALTER TABLE public.patient_memberships
      ADD CONSTRAINT patient_memberships_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_memberships_patient_user_id_fkey'
      AND conrelid = 'public.patient_memberships'::regclass
  ) THEN
    ALTER TABLE public.patient_memberships
      ADD CONSTRAINT patient_memberships_patient_user_id_fkey FOREIGN KEY (patient_user_id)
      REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_memberships_pkey'
      AND conrelid = 'public.patient_memberships'::regclass
  ) THEN
    ALTER TABLE public.patient_memberships
      ADD CONSTRAINT patient_memberships_pkey PRIMARY KEY (patient_id, patient_user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_memberships_patient_id_key'
      AND conrelid = 'public.patient_memberships'::regclass
  ) THEN
    ALTER TABLE public.patient_memberships
      ADD CONSTRAINT patient_memberships_patient_id_key UNIQUE (patient_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_memberships_patient_user_id_key'
      AND conrelid = 'public.patient_memberships'::regclass
  ) THEN
    ALTER TABLE public.patient_memberships
      ADD CONSTRAINT patient_memberships_patient_user_id_key UNIQUE (patient_user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patient_questionnaire_codes_patient_id_fkey'
      AND conrelid = 'public.patient_questionnaire_codes'::regclass
  ) THEN
    ALTER TABLE public.patient_questionnaire_codes
      ADD CONSTRAINT patient_questionnaire_codes_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- =========================================================
-- Indexes (only where queried)
-- =========================================================
CREATE INDEX IF NOT EXISTS patients_practitioner_id_idx
  ON public.patients (practitioner_id);

CREATE INDEX IF NOT EXISTS anamneses_patient_id_idx
  ON public.anamneses (patient_id);

CREATE INDEX IF NOT EXISTS consultations_patient_id_idx
  ON public.consultations (patient_id);

CREATE INDEX IF NOT EXISTS plans_patient_id_idx
  ON public.plans (patient_id);

CREATE INDEX IF NOT EXISTS plan_versions_plan_id_idx
  ON public.plan_versions (plan_id);

CREATE INDEX IF NOT EXISTS plan_sections_plan_version_id_idx
  ON public.plan_sections (plan_version_id);

CREATE INDEX IF NOT EXISTS journal_entries_patient_id_idx
  ON public.journal_entries (patient_id);

CREATE INDEX IF NOT EXISTS messages_patient_id_idx
  ON public.messages (patient_id);

CREATE INDEX IF NOT EXISTS wearable_summaries_patient_id_idx
  ON public.wearable_summaries (patient_id);

CREATE INDEX IF NOT EXISTS wearable_insights_patient_id_idx
  ON public.wearable_insights (patient_id);

CREATE INDEX IF NOT EXISTS notifications_practitioner_id_idx
  ON public.notifications (practitioner_id);

CREATE INDEX IF NOT EXISTS appointments_patient_id_idx
  ON public.appointments (patient_id);

CREATE INDEX IF NOT EXISTS patient_questionnaire_codes_patient_id_idx
  ON public.patient_questionnaire_codes (patient_id);

CREATE INDEX IF NOT EXISTS patient_questionnaire_codes_expires_at_idx
  ON public.patient_questionnaire_codes (expires_at);

CREATE INDEX IF NOT EXISTS patient_questionnaire_codes_active_idx
  ON public.patient_questionnaire_codes (patient_id, created_at DESC);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnese_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_questionnaire_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practitioners manage own profile" ON public.practitioners;
CREATE POLICY "Practitioners manage own profile" ON public.practitioners
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Practitioners manage own patients" ON public.patients;
CREATE POLICY "Practitioners manage own patients" ON public.patients
  FOR ALL USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Patients can select own patient" ON public.patients;
CREATE POLICY "Patients can select own patient" ON public.patients
  FOR SELECT USING (
    id IN (
      SELECT patient_id FROM public.patient_memberships
      WHERE patient_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Practitioners access own anamneses" ON public.anamneses;
CREATE POLICY "Practitioners access own anamneses" ON public.anamneses
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Practitioners access own consultations" ON public.consultations;
CREATE POLICY "Practitioners access own consultations" ON public.consultations
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Practitioners access own plans" ON public.plans;
CREATE POLICY "Practitioners access own plans" ON public.plans
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Practitioners access own plan versions" ON public.plan_versions;
CREATE POLICY "Practitioners access own plan versions" ON public.plan_versions
  FOR ALL USING (
    plan_id IN (
      SELECT p.id FROM public.plans p
      JOIN public.patients pt ON p.patient_id = pt.id
      WHERE pt.practitioner_id = auth.uid()
    )
  ) WITH CHECK (
    plan_id IN (
      SELECT p.id FROM public.plans p
      JOIN public.patients pt ON p.patient_id = pt.id
      WHERE pt.practitioner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Practitioners access own plan sections" ON public.plan_sections;
CREATE POLICY "Practitioners access own plan sections" ON public.plan_sections
  FOR ALL USING (
    plan_version_id IN (
      SELECT pv.id FROM public.plan_versions pv
      JOIN public.plans p ON pv.plan_id = p.id
      JOIN public.patients pt ON p.patient_id = pt.id
      WHERE pt.practitioner_id = auth.uid()
    )
  ) WITH CHECK (
    plan_version_id IN (
      SELECT pv.id FROM public.plan_versions pv
      JOIN public.plans p ON pv.plan_id = p.id
      JOIN public.patients pt ON p.patient_id = pt.id
      WHERE pt.practitioner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Practitioners access own journal" ON public.journal_entries;
CREATE POLICY "Practitioners access own journal" ON public.journal_entries
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Practitioners access own messages" ON public.messages;
CREATE POLICY "Practitioners access own messages" ON public.messages
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
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

DROP POLICY IF EXISTS "Practitioners access own wearable summaries" ON public.wearable_summaries;
CREATE POLICY "Practitioners access own wearable summaries" ON public.wearable_summaries
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Practitioners access own wearable insights" ON public.wearable_insights;
CREATE POLICY "Practitioners access own wearable insights" ON public.wearable_insights
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Practitioners access own notifications" ON public.notifications;
CREATE POLICY "Practitioners access own notifications" ON public.notifications
  FOR ALL USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

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

DROP POLICY IF EXISTS "Practitioners manage own invites" ON public.patient_invites;
CREATE POLICY "Practitioners manage own invites" ON public.patient_invites
  FOR ALL USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view own membership" ON public.patient_memberships;
CREATE POLICY "Patients can view own membership" ON public.patient_memberships
  FOR SELECT USING (patient_user_id = auth.uid());

DROP POLICY IF EXISTS "Patients can insert own membership" ON public.patient_memberships;
CREATE POLICY "Patients can insert own membership" ON public.patient_memberships
  FOR INSERT WITH CHECK (patient_user_id = auth.uid());

DROP POLICY IF EXISTS "Practitioners manage questionnaire codes" ON public.patient_questionnaire_codes;
CREATE POLICY "Practitioners manage questionnaire codes" ON public.patient_questionnaire_codes
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

-- =========================================================
-- RPC / Triggers
-- =========================================================
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
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_practitioner();

COMMIT;
