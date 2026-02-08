-- ============================================================================
-- MIGRATION V2 : Paiements en ligne & Automatisation
-- Module Facturation AFEIA — Phase 2
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ajout colonnes Stripe Connect dans practitioner_billing_settings
-- ----------------------------------------------------------------------------

ALTER TABLE practitioner_billing_settings
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 2. Ajout parametres relances automatiques
-- ----------------------------------------------------------------------------

ALTER TABLE practitioner_billing_settings
ADD COLUMN IF NOT EXISTS relances_auto BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS delai_relance_j7 BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS delai_relance_j15 BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS delai_relance_j30 BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_template_relance_j7 TEXT,
ADD COLUMN IF NOT EXISTS email_template_relance_j15 TEXT,
ADD COLUMN IF NOT EXISTS email_template_relance_j30 TEXT;

-- ----------------------------------------------------------------------------
-- 3. Ajout colonnes Avoir dans consultation_invoices
-- ----------------------------------------------------------------------------

ALTER TABLE consultation_invoices
ADD COLUMN IF NOT EXISTS is_avoir BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS facture_origine_id UUID REFERENCES consultation_invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS motif_remboursement TEXT;

-- Ajout colonne Stripe Payment Link
ALTER TABLE consultation_invoices
ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Ajout du statut 'refunded' dans la contrainte check
-- D'abord on supprime l'ancienne contrainte, puis on la recree
ALTER TABLE consultation_invoices
DROP CONSTRAINT IF EXISTS consultation_invoices_status_check;

ALTER TABLE consultation_invoices
ADD CONSTRAINT consultation_invoices_status_check
CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'refunded'));

-- Index pour performances V2
CREATE INDEX IF NOT EXISTS idx_consultation_invoices_avoir
ON consultation_invoices(is_avoir) WHERE is_avoir = TRUE;

CREATE INDEX IF NOT EXISTS idx_consultation_invoices_origine
ON consultation_invoices(facture_origine_id) WHERE facture_origine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultation_invoices_stripe_link
ON consultation_invoices(stripe_payment_link_url) WHERE stripe_payment_link_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultation_invoices_payment_date
ON consultation_invoices(payment_date);

-- ----------------------------------------------------------------------------
-- 4. Table : stripe_webhook_events (log des webhooks Stripe)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  stripe_account_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_type
ON stripe_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
ON stripe_webhook_events(processed) WHERE NOT processed;

CREATE INDEX IF NOT EXISTS idx_webhook_events_created
ON stripe_webhook_events(created_at DESC);

-- Pas de RLS sur cette table (acces serveur uniquement via service role)

-- ----------------------------------------------------------------------------
-- 5. Table : reminder_queue (file d'attente relances)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES consultation_invoices(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('j7', 'j15', 'j30')),
  scheduled_for DATE NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_queue_scheduled
ON reminder_queue(scheduled_for) WHERE NOT sent;

CREATE INDEX IF NOT EXISTS idx_reminder_queue_invoice
ON reminder_queue(invoice_id);

ALTER TABLE reminder_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Praticiens voient leurs relances"
ON reminder_queue FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM consultation_invoices
    WHERE consultation_invoices.id = reminder_queue.invoice_id
    AND consultation_invoices.practitioner_id = auth.uid()
  )
);

-- Insertion par le serveur uniquement
CREATE POLICY "Systeme cree les relances"
ON reminder_queue FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Systeme modifie les relances"
ON reminder_queue FOR UPDATE
USING (TRUE);

-- ----------------------------------------------------------------------------
-- 6. Mise a jour de la fonction assign_invoice_number pour supporter 'refunded'
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 7. Fonction pour planifier les relances automatiquement
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION schedule_invoice_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Quand une facture passe a 'issued', planifier les relances
  IF (NEW.status = 'issued') AND (OLD IS NULL OR OLD.status != 'issued') THEN
    -- Verifier si le praticien a les relances activees
    IF EXISTS (
      SELECT 1 FROM practitioner_billing_settings
      WHERE practitioner_id = NEW.practitioner_id
      AND relances_auto = TRUE
    ) THEN
      -- Planifier J+7
      INSERT INTO reminder_queue (invoice_id, reminder_type, scheduled_for)
      SELECT NEW.id, 'j7', (COALESCE(NEW.date_emission, NOW()) + INTERVAL '7 days')::DATE
      WHERE EXISTS (
        SELECT 1 FROM practitioner_billing_settings
        WHERE practitioner_id = NEW.practitioner_id AND delai_relance_j7 = TRUE
      );

      -- Planifier J+15
      INSERT INTO reminder_queue (invoice_id, reminder_type, scheduled_for)
      SELECT NEW.id, 'j15', (COALESCE(NEW.date_emission, NOW()) + INTERVAL '15 days')::DATE
      WHERE EXISTS (
        SELECT 1 FROM practitioner_billing_settings
        WHERE practitioner_id = NEW.practitioner_id AND delai_relance_j15 = TRUE
      );

      -- Planifier J+30
      INSERT INTO reminder_queue (invoice_id, reminder_type, scheduled_for)
      SELECT NEW.id, 'j30', (COALESCE(NEW.date_emission, NOW()) + INTERVAL '30 days')::DATE
      WHERE EXISTS (
        SELECT 1 FROM practitioner_billing_settings
        WHERE practitioner_id = NEW.practitioner_id AND delai_relance_j30 = TRUE
      );
    END IF;
  END IF;

  -- Quand une facture est payee, annuler les relances non envoyees
  IF (NEW.status IN ('paid', 'cancelled', 'refunded')) AND (OLD.status = 'issued') THEN
    DELETE FROM reminder_queue
    WHERE invoice_id = NEW.id AND sent = FALSE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_schedule_invoice_reminders
AFTER INSERT OR UPDATE ON consultation_invoices
FOR EACH ROW
EXECUTE FUNCTION schedule_invoice_reminders();
