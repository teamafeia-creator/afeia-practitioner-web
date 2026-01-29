-- Migration: Fix schema for mobile app compatibility
-- Created: 2026-01-30
-- Purpose: Add missing columns and tables required by mobile-app/services/api.ts

BEGIN;

-- ====================================================================
-- 1. ADD MISSING COLUMNS TO PRACTITIONERS
-- ====================================================================

-- Add phone column to practitioners (expected by mobile app)
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ====================================================================
-- 2. ADD MISSING COLUMNS TO PATIENTS
-- ====================================================================

-- Add first_name and last_name for mobile app compatibility
-- (The web app uses 'name', mobile app expects first_name/last_name)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Backfill first_name from name if empty
UPDATE public.patients
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE
      WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
      ELSE ''
    END
WHERE first_name IS NULL AND name IS NOT NULL;

-- ====================================================================
-- 3. ADD MISSING COLUMNS TO MESSAGES
-- ====================================================================

-- Mobile app uses sender_id, receiver_id, content instead of patient_id, sender_role, body
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_id UUID,
  ADD COLUMN IF NOT EXISTS receiver_id UUID,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- Create view or trigger to sync between old and new columns
-- For now, ensure body and content stay in sync
CREATE OR REPLACE FUNCTION sync_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync content and body columns
  IF NEW.content IS NOT NULL AND NEW.body IS NULL THEN
    NEW.body := NEW.content;
  ELSIF NEW.body IS NOT NULL AND NEW.content IS NULL THEN
    NEW.content := NEW.body;
  END IF;

  -- Sync read and read_by_practitioner
  IF NEW.read IS NOT NULL AND NEW.read_by_practitioner IS NULL THEN
    NEW.read_by_practitioner := NEW.read;
  ELSIF NEW.read_by_practitioner IS NOT NULL AND NEW.read IS NULL THEN
    NEW.read := NEW.read_by_practitioner;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_content_sync ON public.messages;
CREATE TRIGGER messages_content_sync
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION sync_message_content();

-- ====================================================================
-- 4. ADD MISSING COLUMNS TO JOURNAL_ENTRIES
-- ====================================================================

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS alimentation TEXT,
  ADD COLUMN IF NOT EXISTS sleep TEXT,
  ADD COLUMN IF NOT EXISTS complements_taken JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS problems TEXT,
  ADD COLUMN IF NOT EXISTS note_for_naturo TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ====================================================================
-- 5. CREATE MISSING TABLES
-- ====================================================================

-- Table: articles (for content/news feed in mobile app)
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  category TEXT,
  image_url TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: conseils (personalized advice from practitioner)
CREATE TABLE IF NOT EXISTS public.conseils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
  category TEXT,
  title TEXT NOT NULL,
  content TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: prescriptions (supplement prescriptions)
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
  name TEXT,
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: prescription_items (individual supplements in a prescription)
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration INTEGER, -- days
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: complement_tracking (daily tracking of supplement intake)
CREATE TABLE IF NOT EXISTS public.complement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  complement_id UUID NOT NULL, -- references prescription_items.id
  date DATE NOT NULL,
  taken BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, complement_id, date)
);

-- Table: wearable_data (raw wearable device data)
CREATE TABLE IF NOT EXISTS public.wearable_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  steps INTEGER,
  heart_rate INTEGER,
  sleep_hours NUMERIC,
  calories INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 6. CREATE INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS articles_published_idx ON public.articles (published);
CREATE INDEX IF NOT EXISTS articles_category_idx ON public.articles (category);
CREATE INDEX IF NOT EXISTS conseils_patient_id_idx ON public.conseils (patient_id);
CREATE INDEX IF NOT EXISTS conseils_category_idx ON public.conseils (category);
CREATE INDEX IF NOT EXISTS prescriptions_patient_id_idx ON public.prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS prescription_items_prescription_id_idx ON public.prescription_items (prescription_id);
CREATE INDEX IF NOT EXISTS complement_tracking_patient_date_idx ON public.complement_tracking (patient_id, date);
CREATE INDEX IF NOT EXISTS wearable_data_patient_id_idx ON public.wearable_data (patient_id);
CREATE INDEX IF NOT EXISTS wearable_data_synced_at_idx ON public.wearable_data (synced_at DESC);

