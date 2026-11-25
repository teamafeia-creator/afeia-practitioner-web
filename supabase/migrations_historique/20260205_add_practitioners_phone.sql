-- Migration: Ajouter colonne phone à practitioners
-- Date: 2026-02-05

BEGIN;

-- Ajouter la colonne phone si elle n'existe pas déjà
ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN public.practitioners.phone IS 'Numéro de téléphone du praticien';

COMMIT;
