BEGIN;

-- ============================================================
-- Phase 1: Admin Refactor — New tables & columns
-- ============================================================

-- 1. admin_profiles — replaces admin_allowlist for auth
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON public.admin_profiles(email);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manage admin_profiles" ON public.admin_profiles;
CREATE POLICY "Super admin manage admin_profiles" ON public.admin_profiles
  FOR ALL USING (public.is_admin(auth.jwt()->>'email'))
  WITH CHECK (public.is_admin(auth.jwt()->>'email'));

-- 2. admin_audit_log — tracks all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access audit log" ON public.admin_audit_log;
CREATE POLICY "Admin access audit log" ON public.admin_audit_log
  FOR ALL USING (public.is_admin(auth.jwt()->>'email'))
  WITH CHECK (public.is_admin(auth.jwt()->>'email'));

-- 3. practitioner_activity_log — tracks practitioner events for dashboard
CREATE TABLE IF NOT EXISTS public.practitioner_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_practitioner ON public.practitioner_activity_log(practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.practitioner_activity_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.practitioner_activity_log(created_at DESC);

ALTER TABLE public.practitioner_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access activity log" ON public.practitioner_activity_log;
CREATE POLICY "Admin access activity log" ON public.practitioner_activity_log
  FOR SELECT USING (public.is_admin(auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Practitioner insert own activity" ON public.practitioner_activity_log;
CREATE POLICY "Practitioner insert own activity" ON public.practitioner_activity_log
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());

-- 4. Add last_login_at to practitioners_public
ALTER TABLE public.practitioners_public
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 5. Seed admin_profiles from admin_allowlist for migration continuity
INSERT INTO public.admin_profiles (user_id, email, role)
SELECT u.id, a.email, 'super_admin'
FROM public.admin_allowlist a
JOIN auth.users u ON lower(u.email) = lower(a.email)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
