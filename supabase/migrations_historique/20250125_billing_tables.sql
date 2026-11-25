-- ============================================
-- AFEIA Billing System Database Schema
-- Created: 2025-01-25
-- Description: Tables for subscription billing, invoices, and payment methods
-- ============================================

-- ============================================
-- TABLE: subscription_plans
-- Description: Plans d'abonnement disponibles
-- ============================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'premium'
  display_name VARCHAR(100) NOT NULL, -- 'Gratuit', 'Premium'
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]',
  -- Exemple features: ["Gestion illimitee de patients", "Integration Circular", "Support prioritaire"]
  max_patients INTEGER, -- NULL = illimite
  circular_integration BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: subscriptions
-- Description: Abonnements des praticiens
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  -- Integration Stripe
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: invoices
-- Description: Factures generees
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,

  -- Montants
  amount_subtotal DECIMAL(10, 2) NOT NULL,
  amount_tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'open', 'paid', 'void', 'uncollectible'

  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Details
  description TEXT,
  billing_reason VARCHAR(50), -- 'subscription_create', 'subscription_cycle', 'manual'

  -- Integration Stripe
  stripe_invoice_id VARCHAR(255),
  stripe_invoice_pdf VARCHAR(500),

  -- Metadonnees
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: payment_methods
-- Description: Moyens de paiement des praticiens
-- ============================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Type et details
  type VARCHAR(20) NOT NULL, -- 'card', 'sepa_debit', 'paypal'
  is_default BOOLEAN DEFAULT FALSE,

  -- Carte bancaire (si applicable)
  card_brand VARCHAR(20), -- 'visa', 'mastercard', 'amex'
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- SEPA (si applicable)
  sepa_last4 VARCHAR(4),

  -- Integration Stripe
  stripe_payment_method_id VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: billing_history
-- Description: Historique des evenements de facturation
-- ============================================
CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  event_type VARCHAR(50) NOT NULL,
  -- 'subscription_created', 'subscription_updated', 'subscription_canceled',
  -- 'payment_succeeded', 'payment_failed', 'invoice_created'

  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES pour performance
-- ============================================
CREATE INDEX idx_subscriptions_practitioner ON subscriptions(practitioner_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_practitioner ON invoices(practitioner_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX idx_payment_methods_practitioner ON payment_methods(practitioner_id);
CREATE INDEX idx_billing_history_practitioner ON billing_history(practitioner_id);

-- ============================================
-- TRIGGERS pour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_billing_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at_column();

-- ============================================
-- DONNEES INITIALES (SEEDS)
-- ============================================
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, max_patients, circular_integration) VALUES
  (
    'free',
    'Gratuit',
    'Plan de base pour demarrer',
    0.00,
    0.00,
    '["5 patients maximum", "Gestion de base", "Notes de consultation"]',
    5,
    FALSE
  ),
  (
    'premium',
    'Premium',
    'Acces complet avec integration Circular',
    29.90,
    299.00,
    '["Patients illimites", "Integration Circular (sommeil, HRV, activite)", "Plans personnalises avances", "Export PDF", "Support prioritaire"]',
    NULL,
    TRUE
  );

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- Les plans sont lisibles par tous (authentifies)
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (TRUE);

-- Policies pour subscriptions
CREATE POLICY "Practitioners can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can insert their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = practitioner_id);

-- Policies pour invoices
CREATE POLICY "Practitioners can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = practitioner_id);

-- Policies pour payment_methods
CREATE POLICY "Practitioners can manage their own payment methods"
  ON payment_methods FOR ALL
  USING (auth.uid() = practitioner_id);

-- Policies pour billing_history
CREATE POLICY "Practitioners can view their own billing history"
  ON billing_history FOR SELECT
  USING (auth.uid() = practitioner_id);
