-- =============================================================================
-- MIGRATION: Native Agenda V1 - AFEIA
-- Date: 2026-02-07
-- Description: Tables for consultation types, availability, and appointments enhancements
-- Idempotent: YES - safe to run multiple times
-- =============================================================================

-- 1.1 Table consultation_types
CREATE TABLE IF NOT EXISTS consultation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  price_cents INT,
  color TEXT DEFAULT '#4CAF50',
  buffer_minutes INT DEFAULT 15,
  is_bookable_online BOOLEAN DEFAULT TRUE,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultation_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consultation_types' AND policyname = 'Practitioners manage own consultation_types'
  ) THEN
    CREATE POLICY "Practitioners manage own consultation_types"
      ON consultation_types FOR ALL
      USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultation_types_practitioner ON consultation_types(practitioner_id);

-- 1.2 Table availability_schedules
CREATE TABLE IF NOT EXISTS availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'availability_schedules' AND policyname = 'Practitioners manage own availability'
  ) THEN
    CREATE POLICY "Practitioners manage own availability"
      ON availability_schedules FOR ALL
      USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_availability_practitioner ON availability_schedules(practitioner_id);

-- 1.3 Table availability_overrides
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'availability_overrides' AND policyname = 'Practitioners manage own overrides'
  ) THEN
    CREATE POLICY "Practitioners manage own overrides"
      ON availability_overrides FOR ALL
      USING (practitioner_id = auth.uid())
      WITH CHECK (practitioner_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_overrides_practitioner_date ON availability_overrides(practitioner_id, date);

-- 1.4 Evolve appointments table - add new columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_type_id UUID REFERENCES consultation_types(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'in_person';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_link TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes_internal TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes_public TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES appointments(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_email TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_phone TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Migrate existing notes to notes_internal
UPDATE appointments SET notes_internal = notes WHERE notes IS NOT NULL AND notes_internal IS NULL;

-- Set default status for new appointments
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'confirmed';

-- Fill in missing ends_at
UPDATE appointments SET ends_at = starts_at + INTERVAL '60 minutes' WHERE ends_at IS NULL;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_consultation_type ON appointments(consultation_type_id);

-- 1.5 Fix RLS policies on appointments (old policies reference patient_id / patients which no longer exist)
DROP POLICY IF EXISTS "Practitioners access own appointments" ON appointments;
DROP POLICY IF EXISTS "Patients access own appointments" ON appointments;
DROP POLICY IF EXISTS "appointments_select_own" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_own" ON appointments;
DROP POLICY IF EXISTS "appointments_update_own" ON appointments;
DROP POLICY IF EXISTS "appointments_delete_own" ON appointments;

CREATE POLICY "appointments_select_own" ON appointments
  FOR SELECT USING (practitioner_id = auth.uid());
CREATE POLICY "appointments_insert_own" ON appointments
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());
CREATE POLICY "appointments_update_own" ON appointments
  FOR UPDATE USING (practitioner_id = auth.uid()) WITH CHECK (practitioner_id = auth.uid());
CREATE POLICY "appointments_delete_own" ON appointments
  FOR DELETE USING (practitioner_id = auth.uid());

-- 1.6 Migrate consultations to appointments (legacy data)
-- Only run if both tables exist and there are consultations not yet migrated
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultations') THEN
    INSERT INTO appointments (consultant_id, practitioner_id, starts_at, ends_at, status, notes_internal, source, created_at)
    SELECT
      c.consultant_id,
      ct.practitioner_id,
      c.date,
      c.date + INTERVAL '60 minutes',
      'completed',
      c.notes,
      'legacy_migration',
      c.created_at
    FROM consultations c
    JOIN consultants ct ON ct.id = c.consultant_id
    WHERE ct.practitioner_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.consultant_id = c.consultant_id
      AND a.starts_at = c.date
      AND a.source = 'legacy_migration'
    );
  END IF;
END $$;
