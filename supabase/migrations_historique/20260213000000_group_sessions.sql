-- ============================================
-- Migration: Group Sessions (Séances Collectives / Ateliers)
-- Date: 2026-02-13
-- ============================================

-- 1a. Colonnes supplémentaires sur consultation_types
DO $$ BEGIN
  ALTER TABLE consultation_types ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE consultation_types ADD COLUMN max_participants INT NOT NULL DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE consultation_types ADD COLUMN price_per_participant BOOLEAN NOT NULL DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Constraint: is_group=true => max_participants >= 2, is_group=false => max_participants = 1
DO $$ BEGIN
  ALTER TABLE consultation_types
    ADD CONSTRAINT chk_group_participants
    CHECK (
      (is_group = true AND max_participants >= 2)
      OR (is_group = false AND max_participants = 1)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1b. Table group_sessions
CREATE TABLE IF NOT EXISTS group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  consultation_type_id UUID NOT NULL REFERENCES consultation_types(id),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('in_person', 'video', 'home_visit')),
  location_details TEXT,
  max_participants INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes_internal TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_sessions_practitioner_starts
  ON group_sessions (practitioner_id, starts_at);

-- 1c. Table group_session_registrations
CREATE TABLE IF NOT EXISTS group_session_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES consultants(id),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'attended', 'no_show', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'online_booking')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: no duplicate email per session
DO $$ BEGIN
  ALTER TABLE group_session_registrations
    ADD CONSTRAINT uq_group_session_email UNIQUE (group_session_id, email);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_group_session_registrations_session
  ON group_session_registrations (group_session_id);

CREATE INDEX IF NOT EXISTS idx_group_session_registrations_consultant
  ON group_session_registrations (consultant_id);

-- 1d. RLS

-- group_sessions RLS
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY group_sessions_auth_select ON group_sessions
    FOR SELECT TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_sessions_auth_insert ON group_sessions
    FOR INSERT TO authenticated
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_sessions_auth_update ON group_sessions
    FOR UPDATE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_sessions_auth_delete ON group_sessions
    FOR DELETE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_sessions_anon_select ON group_sessions
    FOR SELECT TO anon
    USING (status IN ('scheduled', 'confirmed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- group_session_registrations RLS
ALTER TABLE group_session_registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY group_registrations_auth_select ON group_session_registrations
    FOR SELECT TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_registrations_auth_insert ON group_session_registrations
    FOR INSERT TO authenticated
    WITH CHECK (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_registrations_auth_update ON group_session_registrations
    FOR UPDATE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_registrations_auth_delete ON group_session_registrations
    FOR DELETE TO authenticated
    USING (practitioner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY group_registrations_anon_insert ON group_session_registrations
    FOR INSERT TO anon
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1e. RPC: get active registration count for a session
CREATE OR REPLACE FUNCTION get_group_session_registration_count(p_session_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INT
  FROM group_session_registrations
  WHERE group_session_id = p_session_id
    AND status != 'cancelled';
$$;
