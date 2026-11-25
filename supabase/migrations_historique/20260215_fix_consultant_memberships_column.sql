-- Fix: rename patient_id → consultant_id in consultant_memberships
-- The migration 20260207_rename_patient_to_consultant.sql missed this column.
-- It renamed patient_user_id → consultant_user_id but forgot patient_id → consultant_id.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consultant_memberships'
      AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE public.consultant_memberships RENAME COLUMN patient_id TO consultant_id;
    RAISE NOTICE 'Renamed consultant_memberships.patient_id → consultant_id';
  ELSE
    RAISE NOTICE 'Column patient_id not found in consultant_memberships (already renamed or does not exist)';
  END IF;
END $$;
