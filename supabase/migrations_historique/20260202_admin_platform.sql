BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

INSERT INTO public.admin_allowlist (email)
SELECT 'team.afeia@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_allowlist WHERE email = 'team.afeia@gmail.com'
);

CREATE OR REPLACE FUNCTION public.is_admin(email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_allowlist WHERE admin_allowlist.email = $1
  );
$$;

CREATE TABLE IF NOT EXISTS public.practitioners_public (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  calendly_url TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.practitioners_public
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS calendly_url TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'practitioners_public_status_check'
  ) THEN
    ALTER TABLE public.practitioners_public
      ADD CONSTRAINT practitioners_public_status_check CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'practitioners_public_subscription_status_check'
  ) THEN
    ALTER TABLE public.practitioners_public
      ADD CONSTRAINT practitioners_public_subscription_status_check CHECK (
        subscription_status IS NULL OR subscription_status IN ('active', 'past_due', 'canceled')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.patients_identity (
  id UUID PRIMARY KEY,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners_public(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'standard',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  circular_enabled BOOLEAN NOT NULL DEFAULT false,
  last_circular_sync_at TIMESTAMPTZ,
  last_circular_sync_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patients_identity
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS age INT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN,
  ADD COLUMN IF NOT EXISTS circular_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS last_circular_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_circular_sync_status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_identity_status_check'
  ) THEN
    ALTER TABLE public.patients_identity
      ADD CONSTRAINT patients_identity_status_check CHECK (status IN ('standard', 'premium'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_identity_practitioner_id_fkey'
  ) THEN
    ALTER TABLE public.patients_identity
      DROP CONSTRAINT patients_identity_practitioner_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_identity_practitioners_public_fkey'
  ) THEN
    ALTER TABLE public.patients_identity
      ADD CONSTRAINT patients_identity_practitioners_public_fkey
      FOREIGN KEY (practitioner_id) REFERENCES public.practitioners_public(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS patients_identity_practitioner_id_idx
  ON public.patients_identity(practitioner_id);
CREATE INDEX IF NOT EXISTS patients_identity_created_at_idx
  ON public.patients_identity(created_at);
CREATE INDEX IF NOT EXISTS patients_identity_status_idx
  ON public.patients_identity(status);

CREATE TABLE IF NOT EXISTS public.patients_health (
  patient_id UUID PRIMARY KEY REFERENCES public.patients_identity(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  notes JSONB,
  lab_results JSONB,
  questionnaire JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patients_health
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS notes JSONB,
  ADD COLUMN IF NOT EXISTS lab_results JSONB,
  ADD COLUMN IF NOT EXISTS questionnaire JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS patients_health_practitioner_id_idx
  ON public.patients_health(practitioner_id);

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id TEXT PRIMARY KEY,
  practitioner_id UUID NOT NULL,
  customer_id TEXT,
  status TEXT,
  price_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  latest_invoice_id TEXT,
  payment_failed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stripe_subscriptions
  ADD COLUMN IF NOT EXISTS practitioner_id UUID,
  ADD COLUMN IF NOT EXISTS customer_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS price_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN,
  ADD COLUMN IF NOT EXISTS latest_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_failed BOOLEAN,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stripe_subscriptions_practitioner_fkey'
  ) THEN
    ALTER TABLE public.stripe_subscriptions
      ADD CONSTRAINT stripe_subscriptions_practitioner_fkey
      FOREIGN KEY (practitioner_id) REFERENCES public.practitioners_public(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS stripe_subscriptions_practitioner_id_idx
  ON public.stripe_subscriptions(practitioner_id);
CREATE INDEX IF NOT EXISTS stripe_subscriptions_status_idx
  ON public.stripe_subscriptions(status);
CREATE INDEX IF NOT EXISTS stripe_subscriptions_payment_failed_idx
  ON public.stripe_subscriptions(payment_failed);

CREATE OR REPLACE FUNCTION public.admin_trigger_circular_sync(patient_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.patients_identity
  SET last_circular_sync_at = now(),
      last_circular_sync_status = 'queued',
      updated_at = now()
  WHERE id = patient_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_patient_practitioner_reassign()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.practitioner_id IS DISTINCT FROM OLD.practitioner_id THEN
    RAISE EXCEPTION 'Practitioner reassignment is not allowed for patients.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_patient_practitioner_reassign ON public.patients_identity;
CREATE TRIGGER prevent_patient_practitioner_reassign
  BEFORE UPDATE ON public.patients_identity
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_patient_practitioner_reassign();

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin allowlist select" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Admin allowlist insert" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Admin allowlist delete" ON public.admin_allowlist;
CREATE POLICY "Admin allowlist select" ON public.admin_allowlist
  FOR SELECT USING (public.is_admin(auth.jwt()->>'email'));
CREATE POLICY "Admin allowlist insert" ON public.admin_allowlist
  FOR INSERT WITH CHECK (public.is_admin(auth.jwt()->>'email'));
CREATE POLICY "Admin allowlist delete" ON public.admin_allowlist
  FOR DELETE USING (public.is_admin(auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Admin access practitioners public" ON public.practitioners_public;
DROP POLICY IF EXISTS "Practitioner access own public" ON public.practitioners_public;
CREATE POLICY "Admin access practitioners public" ON public.practitioners_public
  FOR ALL USING (public.is_admin(auth.jwt()->>'email'))
  WITH CHECK (public.is_admin(auth.jwt()->>'email'));
CREATE POLICY "Practitioner access own public" ON public.practitioners_public
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin access patients identity" ON public.patients_identity;
DROP POLICY IF EXISTS "Practitioner access patients identity" ON public.patients_identity;
CREATE POLICY "Admin access patients identity" ON public.patients_identity
  FOR ALL USING (public.is_admin(auth.jwt()->>'email'))
  WITH CHECK (public.is_admin(auth.jwt()->>'email'));
CREATE POLICY "Practitioner access patients identity" ON public.patients_identity
  FOR ALL USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Practitioner access patients health" ON public.patients_health;
CREATE POLICY "Practitioner access patients health" ON public.patients_health
  FOR ALL USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

DROP POLICY IF EXISTS "Admin view stripe subscriptions" ON public.stripe_subscriptions;
DROP POLICY IF EXISTS "Practitioner view stripe subscriptions" ON public.stripe_subscriptions;
CREATE POLICY "Admin view stripe subscriptions" ON public.stripe_subscriptions
  FOR SELECT USING (public.is_admin(auth.jwt()->>'email'));
CREATE POLICY "Practitioner view stripe subscriptions" ON public.stripe_subscriptions
  FOR SELECT USING (practitioner_id = auth.uid());

INSERT INTO public.practitioners_public (id, email, full_name, status, calendly_url, created_at, updated_at)
SELECT p.id, p.email, p.full_name, 'active', p.calendly_url, p.created_at, p.updated_at
FROM public.practitioners p
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    calendly_url = EXCLUDED.calendly_url,
    updated_at = now();

INSERT INTO public.patients_identity (
  id,
  practitioner_id,
  full_name,
  email,
  phone,
  age,
  city,
  status,
  is_premium,
  circular_enabled,
  last_circular_sync_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.practitioner_id,
  COALESCE(p.full_name, p.name, 'Patient'),
  p.email,
  p.phone,
  p.age,
  p.city,
  COALESCE(p.status, 'standard'),
  COALESCE(p.is_premium, false),
  COALESCE(p.circular_enabled, false),
  p.last_circular_sync_at,
  p.created_at,
  p.updated_at
FROM public.patients p
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    age = EXCLUDED.age,
    city = EXCLUDED.city,
    status = EXCLUDED.status,
    is_premium = EXCLUDED.is_premium,
    circular_enabled = EXCLUDED.circular_enabled,
    last_circular_sync_at = EXCLUDED.last_circular_sync_at,
    updated_at = now();

COMMIT;
