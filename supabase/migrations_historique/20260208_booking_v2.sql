-- =============================================================================
-- MIGRATION: Online Booking V2 - AFEIA
-- Date: 2026-02-08
-- Description: Booking slug, practitioner config, booking RPC, RLS for public access
-- Idempotent: YES - safe to run multiple times
-- =============================================================================

-- 1. Add booking columns to practitioners
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS booking_intro_text TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS booking_address TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS booking_phone TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS cancellation_policy_hours INT DEFAULT 24;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS cancellation_policy_text TEXT;

-- Index for fast slug lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioners_booking_slug
  ON practitioners(booking_slug) WHERE booking_slug IS NOT NULL;

-- 2. Add source column to consultants if not exists
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 3. RLS policies for public (anon) read access to booking data
-- Allow anon users to read practitioner public booking info
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practitioners' AND policyname = 'Public read booking info'
  ) THEN
    CREATE POLICY "Public read booking info"
      ON practitioners FOR SELECT
      USING (booking_enabled = TRUE AND booking_slug IS NOT NULL);
  END IF;
END $$;

-- Allow anon users to read active bookable consultation types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consultation_types' AND policyname = 'Public read bookable types'
  ) THEN
    CREATE POLICY "Public read bookable types"
      ON consultation_types FOR SELECT
      USING (is_active = TRUE AND is_bookable_online = TRUE);
  END IF;
END $$;

-- Allow anon users to read availability schedules
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'availability_schedules' AND policyname = 'Public read availability'
  ) THEN
    CREATE POLICY "Public read availability"
      ON availability_schedules FOR SELECT
      USING (is_active = TRUE);
  END IF;
END $$;

-- Allow anon users to read availability overrides
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'availability_overrides' AND policyname = 'Public read overrides'
  ) THEN
    CREATE POLICY "Public read overrides"
      ON availability_overrides FOR SELECT
      USING (TRUE);
  END IF;
END $$;

-- 4. RPC: book_appointment (atomic, conflict-safe)
CREATE OR REPLACE FUNCTION book_appointment(
  p_practitioner_id UUID,
  p_consultation_type_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_booking_name TEXT,
  p_booking_email TEXT,
  p_booking_phone TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment_id UUID;
  v_conflict_count INT;
  v_consultant_id UUID;
BEGIN
  -- Check for conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments
  WHERE practitioner_id = p_practitioner_id
    AND status NOT IN ('cancelled', 'rescheduled')
    AND starts_at < p_ends_at
    AND ends_at > p_starts_at;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_CONFLICT: Ce créneau n''est plus disponible';
  END IF;

  -- Try to match existing consultant by email
  IF p_booking_email IS NOT NULL THEN
    SELECT id INTO v_consultant_id
    FROM consultants
    WHERE email = p_booking_email
      AND practitioner_id = p_practitioner_id
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- If no match, create a new consultant record
  IF v_consultant_id IS NULL THEN
    INSERT INTO consultants (
      practitioner_id, name, email, phone, source
    ) VALUES (
      p_practitioner_id,
      p_booking_name,
      p_booking_email,
      p_booking_phone,
      'online_booking'
    )
    RETURNING id INTO v_consultant_id;
  END IF;

  -- Create the appointment
  INSERT INTO appointments (
    practitioner_id, patient_id, consultation_type_id,
    starts_at, ends_at, status, source,
    booking_name, booking_email, booking_phone,
    notes_public
  ) VALUES (
    p_practitioner_id, v_consultant_id, p_consultation_type_id,
    p_starts_at, p_ends_at, 'confirmed', 'online_booking',
    p_booking_name, p_booking_email, p_booking_phone,
    p_reason
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

-- Grant execute permission to anon role for booking
GRANT EXECUTE ON FUNCTION book_appointment TO anon;
GRANT EXECUTE ON FUNCTION book_appointment TO authenticated;
