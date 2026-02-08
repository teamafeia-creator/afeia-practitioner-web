-- ============================================
-- V3: Google Calendar Sync & Email Reminders
-- ============================================
-- This migration creates all tables needed for:
-- 1. Google Calendar OAuth2 connections
-- 2. Appointment reminders (email)
-- 3. Reminder unsubscribes
-- 4. Practitioner reminder settings

-- ============================================
-- 1. Google Calendar Connections
-- ============================================
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL UNIQUE REFERENCES practitioners(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  google_email TEXT,
  calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners manage own google connection"
  ON google_calendar_connections FOR ALL
  USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Service role full access on google_calendar_connections"
  ON google_calendar_connections FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- 2. Appointment Reminders
-- ============================================
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'email',
  trigger_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners view own appointment reminders"
  ON appointment_reminders FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE practitioner_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on appointment_reminders"
  ON appointment_reminders FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_reminders_scheduled
  ON appointment_reminders(scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reminders_appointment
  ON appointment_reminders(appointment_id);

-- ============================================
-- 3. Reminder Unsubscribes
-- ============================================
CREATE TABLE IF NOT EXISTS reminder_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_unsubscribe UNIQUE (practitioner_id, email)
);

ALTER TABLE reminder_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on reminder_unsubscribes"
  ON reminder_unsubscribes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- 4. Practitioner Reminder Settings
-- ============================================
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS reminder_24h_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS reminder_2h_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS reminder_post_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS reminder_24h_template TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS reminder_2h_template TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS reminder_post_template TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS reminder_post_delay_hours INT DEFAULT 24;

-- ============================================
-- 5. Index for google_event_id lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id
  ON appointments(google_event_id)
  WHERE google_event_id IS NOT NULL;
