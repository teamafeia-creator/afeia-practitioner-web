-- =============================================================================
-- MIGRATION: Fix book_appointment RPC - patient_id → consultant_id
-- Date: 2026-02-17
-- Description: The book_appointment function referenced the old column name
--   patient_id which was renamed to consultant_id. This caused all online
--   bookings to fail with "column patient_id does not exist".
-- =============================================================================

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

  -- Create the appointment (fixed: consultant_id instead of patient_id)
  INSERT INTO appointments (
    practitioner_id, consultant_id, consultation_type_id,
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
