-- ============================================================================
-- FIX: Contrainte UNIQUE sur numero de facture
-- ============================================================================
-- La contrainte originale utilisait NULLS NOT DISTINCT, ce qui empechait
-- la creation de plusieurs brouillons (numero = NULL).
-- On la remplace par un index unique partiel qui n'applique l'unicite
-- que sur les numeros non-NULL.
-- ============================================================================

ALTER TABLE consultation_invoices DROP CONSTRAINT IF EXISTS numero_unique_when_not_null;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_numero_unique
ON consultation_invoices (numero)
WHERE numero IS NOT NULL;
