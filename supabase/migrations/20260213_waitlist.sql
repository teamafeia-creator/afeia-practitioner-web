-- ============================================
-- WAITLIST / ALERTE DESISTEMENT
-- ============================================

-- Table: waitlist_entries
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  consultation_type_id UUID REFERENCES consultation_types(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  phone TEXT,
  preferred_time_of_day TEXT NOT NULL DEFAULT 'any'
    CHECK (preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'any')),
  preferred_days INTEGER[] NOT NULL DEFAULT '{}',
  notified_at TIMESTAMPTZ,
  notified_for_slot TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_practitioner_type
  ON waitlist_entries (practitioner_id, consultation_type_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_practitioner_expires
  ON waitlist_entries (practitioner_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_waitlist_active
  ON waitlist_entries (practitioner_id)
  WHERE notified_at IS NULL AND fulfilled_at IS NULL AND expires_at > now();

-- RLS
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Policy: anon can INSERT (public waitlist form)
DO $$ BEGIN
  CREATE POLICY waitlist_anon_insert ON waitlist_entries
    FOR INSERT TO anon
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM practitioners p
        WHERE p.id = practitioner_id
          AND p.booking_enabled = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: authenticated can SELECT own entries
DO $$ BEGIN
  CREATE POLICY waitlist_auth_select ON waitlist_entries
    FOR SELECT TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: authenticated can DELETE own entries
DO $$ BEGIN
  CREATE POLICY waitlist_auth_delete ON waitlist_entries
    FOR DELETE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Optional: add waitlist_enabled column to practitioners
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT true;
