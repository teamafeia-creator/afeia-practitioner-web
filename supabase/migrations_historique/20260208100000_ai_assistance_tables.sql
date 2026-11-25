-- ============================================
-- AI Assistance Tables for AFEIA
-- Adds AI generation support for conseillanciers
-- ============================================

-- 1. Add AI metadata columns to existing consultant_plans table
ALTER TABLE public.consultant_plans
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_generation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_feedback JSONB;

-- 2. Create practitioner_ai_profiles table
CREATE TABLE IF NOT EXISTS public.practitioner_ai_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID UNIQUE NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,

  -- Preferences de style
  formation TEXT, -- 'Marchesseau', 'Kieffer', 'CENATHO', 'ISUPNAT', 'Autre'
  formation_detail TEXT,
  longueur_preferee TEXT DEFAULT 'detaille' CHECK (longueur_preferee IN ('concis', 'detaille', 'tres_detaille')),
  ton TEXT DEFAULT 'chaleureux' CHECK (ton IN ('professionnel', 'chaleureux', 'coach')),

  -- Approches privilegiees (multi-select)
  approches TEXT[] DEFAULT '{}',

  -- Plantes / complements favoris
  plantes_favorites TEXT,
  complements_favoris TEXT,

  -- Exemples de formulations (few-shot)
  exemples_formulations TEXT,

  -- Statistiques d'usage
  total_generations INTEGER DEFAULT 0,
  generations_this_month INTEGER DEFAULT 0,
  month_reset_date DATE DEFAULT CURRENT_DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for practitioner_ai_profiles
ALTER TABLE practitioner_ai_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners can manage their AI profile"
  ON practitioner_ai_profiles FOR ALL
  USING (practitioner_id = auth.uid())
  WITH CHECK (practitioner_id = auth.uid());

-- 3. Create ai_generation_logs table
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES consultant_plans(id) ON DELETE SET NULL,

  generation_type TEXT NOT NULL CHECK (generation_type IN ('full', 'section', 'regenerate')),
  section_name TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'filtered')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_practitioner ON ai_generation_logs(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_generation_logs(created_at);

-- RLS for ai_generation_logs
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners can view their AI logs"
  ON ai_generation_logs FOR SELECT
  USING (practitioner_id = auth.uid());

-- Allow inserts from service role (API routes use admin client)
CREATE POLICY "Service can insert AI logs"
  ON ai_generation_logs FOR INSERT
  WITH CHECK (true);
