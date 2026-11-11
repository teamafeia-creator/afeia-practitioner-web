-- Conseillancier : catégories choisies par le praticien pour chaque version
-- (modale « Que voulez-vous remplir ? » de l'éditeur guidé)
-- Idempotent : oui

-- Identifiants des sections de CONSEILLANCIER_SECTIONS (lib/conseillancier.ts),
-- ex. {en_tete,objectifs,phytotherapie,cloture}.
-- NULL = version antérieure à l'éditeur guidé : l'app en déduit les catégories
-- remplies, plus le message d'accueil et le message de clôture.
ALTER TABLE consultant_plans ADD COLUMN IF NOT EXISTS selected_sections TEXT[];
COMMENT ON COLUMN consultant_plans.selected_sections IS
  'Catégories du conseillancier choisies par le praticien (NULL = déduites du contenu rempli)';
