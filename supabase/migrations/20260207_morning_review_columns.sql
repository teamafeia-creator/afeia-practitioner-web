-- Migration: Add columns for Morning Review feature
-- Adds snooze functionality and Circular Ring tracking to consultants

-- Snooze: allows practitioners to temporarily pause attention alerts for a consultant
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS is_snoozed BOOLEAN DEFAULT FALSE;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS snooze_reason TEXT;

-- Circular Ring: tracks whether the consultant has a connected Circular Ring
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS has_circular_ring BOOLEAN DEFAULT FALSE;

-- Practitioner actions log for morning review tracking
CREATE TABLE IF NOT EXISTS practitioner_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('snooze', 'unsnooze', 'send_message', 'note_observation', 'celebrate', 'review_completed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for practitioner_actions
ALTER TABLE practitioner_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners can manage own actions" ON practitioner_actions
  FOR ALL USING (practitioner_id = auth.uid());

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_practitioner_actions_practitioner ON practitioner_actions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_actions_consultant ON practitioner_actions(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultants_snoozed ON consultants(is_snoozed) WHERE is_snoozed = TRUE;