-- ====================================================================
-- 7. ENABLE RLS ON NEW TABLES
-- ====================================================================

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conseils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complement_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 8. RLS POLICIES
-- ====================================================================

-- Articles: Public read for published, practitioners can manage
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.articles;
CREATE POLICY "Anyone can read published articles" ON public.articles
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Authenticated users can manage articles" ON public.articles;
CREATE POLICY "Authenticated users can manage articles" ON public.articles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Conseils: Practitioners manage for their patients, patients can read their own
DROP POLICY IF EXISTS "Practitioners manage conseils" ON public.conseils;
CREATE POLICY "Practitioners manage conseils" ON public.conseils
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients read own conseils" ON public.conseils;
CREATE POLICY "Patients read own conseils" ON public.conseils
  FOR SELECT USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Patients update own conseils" ON public.conseils;
CREATE POLICY "Patients update own conseils" ON public.conseils
  FOR UPDATE USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  ) WITH CHECK (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  );

-- Prescriptions: Same pattern as conseils
DROP POLICY IF EXISTS "Practitioners manage prescriptions" ON public.prescriptions;
CREATE POLICY "Practitioners manage prescriptions" ON public.prescriptions
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients read own prescriptions" ON public.prescriptions;
CREATE POLICY "Patients read own prescriptions" ON public.prescriptions
  FOR SELECT USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  );

-- Prescription items: Through prescriptions
DROP POLICY IF EXISTS "Practitioners manage prescription items" ON public.prescription_items;
CREATE POLICY "Practitioners manage prescription items" ON public.prescription_items
  FOR ALL USING (
    prescription_id IN (
      SELECT id FROM public.prescriptions WHERE patient_id IN (
        SELECT id FROM public.patients WHERE practitioner_id = auth.uid()
      )
    )
  ) WITH CHECK (
    prescription_id IN (
      SELECT id FROM public.prescriptions WHERE patient_id IN (
        SELECT id FROM public.patients WHERE practitioner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Patients read own prescription items" ON public.prescription_items;
CREATE POLICY "Patients read own prescription items" ON public.prescription_items
  FOR SELECT USING (
    prescription_id IN (
      SELECT id FROM public.prescriptions WHERE patient_id IN (
        SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
      )
    )
  );

-- Complement tracking: Patients can manage their own
DROP POLICY IF EXISTS "Practitioners view complement tracking" ON public.complement_tracking;
CREATE POLICY "Practitioners view complement tracking" ON public.complement_tracking
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients manage own complement tracking" ON public.complement_tracking;
CREATE POLICY "Patients manage own complement tracking" ON public.complement_tracking
  FOR ALL USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  ) WITH CHECK (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  );

-- Wearable data: Same pattern
DROP POLICY IF EXISTS "Practitioners view wearable data" ON public.wearable_data;
CREATE POLICY "Practitioners view wearable data" ON public.wearable_data
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients manage own wearable data" ON public.wearable_data;
CREATE POLICY "Patients manage own wearable data" ON public.wearable_data
  FOR ALL USING (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  ) WITH CHECK (
    patient_id IN (
      SELECT patient_id FROM public.patient_memberships WHERE patient_user_id = auth.uid()
    )
  );

-- ====================================================================
-- 9. GRANT SERVICE ROLE ACCESS (for mobile API routes)
-- ====================================================================

DROP POLICY IF EXISTS "Service role full access articles" ON public.articles;
CREATE POLICY "Service role full access articles" ON public.articles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access conseils" ON public.conseils;
CREATE POLICY "Service role full access conseils" ON public.conseils
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access prescriptions" ON public.prescriptions;
CREATE POLICY "Service role full access prescriptions" ON public.prescriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access prescription items" ON public.prescription_items;
CREATE POLICY "Service role full access prescription items" ON public.prescription_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access complement tracking" ON public.complement_tracking;
CREATE POLICY "Service role full access complement tracking" ON public.complement_tracking
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access wearable data" ON public.wearable_data;
CREATE POLICY "Service role full access wearable data" ON public.wearable_data
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
