-- ============================================
-- AFEIA Practitioner - Database Schema
-- ============================================

-- 1. Table des praticiens (naturopathes)
CREATE TABLE practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  city TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Anamnèse (questionnaire initial)
CREATE TABLE anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
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
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Plans d'accompagnement
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
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

-- 8. Journal quotidien du patient
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
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

-- 9. Messages (chat praticien-patient)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  sender TEXT CHECK (sender IN ('patient', 'praticien')) NOT NULL,
  text TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 10. Données wearable (Circular Ring)
CREATE TABLE wearable_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_duration DECIMAL(3,1),
  sleep_score INTEGER,
  hrv_avg INTEGER,
  activity_level INTEGER,
  completeness DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, date)
);

-- 11. Insights générés depuis les données wearable
CREATE TABLE wearable_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
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
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT CHECK (level IN ('info', 'attention')) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Index pour de meilleures performances
-- ============================================
CREATE INDEX idx_patients_practitioner ON patients(practitioner_id);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_messages_patient ON messages(patient_id);
CREATE INDEX idx_journal_patient_date ON journal_entries(patient_id, date);
CREATE INDEX idx_wearable_patient_date ON wearable_summaries(patient_id, date);
CREATE INDEX idx_notifications_practitioner ON notifications(practitioner_id);

-- ============================================
-- Row Level Security (RLS) - Sécurité
-- ============================================
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Practitioners see own data" ON practitioners
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Practitioners see own patients" ON patients
  FOR ALL USING (practitioner_id = auth.uid());

CREATE POLICY "Access own patient anamneses" ON anamneses
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own patient consultations" ON consultations
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own patient plans" ON plans
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own patient plan_versions" ON plan_versions
  FOR ALL USING (plan_id IN (SELECT p.id FROM plans p JOIN patients pt ON p.patient_id = pt.id WHERE pt.practitioner_id = auth.uid()));

CREATE POLICY "Access own patient plan_sections" ON plan_sections
  FOR ALL USING (plan_version_id IN (SELECT pv.id FROM plan_versions pv JOIN plans p ON pv.plan_id = p.id JOIN patients pt ON p.patient_id = pt.id WHERE pt.practitioner_id = auth.uid()));

CREATE POLICY "Access own patient journal" ON journal_entries
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own patient messages" ON messages
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own patient wearable_summaries" ON wearable_summaries
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own patient wearable_insights" ON wearable_insights
  FOR ALL USING (patient_id IN (SELECT id FROM patients WHERE practitioner_id = auth.uid()));

CREATE POLICY "Access own notifications" ON notifications
  FOR ALL USING (practitioner_id = auth.uid());
