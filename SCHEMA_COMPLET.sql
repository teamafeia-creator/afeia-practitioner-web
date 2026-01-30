-- ====================================================================
-- SCHEMA COMPLET AFEIA - BASE DE DONNEES SUPABASE
-- ====================================================================
-- Genere automatiquement depuis l'analyse du code
-- Date: 2026-01-30
--
-- ATTENTION: Ce script SUPPRIME et RECREE toutes les tables!
-- Utilisez MIGRATION_UPDATE.sql pour une mise a jour sans perte de donnees.
-- ====================================================================

BEGIN;

-- ====================================================================
-- SUPPRESSION DES TABLES EXISTANTES (ordre inverse des dependances)
-- ====================================================================

DROP TABLE IF EXISTS public.billing_history CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.complement_tracking CASCADE;
DROP TABLE IF EXISTS public.complements CASCADE;
DROP TABLE IF EXISTS public.daily_journals CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.wearable_insights CASCADE;
DROP TABLE IF EXISTS public.wearable_summaries CASCADE;
DROP TABLE IF EXISTS public.plan_sections CASCADE;
DROP TABLE IF EXISTS public.plan_versions CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.patient_plans CASCADE;
DROP TABLE IF EXISTS public.care_plans CASCADE;
DROP TABLE IF EXISTS public.anamnesis_history CASCADE;
DROP TABLE IF EXISTS public.patient_anamnesis CASCADE;
DROP TABLE IF EXISTS public.anamnese_instances CASCADE;
DROP TABLE IF EXISTS public.anamneses CASCADE;
DROP TABLE IF EXISTS public.preliminary_questionnaires CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.practitioner_notes CASCADE;
DROP TABLE IF EXISTS public.patient_analysis_results CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.consultations CASCADE;
DROP TABLE IF EXISTS public.case_files CASCADE;
DROP TABLE IF EXISTS public.patient_questionnaire_codes CASCADE;
DROP TABLE IF EXISTS public.otp_codes CASCADE;
DROP TABLE IF EXISTS public.patient_memberships CASCADE;
DROP TABLE IF EXISTS public.patient_invites CASCADE;
DROP TABLE IF EXISTS public.patient_invitations CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.practitioners CASCADE;

-- ====================================================================
-- TABLE: practitioners
-- Praticiens/Naturopathes - lies a auth.users
-- ====================================================================
CREATE TABLE public.practitioners (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    default_consultation_reason TEXT,
    calendly_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: patients
-- Patients d'un praticien
-- ====================================================================
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    city TEXT,
    age INTEGER,
    date_of_birth DATE,
    consultation_reason TEXT,
    status TEXT DEFAULT 'standard' CHECK (status IN ('standard', 'premium')),
    is_premium BOOLEAN DEFAULT FALSE,
    activated BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: users (pour l'app mobile)
-- Comptes utilisateurs independants de auth.users
-- ====================================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('PATIENT', 'PRACTITIONER', 'ADMIN')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: patient_memberships
-- Lien entre patients et users (app mobile)
-- ====================================================================
CREATE TABLE public.patient_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id, patient_user_id)
);

-- ====================================================================
-- TABLE: patient_invitations
-- Invitations envoyees aux patients
-- ====================================================================
CREATE TABLE public.patient_invitations (
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

-- ====================================================================
-- TABLE: patient_invites (token-based)
-- Invitations par token
-- ====================================================================
CREATE TABLE public.patient_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: otp_codes
-- Codes OTP pour activation patient
-- ====================================================================
CREATE TABLE public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT DEFAULT 'activation' CHECK (type IN ('activation', 'login', 'reset')),
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_first_name TEXT,
    patient_last_name TEXT,
    patient_phone TEXT,
    patient_city TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: patient_questionnaire_codes
-- Codes pour questionnaires patients (hashes)
-- ====================================================================
CREATE TABLE public.patient_questionnaire_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    sent_to_email TEXT,
    created_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: case_files
-- Dossiers patients
-- ====================================================================
CREATE TABLE public.case_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id)
);

