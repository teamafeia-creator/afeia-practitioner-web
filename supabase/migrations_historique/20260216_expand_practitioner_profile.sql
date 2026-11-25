-- =============================================================================
-- MIGRATION: Expand Practitioner Professional Profile
-- Date: 2026-02-16
-- Description: Add identity, professional, contact, and presentation fields
-- Idempotent: YES - safe to run multiple times
-- =============================================================================

-- 1. Identity fields
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Professional information
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS siret TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS adeli_number TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS formations TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS years_experience INTEGER;

-- 3. Professional contact
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS cabinet_address TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS professional_phone TEXT;
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS website TEXT;

-- 4. Presentation
ALTER TABLE public.practitioners ADD COLUMN IF NOT EXISTS bio TEXT;

-- Comments for documentation
COMMENT ON COLUMN public.practitioners.first_name IS 'Prénom du praticien';
COMMENT ON COLUMN public.practitioners.last_name IS 'Nom de famille du praticien';
COMMENT ON COLUMN public.practitioners.photo_url IS 'URL de la photo de profil (Supabase Storage)';
COMMENT ON COLUMN public.practitioners.specialties IS 'Spécialités / domaines d''expertise (tableau de tags)';
COMMENT ON COLUMN public.practitioners.siret IS 'Numéro SIRET (14 chiffres)';
COMMENT ON COLUMN public.practitioners.adeli_number IS 'Numéro ADELI ou certification';
COMMENT ON COLUMN public.practitioners.formations IS 'Formations et diplômes (texte libre)';
COMMENT ON COLUMN public.practitioners.years_experience IS 'Années d''expérience professionnelle';
COMMENT ON COLUMN public.practitioners.cabinet_address IS 'Adresse du cabinet';
COMMENT ON COLUMN public.practitioners.professional_phone IS 'Téléphone professionnel';
COMMENT ON COLUMN public.practitioners.website IS 'Site web professionnel';
COMMENT ON COLUMN public.practitioners.bio IS 'Biographie / description pour la page de prise de RDV publique';

-- Index for SIRET uniqueness (only when non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioners_siret
  ON public.practitioners(siret) WHERE siret IS NOT NULL;
