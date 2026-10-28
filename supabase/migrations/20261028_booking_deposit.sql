-- Prise de rendez-vous : acompte obligatoire, lieu par séance, annulation par le consultant

-- Réglage de l'acompte : par praticien (30 % par défaut), surchargeable par type de séance
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS booking_deposit_percent INTEGER NOT NULL DEFAULT 30
    CHECK (booking_deposit_percent BETWEEN 0 AND 100);
ALTER TABLE consultation_types
  ADD COLUMN IF NOT EXISTS deposit_percent INTEGER CHECK (deposit_percent BETWEEN 0 AND 100);

-- Suivi de l'acompte sur la séance
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deposit_cents INTEGER,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'none'
    CHECK (deposit_status IN ('none', 'pending', 'paid', 'refunded', 'kept', 'expired')),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  -- Lien d'annulation envoyé au consultant
  ADD COLUMN IF NOT EXISTS cancel_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_cancel_token ON appointments(cancel_token);
CREATE INDEX IF NOT EXISTS idx_appointments_checkout_session ON appointments(stripe_checkout_session_id);