-- ====================================================================
-- TABLE: consultations
-- Historique des consultations
-- ====================================================================
CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: appointments
-- Rendez-vous
-- ====================================================================
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed', 'done')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: anamneses
-- Anamneses (structure legacy)
-- ====================================================================
CREATE TABLE public.anamneses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    case_file_id UUID REFERENCES public.case_files(id) ON DELETE SET NULL,
    motif TEXT,
    objectifs TEXT,
    alimentation TEXT,
    digestion TEXT,
    sommeil TEXT,
    stress TEXT,
    complement TEXT,
    allergies TEXT,
    data JSONB,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id)
);

-- ====================================================================
-- TABLE: anamnese_instances
-- Instances d'anamnese (legacy)
-- ====================================================================
CREATE TABLE public.anamnese_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    answers JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id)
);

-- ====================================================================
-- TABLE: patient_anamnesis
-- Nouvelle table d'anamnese (structure modernisee)
-- ====================================================================
CREATE TABLE public.patient_anamnesis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    naturopath_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    answers JSONB,
    version INTEGER DEFAULT 1,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'preliminary_questionnaire', 'mobile_app')),
    preliminary_questionnaire_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id)
);

-- ====================================================================
-- TABLE: preliminary_questionnaires
-- Questionnaires preliminaires publics
-- ====================================================================
CREATE TABLE public.preliminary_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    naturopath_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'linked_to_patient', 'archived')),
    linked_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    linked_at TIMESTAMPTZ,
    submitted_from_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ajouter la FK apres creation de la table
ALTER TABLE public.patient_anamnesis
    ADD CONSTRAINT fk_preliminary_questionnaire
    FOREIGN KEY (preliminary_questionnaire_id)
    REFERENCES public.preliminary_questionnaires(id) ON DELETE SET NULL;

-- ====================================================================
-- TABLE: anamnesis_history
-- Historique des modifications d'anamnese
-- ====================================================================
CREATE TABLE public.anamnesis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anamnesis_id UUID NOT NULL REFERENCES public.patient_anamnesis(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    modified_section TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    full_snapshot JSONB,
    version INTEGER NOT NULL,
    modified_by_type TEXT NOT NULL CHECK (modified_by_type IN ('patient', 'practitioner', 'system')),
    modified_by_id UUID,
    modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: messages
-- Messages entre patients et praticiens
-- ====================================================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('patient', 'praticien')),
    sender_role TEXT CHECK (sender_role IN ('patient', 'practitioner')),
    sender_type TEXT CHECK (sender_type IN ('patient', 'practitioner')),
    text TEXT,
    body TEXT,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: notifications
-- Notifications
-- ====================================================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'general' CHECK (type IN ('general', 'anamnesis_modified', 'new_preliminary_questionnaire', 'questionnaire_linked', 'message', 'appointment')),
    title TEXT NOT NULL,
    description TEXT,
    level TEXT DEFAULT 'info' CHECK (level IN ('info', 'attention')),
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: practitioner_notes
-- Notes du praticien sur un patient
-- ====================================================================
CREATE TABLE public.practitioner_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id, practitioner_id)
);

-- ====================================================================
-- TABLE: patient_analysis_results
-- Resultats d'analyses patient
-- ====================================================================
CREATE TABLE public.patient_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
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

-- ====================================================================
-- TABLE: plans
-- Plans de soins (structure hierarchique)
-- ====================================================================
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id)
);

-- ====================================================================
-- TABLE: plan_versions
-- Versions d'un plan
-- ====================================================================
CREATE TABLE public.plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(plan_id, version)
);

-- ====================================================================
-- TABLE: plan_sections
-- Sections d'une version de plan
-- ====================================================================
CREATE TABLE public.plan_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_version_id UUID NOT NULL REFERENCES public.plan_versions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: patient_plans
-- Plans patient (structure simplifiee)
-- ====================================================================
CREATE TABLE public.patient_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'shared')),
    content JSONB,
    shared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: care_plans (fallback)
-- Plans de soins alternatifs
-- ====================================================================
CREATE TABLE public.care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    content JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: journal_entries
-- Journal de suivi (web)
-- ====================================================================
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mood TEXT CHECK (mood IN ('happy', 'neutral', 'sad')),
    energy TEXT CHECK (energy IN ('Bas', 'Moyen', 'Eleve')),
    text TEXT,
    adherence_hydratation BOOLEAN DEFAULT FALSE,
    adherence_respiration BOOLEAN DEFAULT FALSE,
    adherence_mouvement BOOLEAN DEFAULT FALSE,
    adherence_plantes BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id, date)
);

