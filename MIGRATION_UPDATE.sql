-- ====================================================================
-- MIGRATION MISE A JOUR AFEIA
-- ====================================================================
-- Pour mettre a jour une base existante SANS supprimer les donnees
-- Genere automatiquement depuis l'analyse du code
-- Date: 2026-01-30
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. CREATION DES TABLES MANQUANTES
-- ====================================================================

-- Table: users (pour l'app mobile)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CONSULTANT', 'PRACTITIONER', 'ADMIN')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: consultant_memberships
CREATE TABLE IF NOT EXISTS public.consultant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    consultant_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id, consultant_user_id)
);

-- Table: consultant_invitations
CREATE TABLE IF NOT EXISTS public.consultant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    city TEXT,
    age INTEGER,
    date_of_birth DATE,
    invitation_code TEXT NOT NULL,
    code_expires_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    invited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: consultant_invites (token-based)
CREATE TABLE IF NOT EXISTS public.consultant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: otp_codes
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT DEFAULT 'activation' CHECK (type IN ('activation', 'login', 'reset')),
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    consultant_id UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
    consultant_first_name TEXT,
    consultant_last_name TEXT,
    consultant_phone TEXT,
    consultant_city TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: consultant_questionnaire_codes
CREATE TABLE IF NOT EXISTS public.consultant_questionnaire_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    sent_to_email TEXT,
    created_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: case_files
CREATE TABLE IF NOT EXISTS public.case_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id)
);

-- Table: anamnese_instances
CREATE TABLE IF NOT EXISTS public.anamnese_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    answers JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id)
);

-- Table: consultant_anamnesis
CREATE TABLE IF NOT EXISTS public.consultant_anamnesis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    naturopath_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    answers JSONB,
    version INTEGER DEFAULT 1,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'preliminary_questionnaire', 'mobile_app')),
    preliminary_questionnaire_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id)
);

-- Table: preliminary_questionnaires
CREATE TABLE IF NOT EXISTS public.preliminary_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    naturopath_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'linked_to_consultant', 'archived')),
    linked_consultant_id UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
    linked_at TIMESTAMPTZ,
    submitted_from_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: anamnesis_history
CREATE TABLE IF NOT EXISTS public.anamnesis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anamnesis_id UUID NOT NULL REFERENCES public.consultant_anamnesis(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    modified_section TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    full_snapshot JSONB,
    version INTEGER NOT NULL,
    modified_by_type TEXT NOT NULL CHECK (modified_by_type IN ('consultant', 'practitioner', 'system')),
    modified_by_id UUID,
    modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: practitioner_notes
CREATE TABLE IF NOT EXISTS public.practitioner_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id, practitioner_id)
);

-- Table: consultant_analysis_results
CREATE TABLE IF NOT EXISTS public.consultant_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    analysis_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: plans
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id)
);

-- Table: plan_versions
CREATE TABLE IF NOT EXISTS public.plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(plan_id, version)
);

-- Table: plan_sections
CREATE TABLE IF NOT EXISTS public.plan_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_version_id UUID NOT NULL REFERENCES public.plan_versions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: consultant_plans
CREATE TABLE IF NOT EXISTS public.consultant_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'shared')),
    content JSONB,
    shared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: care_plans
CREATE TABLE IF NOT EXISTS public.care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    content JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: daily_journals (mobile)
CREATE TABLE IF NOT EXISTS public.daily_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    case_file_id UUID REFERENCES public.case_files(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    mood TEXT,
    alimentation_quality TEXT,
    sleep_quality TEXT,
    energy_level TEXT,
    complements_taken JSONB DEFAULT '[]',
    problemes_particuliers TEXT,
    note_naturopathe TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id, date)
);

