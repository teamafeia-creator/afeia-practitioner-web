BEGIN;

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS calendly_url TEXT;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS patients_practitioner_id_idx ON public.patients (practitioner_id);
CREATE INDEX IF NOT EXISTS patients_deleted_at_idx ON public.patients (deleted_at);

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practitioners can select own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can insert own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can update own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can delete own profile" ON public.practitioners;

CREATE POLICY "Practitioners can select own profile" ON public.practitioners
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Practitioners can insert own profile" ON public.practitioners
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Practitioners can update own profile" ON public.practitioners
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Practitioners can delete own profile" ON public.practitioners
  FOR DELETE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Practitioners can select own patients" ON public.patients;
DROP POLICY IF EXISTS "Practitioners can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Practitioners can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Practitioners can delete own patients" ON public.patients;

CREATE POLICY "Practitioners can select own patients" ON public.patients
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can insert own patients" ON public.patients
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update own patients" ON public.patients
  FOR UPDATE USING (auth.uid() = practitioner_id) WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete own patients" ON public.patients
  FOR DELETE USING (auth.uid() = practitioner_id);

COMMIT;
