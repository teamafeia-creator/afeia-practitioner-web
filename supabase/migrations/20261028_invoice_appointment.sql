-- Facturation : lier une facture à la séance de l'agenda qu'elle facture,
-- pour repérer les « séances terminées sans facture ».
ALTER TABLE consultation_invoices
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_consultation_invoices_appointment ON consultation_invoices(appointment_id);