-- Table: complements
CREATE TABLE IF NOT EXISTS public.complements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_file_id UUID NOT NULL REFERENCES public.case_files(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration_days INTEGER,
    start_date DATE,
    end_date DATE,
    instructions TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: complement_tracking
CREATE TABLE IF NOT EXISTS public.complement_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
    complement_id UUID NOT NULL REFERENCES public.complements(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    taken BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(consultant_id, complement_id, date)
);

-- Table: subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE CHECK (name IN ('free', 'premium')),
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    features JSONB DEFAULT '[]',
    max_consultants INTEGER,
    circular_integration BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    amount_subtotal DECIMAL(10,2) NOT NULL,
    amount_tax DECIMAL(10,2) DEFAULT 0,
    amount_total DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    invoice_date DATE NOT NULL,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    description TEXT,
    billing_reason TEXT,
    stripe_invoice_id TEXT UNIQUE,
    stripe_invoice_pdf TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: payment_methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('card', 'sepa_debit', 'paypal')),
    is_default BOOLEAN DEFAULT FALSE,
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    sepa_last4 TEXT,
    stripe_payment_method_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: billing_history
CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('subscription_created', 'subscription_updated', 'subscription_canceled', 'payment_succeeded', 'payment_failed', 'invoice_created')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- ====================================================================
-- 2. AJOUT DES COLONNES MANQUANTES SUR TABLES EXISTANTES
-- ====================================================================

-- Table: practitioners
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS default_consultation_reason TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS calendly_url TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Table: consultants
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS consultation_reason TEXT;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'standard';
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS activated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Table: anamneses
ALTER TABLE public.anamneses ADD COLUMN IF NOT EXISTS case_file_id UUID;
ALTER TABLE public.anamneses ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.anamneses ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.anamneses ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Table: messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Table: notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS consultant_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'info';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Table: appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- Table: journal_entries
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS energy TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS adherence_hydratation BOOLEAN DEFAULT FALSE;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS adherence_respiration BOOLEAN DEFAULT FALSE;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS adherence_mouvement BOOLEAN DEFAULT FALSE;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS adherence_plantes BOOLEAN DEFAULT FALSE;

-- Table: wearable_summaries
ALTER TABLE public.wearable_summaries ADD COLUMN IF NOT EXISTS sleep_duration INTEGER;
ALTER TABLE public.wearable_summaries ADD COLUMN IF NOT EXISTS sleep_score INTEGER;
ALTER TABLE public.wearable_summaries ADD COLUMN IF NOT EXISTS hrv_avg INTEGER;
ALTER TABLE public.wearable_summaries ADD COLUMN IF NOT EXISTS activity_level INTEGER;
ALTER TABLE public.wearable_summaries ADD COLUMN IF NOT EXISTS completeness INTEGER;

-- Table: wearable_insights
ALTER TABLE public.wearable_insights ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.wearable_insights ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.wearable_insights ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.wearable_insights ADD COLUMN IF NOT EXISTS suggested_action TEXT;


-- ====================================================================
-- 3. AJOUT DES INDEX MANQUANTS
-- ====================================================================

