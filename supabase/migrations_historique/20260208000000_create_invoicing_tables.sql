-- ============================================================================
-- MIGRATION : MODULE FACTURATION AFEIA
-- ============================================================================

-- Fonction helper pour updated_at (si elle n'existe pas deja)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE : consultation_invoices
-- ============================================================================

CREATE TABLE consultation_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE RESTRICT,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,

  numero TEXT,
  date_emission TIMESTAMPTZ,
  annee_fiscale INTEGER NOT NULL,

  template_id TEXT,
  description TEXT NOT NULL,
  montant DECIMAL(10,2) NOT NULL,

  tva_applicable BOOLEAN DEFAULT FALSE,
  taux_tva DECIMAL(5,2),
  montant_ttc DECIMAL(10,2),

  status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),

  payment_method TEXT CHECK (payment_method IN ('especes', 'cheque', 'cb', 'virement', 'stripe')),
  payment_date TIMESTAMPTZ,
  payment_notes TEXT,

  practitioner_snapshot JSONB NOT NULL,
  consultant_snapshot JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT numero_unique_when_not_null UNIQUE NULLS NOT DISTINCT (numero)
);

CREATE INDEX idx_consultation_invoices_practitioner ON consultation_invoices(practitioner_id);
CREATE INDEX idx_consultation_invoices_consultant ON consultation_invoices(consultant_id);
CREATE INDEX idx_consultation_invoices_status ON consultation_invoices(status);
CREATE INDEX idx_consultation_invoices_annee ON consultation_invoices(annee_fiscale);
CREATE INDEX idx_consultation_invoices_date_emission ON consultation_invoices(date_emission);

CREATE TRIGGER set_consultation_invoices_updated_at
BEFORE UPDATE ON consultation_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- TABLE : invoice_history
-- ============================================================================

CREATE TABLE invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES consultation_invoices(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_history_invoice ON invoice_history(invoice_id);
CREATE INDEX idx_invoice_history_created ON invoice_history(created_at DESC);

-- ============================================================================
-- TABLE : invoice_templates
-- ============================================================================

CREATE TABLE invoice_templates (
  id TEXT NOT NULL,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  montant_defaut DECIMAL(10,2) NOT NULL,
  duree_defaut INTEGER,
  ordre INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (practitioner_id, id)
);

CREATE INDEX idx_invoice_templates_practitioner ON invoice_templates(practitioner_id);

CREATE TRIGGER set_invoice_templates_updated_at
BEFORE UPDATE ON invoice_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- TABLE : practitioner_billing_settings
-- ============================================================================

CREATE TABLE practitioner_billing_settings (
  practitioner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  siret TEXT NOT NULL,
  adresse_facturation TEXT NOT NULL,
  mention_tva TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293 B du CGI',
  statut_juridique TEXT DEFAULT 'Micro-entrepreneur',
  libelle_document TEXT DEFAULT 'facture' CHECK (libelle_document IN ('facture', 'recu', 'facture-recu')),
  email_auto_consultant BOOLEAN DEFAULT TRUE,
  email_copie_praticien BOOLEAN DEFAULT FALSE,
  derniere_annee_fiscale INTEGER,
  dernier_numero_emis INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_practitioner_billing_settings_updated_at
BEFORE UPDATE ON practitioner_billing_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- FONCTIONS : Numerotation automatique
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_invoice_number(
  p_practitioner_id UUID,
  p_annee_fiscale INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence_name TEXT;
  v_next_num INTEGER;
  v_numero TEXT;
BEGIN
  v_sequence_name := 'invoice_seq_' || REPLACE(p_practitioner_id::TEXT, '-', '_') || '_' || p_annee_fiscale;

  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = v_sequence_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE %I START 1', v_sequence_name);
  END IF;

  EXECUTE format('SELECT nextval(%L)', v_sequence_name) INTO v_next_num;

  v_numero := p_annee_fiscale || '-' || LPAD(v_next_num::TEXT, 4, '0');

  RETURN v_numero;
END;
$$;

CREATE OR REPLACE FUNCTION assign_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.status IN ('issued', 'paid')) AND
     (OLD IS NULL OR OLD.status = 'draft') AND
     (NEW.numero IS NULL) THEN
    NEW.numero := get_next_invoice_number(NEW.practitioner_id, NEW.annee_fiscale);
    NEW.date_emission := NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_assign_invoice_number
BEFORE INSERT OR UPDATE ON consultation_invoices
FOR EACH ROW
EXECUTE FUNCTION assign_invoice_number();

-- ============================================================================
-- FONCTION : Audit trail
-- ============================================================================

CREATE OR REPLACE FUNCTION log_invoice_action(
  p_invoice_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO invoice_history (invoice_id, action, user_id, metadata)
  VALUES (p_invoice_id, p_action, auth.uid(), p_metadata)
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE consultation_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioner_billing_settings ENABLE ROW LEVEL SECURITY;

-- Policies consultation_invoices
CREATE POLICY "Praticiens voient leurs factures"
ON consultation_invoices FOR SELECT
USING (practitioner_id = auth.uid());

CREATE POLICY "Praticiens creent leurs factures"
ON consultation_invoices FOR INSERT
WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Praticiens modifient leurs factures"
ON consultation_invoices FOR UPDATE
USING (practitioner_id = auth.uid())
WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Praticiens suppriment leurs factures brouillon"
ON consultation_invoices FOR DELETE
USING (practitioner_id = auth.uid() AND status = 'draft');

-- Policies invoice_history
CREATE POLICY "Praticiens voient l historique de leurs factures"
ON invoice_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM consultation_invoices
    WHERE consultation_invoices.id = invoice_history.invoice_id
    AND consultation_invoices.practitioner_id = auth.uid()
  )
);

CREATE POLICY "Systeme cree l historique"
ON invoice_history FOR INSERT
WITH CHECK (TRUE);

-- Policies invoice_templates
CREATE POLICY "Praticiens voient leurs templates"
ON invoice_templates FOR SELECT
USING (practitioner_id = auth.uid());

CREATE POLICY "Praticiens creent leurs templates"
ON invoice_templates FOR INSERT
WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Praticiens modifient leurs templates"
ON invoice_templates FOR UPDATE
USING (practitioner_id = auth.uid());

CREATE POLICY "Praticiens suppriment leurs templates"
ON invoice_templates FOR DELETE
USING (practitioner_id = auth.uid());

-- Policies practitioner_billing_settings
CREATE POLICY "Praticiens voient leurs parametres"
ON practitioner_billing_settings FOR SELECT
USING (practitioner_id = auth.uid());

CREATE POLICY "Praticiens creent leurs parametres"
ON practitioner_billing_settings FOR INSERT
WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Praticiens modifient leurs parametres"
ON practitioner_billing_settings FOR UPDATE
USING (practitioner_id = auth.uid());
