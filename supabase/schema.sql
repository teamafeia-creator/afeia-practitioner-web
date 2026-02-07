-- ============================================
-- AFEIA Practitioner - Database Schema
-- ============================================

-- 1. Table des praticiens (naturopathes)
CREATE TABLE practitioners (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  calendly_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des consultants
CREATE TABLE consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  city TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Anamnèse (questionnaire initial)
CREATE TABLE anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID UNIQUE REFERENCES consultants(id) ON DELETE CASCADE,
  motif TEXT,
  objectifs TEXT,
  alimentation TEXT,
  digestion TEXT,
  sommeil TEXT,
  stress TEXT,
  complement TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Consultations
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Plans d'accompagnement
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Versions des plans (pour l'historique)
CREATE TABLE plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sections de chaque version de plan
CREATE TABLE plan_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id UUID REFERENCES plan_versions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 8. Journal quotidien du consultant
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT CHECK (mood IN ('🙂', '😐', '🙁')),
  energy TEXT CHECK (energy IN ('Bas', 'Moyen', 'Élevé')),
  text TEXT,
  adherence_hydratation BOOLEAN DEFAULT FALSE,
  adherence_respiration BOOLEAN DEFAULT FALSE,
  adherence_mouvement BOOLEAN DEFAULT FALSE,
  adherence_plantes BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Messages (chat praticien-consultant)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  sender TEXT CHECK (sender IN ('consultant', 'praticien')) NOT NULL,
  text TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 10. Données wearable (Circular Ring)
CREATE TABLE wearable_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_duration DECIMAL(3,1),
  sleep_score INTEGER,
  hrv_avg INTEGER,
  activity_level INTEGER,
  completeness DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consultant_id, date)
);

-- 11. Insights générés depuis les données wearable
CREATE TABLE wearable_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('sleep', 'hrv', 'activity')),
  level TEXT CHECK (level IN ('info', 'attention')),
  message TEXT,
  suggested_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT CHECK (level IN ('info', 'attention')) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Trigger : créer automatiquement un profil praticien
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_practitioner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.practitioners (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_practitioner();

-- ============================================
-- Index pour de meilleures performances
-- ============================================
CREATE INDEX idx_consultants_practitioner ON consultants(practitioner_id);
CREATE INDEX idx_consultations_consultant ON consultations(consultant_id);
CREATE INDEX idx_messages_consultant ON messages(consultant_id);
CREATE INDEX idx_journal_consultant_date ON journal_entries(consultant_id, date);
CREATE INDEX idx_wearable_consultant_date ON wearable_summaries(consultant_id, date);
CREATE INDEX idx_notifications_practitioner ON notifications(practitioner_id);

-- ============================================
-- Row Level Security (RLS) - Sécurité
-- ============================================
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politique : les praticiens voient uniquement leurs propres données
CREATE POLICY "Practitioners can select own profile" ON practitioners
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Practitioners can insert own profile" ON practitioners
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Practitioners can update own profile" ON practitioners
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Practitioners can delete own profile" ON practitioners
  FOR DELETE USING (auth.uid() = id);

CREATE POLICY "Practitioners can select own consultants" ON consultants
  FOR SELECT USING (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can insert own consultants" ON consultants
  FOR INSERT WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can update own consultants" ON consultants
  FOR UPDATE USING (practitioner_id = auth.uid()) WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can delete own consultants" ON consultants
  FOR DELETE USING (practitioner_id = auth.uid());

CREATE POLICY "Access own consultant anamneses" ON anamneses
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant consultations" ON consultations
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant plans" ON plans
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant plan_versions" ON plan_versions
  FOR ALL USING (plan_id IN (SELECT p.id FROM plans p JOIN consultants pt ON p.consultant_id = pt.id WHERE pt.practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant plan_sections" ON plan_sections
  FOR ALL USING (plan_version_id IN (SELECT pv.id FROM plan_versions pv JOIN plans p ON pv.plan_id = p.id JOIN consultants pt ON p.consultant_id = pt.id WHERE pt.practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant journal" ON journal_entries
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant messages" ON messages
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant wearable_summaries" ON wearable_summaries
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own consultant wearable_insights" ON wearable_insights
  FOR ALL USING (consultant_id IN (SELECT id FROM consultants WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own notifications" ON notifications
  FOR ALL USING (practitioner_id = auth.uid());