-- ====================================================================
-- TABLE: daily_journals
-- Journal quotidien (app mobile)
-- ====================================================================
CREATE TABLE public.daily_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
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
    UNIQUE(patient_id, date)
);

-- ====================================================================
-- TABLE: wearable_summaries
-- Donnees resumees des wearables
-- ====================================================================
CREATE TABLE public.wearable_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sleep_duration INTEGER,
    sleep_score INTEGER,
    hrv_avg INTEGER,
    activity_level INTEGER,
    completeness INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id, date)
);

-- ====================================================================
-- TABLE: wearable_insights
-- Insights generes depuis les wearables
-- ====================================================================
CREATE TABLE public.wearable_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('sleep', 'hrv', 'activity')),
    level TEXT CHECK (level IN ('info', 'attention')),
    message TEXT,
    suggested_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: complements
-- Complements alimentaires prescrits
-- ====================================================================
CREATE TABLE public.complements (
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

-- ====================================================================
-- TABLE: complement_tracking
-- Suivi de prise des complements
-- ====================================================================
CREATE TABLE public.complement_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    complement_id UUID NOT NULL REFERENCES public.complements(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    taken BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(patient_id, complement_id, date)
);

-- ====================================================================
-- TABLE: subscription_plans
-- Plans d'abonnement disponibles
-- ====================================================================
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE CHECK (name IN ('free', 'premium')),
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    features JSONB DEFAULT '[]',
    max_patients INTEGER,
    circular_integration BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- TABLE: subscriptions
-- Abonnements des praticiens
-- ====================================================================
CREATE TABLE public.subscriptions (
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

-- ====================================================================
-- TABLE: invoices
-- Factures
-- ====================================================================
CREATE TABLE public.invoices (
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

-- ====================================================================
-- TABLE: payment_methods
-- Moyens de paiement
-- ====================================================================
CREATE TABLE public.payment_methods (
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

-- ====================================================================
-- TABLE: billing_history
-- Historique des evenements de facturation
-- ====================================================================
CREATE TABLE public.billing_history (
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
-- INDEX
-- ====================================================================

-- Patients
CREATE INDEX idx_patients_practitioner ON public.patients(practitioner_id);
CREATE INDEX idx_patients_email ON public.patients(email);
CREATE INDEX idx_patients_activated ON public.patients(activated);
CREATE INDEX idx_patients_deleted_at ON public.patients(deleted_at);

-- Invitations
CREATE INDEX idx_patient_invitations_practitioner ON public.patient_invitations(practitioner_id);
CREATE INDEX idx_patient_invitations_email ON public.patient_invitations(email);
CREATE INDEX idx_patient_invitations_status ON public.patient_invitations(status);

-- OTP codes
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX idx_otp_codes_practitioner ON public.otp_codes(practitioner_id);

-- Messages
CREATE INDEX idx_messages_patient ON public.messages(patient_id);
CREATE INDEX idx_messages_read ON public.messages(read);
CREATE INDEX idx_messages_sender ON public.messages(sender);
CREATE INDEX idx_messages_sent_at ON public.messages(sent_at);

-- Notifications
CREATE INDEX idx_notifications_practitioner ON public.notifications(practitioner_id);
CREATE INDEX idx_notifications_patient ON public.notifications(patient_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Appointments
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_practitioner ON public.appointments(practitioner_id);
CREATE INDEX idx_appointments_starts_at ON public.appointments(starts_at);

-- Consultations
CREATE INDEX idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX idx_consultations_date ON public.consultations(date);

-- Patient anamnesis
CREATE INDEX idx_patient_anamnesis_patient ON public.patient_anamnesis(patient_id);
CREATE INDEX idx_patient_anamnesis_naturopath ON public.patient_anamnesis(naturopath_id);

-- Preliminary questionnaires
CREATE INDEX idx_preliminary_questionnaires_naturopath ON public.preliminary_questionnaires(naturopath_id);
CREATE INDEX idx_preliminary_questionnaires_status ON public.preliminary_questionnaires(status);
CREATE INDEX idx_preliminary_questionnaires_email ON public.preliminary_questionnaires(email);

-- Patient plans
CREATE INDEX idx_patient_plans_patient ON public.patient_plans(patient_id);
CREATE INDEX idx_patient_plans_practitioner ON public.patient_plans(practitioner_id);
CREATE INDEX idx_patient_plans_status ON public.patient_plans(status);

-- Journal entries
CREATE INDEX idx_journal_entries_patient ON public.journal_entries(patient_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(date);

-- Wearables
CREATE INDEX idx_wearable_summaries_patient ON public.wearable_summaries(patient_id);
CREATE INDEX idx_wearable_summaries_date ON public.wearable_summaries(date);
CREATE INDEX idx_wearable_insights_patient ON public.wearable_insights(patient_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_practitioner ON public.subscriptions(practitioner_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- Invoices
CREATE INDEX idx_invoices_practitioner ON public.invoices(practitioner_id);
CREATE INDEX idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);


-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_questionnaire_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnese_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preliminary_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complement_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- POLICIES (permissives pour developpement - a restreindre en prod)
-- ====================================================================

-- Practitioners: acces a son propre profil
CREATE POLICY "practitioners_own" ON public.practitioners
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Patients: acces aux patients de son praticien
CREATE POLICY "patients_practitioner" ON public.patients
    FOR ALL USING (practitioner_id = auth.uid()) WITH CHECK (practitioner_id = auth.uid());

-- Invitations: acces aux invitations de son praticien
CREATE POLICY "invitations_practitioner" ON public.patient_invitations
    FOR ALL USING (practitioner_id = auth.uid()) WITH CHECK (practitioner_id = auth.uid());

-- Messages: acces aux messages de ses patients
CREATE POLICY "messages_practitioner" ON public.messages
    FOR ALL USING (
        patient_id IN (SELECT id FROM public.patients WHERE practitioner_id = auth.uid())
    );

-- Notifications: acces a ses notifications
CREATE POLICY "notifications_practitioner" ON public.notifications
    FOR ALL USING (practitioner_id = auth.uid());

-- Subscription plans: lecture publique
CREATE POLICY "subscription_plans_read" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- Subscriptions: acces a ses abonnements
CREATE POLICY "subscriptions_practitioner" ON public.subscriptions
    FOR ALL USING (practitioner_id = auth.uid());

-- Invoices: acces a ses factures
CREATE POLICY "invoices_practitioner" ON public.invoices
    FOR ALL USING (practitioner_id = auth.uid());

-- Payment methods: acces a ses moyens de paiement
CREATE POLICY "payment_methods_practitioner" ON public.payment_methods
    FOR ALL USING (practitioner_id = auth.uid());

-- OTP codes: politique permissive (necessaire pour activation)
CREATE POLICY "otp_codes_all" ON public.otp_codes
    FOR ALL USING (true) WITH CHECK (true);

-- Preliminary questionnaires: lecture publique pour soumission, acces naturopath pour gestion
CREATE POLICY "preliminary_questionnaires_submit" ON public.preliminary_questionnaires
    FOR INSERT WITH CHECK (true);

CREATE POLICY "preliminary_questionnaires_read" ON public.preliminary_questionnaires
    FOR SELECT USING (naturopath_id = auth.uid());

CREATE POLICY "preliminary_questionnaires_update" ON public.preliminary_questionnaires
    FOR UPDATE USING (naturopath_id = auth.uid());


-- ====================================================================
-- DONNEES INITIALES
-- ====================================================================

-- Plans d'abonnement par defaut
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, features, max_patients, circular_integration, is_active)
VALUES
    ('free', 'Gratuit', 'Plan gratuit pour demarrer', 0, 0, '["Jusqu''a 5 patients", "Anamnese de base", "Messagerie"]', 5, false, true),
    ('premium', 'Premium', 'Plan premium avec toutes les fonctionnalites', 29.90, 299, '["Patients illimites", "Integration Circular", "Analyses avancees", "Support prioritaire"]', null, true, true);


COMMIT;

-- ====================================================================
-- VERIFICATION
-- ====================================================================

-- Verifier que toutes les tables sont creees
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verifier le nombre de tables
SELECT COUNT(*) as nombre_tables
FROM information_schema.tables
WHERE table_schema = 'public';
