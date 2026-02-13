-- Migration: Video conferencing with Daily.co
-- Adds video_provider to practitioners and video_room_name to appointments

-- Add video_provider column to practitioners
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS video_provider TEXT DEFAULT 'external';

DO $$ BEGIN
  ALTER TABLE practitioners ADD CONSTRAINT practitioners_video_provider_check
    CHECK (video_provider IN ('external', 'daily'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add daily_api_key column to practitioners (for V2 - per-practitioner keys)
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS daily_api_key TEXT;

-- Add video_room_name column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_room_name TEXT;