-- Consultants
CREATE INDEX IF NOT EXISTS idx_consultants_practitioner ON public.consultants(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_consultants_email ON public.consultants(email);
CREATE INDEX IF NOT EXISTS idx_consultants_activated ON public.consultants(activated);
CREATE INDEX IF NOT EXISTS idx_consultants_deleted_at ON public.consultants(deleted_at);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_consultant_invitations_practitioner ON public.consultant_invitations(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_consultant_invitations_email ON public.consultant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_consultant_invitations_status ON public.consultant_invitations(status);

-- OTP codes
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_practitioner ON public.otp_codes(practitioner_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_consultant ON public.messages(consultant_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_practitioner ON public.notifications(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_consultant ON public.notifications(consultant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_consultant ON public.appointments(consultant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_practitioner ON public.appointments(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON public.appointments(starts_at);

-- Consultations
CREATE INDEX IF NOT EXISTS idx_consultations_consultant ON public.consultations(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.consultations(date);

-- Consultant anamnesis
CREATE INDEX IF NOT EXISTS idx_consultant_anamnesis_consultant ON public.consultant_anamnesis(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_anamnesis_naturopath ON public.consultant_anamnesis(naturopath_id);

-- Preliminary questionnaires
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_naturopath ON public.preliminary_questionnaires(naturopath_id);
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_status ON public.preliminary_questionnaires(status);
CREATE INDEX IF NOT EXISTS idx_preliminary_questionnaires_email ON public.preliminary_questionnaires(email);

-- Consultant plans
CREATE INDEX IF NOT EXISTS idx_consultant_plans_consultant ON public.consultant_plans(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_plans_practitioner ON public.consultant_plans(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_consultant_plans_status ON public.consultant_plans(status);

-- Journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_consultant ON public.journal_entries(consultant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date);

-- Wearables
CREATE INDEX IF NOT EXISTS idx_wearable_summaries_consultant ON public.wearable_summaries(consultant_id);
CREATE INDEX IF NOT EXISTS idx_wearable_summaries_date ON public.wearable_summaries(date);
CREATE INDEX IF NOT EXISTS idx_wearable_insights_consultant ON public.wearable_insights(consultant_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_practitioner ON public.subscriptions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_practitioner ON public.invoices(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);


-- ====================================================================
-- 4. ACTIVATION DE RLS SUR LES NOUVELLES TABLES
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_questionnaire_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnese_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preliminary_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complement_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- 5. AJOUT DES POLICIES MANQUANTES
-- ====================================================================

-- OTP codes: politique permissive (necessaire pour activation)
DROP POLICY IF EXISTS "otp_codes_all" ON public.otp_codes;
CREATE POLICY "otp_codes_all" ON public.otp_codes
    FOR ALL USING (true) WITH CHECK (true);

-- Invitations: acces aux invitations de son praticien
DROP POLICY IF EXISTS "invitations_practitioner" ON public.consultant_invitations;
CREATE POLICY "invitations_practitioner" ON public.consultant_invitations
    FOR ALL USING (practitioner_id = auth.uid()) WITH CHECK (practitioner_id = auth.uid());

-- Subscription plans: lecture publique
DROP POLICY IF EXISTS "subscription_plans_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- Subscriptions: acces a ses abonnements
DROP POLICY IF EXISTS "subscriptions_practitioner" ON public.subscriptions;
CREATE POLICY "subscriptions_practitioner" ON public.subscriptions
    FOR ALL USING (practitioner_id = auth.uid());

-- Invoices: acces a ses factures
DROP POLICY IF EXISTS "invoices_practitioner" ON public.invoices;
CREATE POLICY "invoices_practitioner" ON public.invoices
    FOR ALL USING (practitioner_id = auth.uid());

-- Payment methods: acces a ses moyens de paiement
DROP POLICY IF EXISTS "payment_methods_practitioner" ON public.payment_methods;
CREATE POLICY "payment_methods_practitioner" ON public.payment_methods
    FOR ALL USING (practitioner_id = auth.uid());

-- Preliminary questionnaires: lecture publique pour soumission
DROP POLICY IF EXISTS "preliminary_questionnaires_submit" ON public.preliminary_questionnaires;
CREATE POLICY "preliminary_questionnaires_submit" ON public.preliminary_questionnaires
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "preliminary_questionnaires_read" ON public.preliminary_questionnaires;
CREATE POLICY "preliminary_questionnaires_read" ON public.preliminary_questionnaires
    FOR SELECT USING (naturopath_id = auth.uid());

DROP POLICY IF EXISTS "preliminary_questionnaires_update" ON public.preliminary_questionnaires;
CREATE POLICY "preliminary_questionnaires_update" ON public.preliminary_questionnaires
    FOR UPDATE USING (naturopath_id = auth.uid());


-- ====================================================================
-- 6. DONNEES INITIALES (si manquantes)
-- ====================================================================

-- Plans d'abonnement par defaut
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, features, max_consultants, circular_integration, is_active)
VALUES
    ('free', 'Gratuit', 'Plan gratuit pour demarrer', 0, 0, '["Jusqu''a 5 consultants", "Anamnese de base", "Messagerie"]', 5, false, true),
    ('premium', 'Premium', 'Plan premium avec toutes les fonctionnalites', 29.90, 299, '["Consultants illimites", "Integration Circular", "Analyses avancees", "Support prioritaire"]', null, true, true)
ON CONFLICT (name) DO NOTHING;


COMMIT;


-- ====================================================================
-- 7. VERIFICATION
-- ====================================================================

-- Lister toutes les tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Compter les tables
SELECT COUNT(*) as nombre_tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- Lister les colonnes de chaque table
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verifier les index
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verifier les policies RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
