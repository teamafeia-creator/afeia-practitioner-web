-- Onglet Cycle v2 (maquette actée le 22 nov. 2026)
-- - États du suivi : non activé / activé en attente / actif / désactivé (données conservées)
-- - Réglages : contraception (clé + précision), durées calculées ou saisies, situation particulière
-- - Noter des règles côté praticien : abondance « autre », autres critères, note visible par le praticien seul

ALTER TABLE cycle_profiles
  ADD COLUMN IF NOT EXISTS tracking_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_activated_by TEXT CHECK (tracking_activated_by IN ('consultant', 'practitioner')),
  ADD COLUMN IF NOT EXISTS tracking_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_paused_by TEXT CHECK (tracking_paused_by IN ('consultant', 'practitioner')),
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cycle_length_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS period_length_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contraception_details TEXT,
  ADD COLUMN IF NOT EXISTS situation TEXT NOT NULL DEFAULT 'aucune'
    CHECK (situation IN ('aucune', 'grossesse', 'allaitement', 'perimenopause', 'autre')),
  ADD COLUMN IF NOT EXISTS situation_details TEXT;

-- Les profils déjà actifs : date d'activation = création du profil.
UPDATE cycle_profiles SET tracking_activated_at = created_at WHERE is_tracking AND tracking_activated_at IS NULL;

-- Durée des règles jusqu'à 10 jours (la maquette autorise 2 à 10).
ALTER TABLE cycle_profiles DROP CONSTRAINT IF EXISTS cycle_profiles_average_period_length_check;
ALTER TABLE cycle_profiles ADD CONSTRAINT cycle_profiles_average_period_length_check
  CHECK (average_period_length BETWEEN 2 AND 10);

-- Contraception : clés normalisées (aucune, pilule, sterilet, implant, autre). Les anciens textes libres → 'autre' + détail.
UPDATE cycle_profiles
   SET contraception_details = contraception, contraception = 'autre'
 WHERE contraception IS NOT NULL AND contraception NOT IN ('aucune', 'pilule', 'sterilet', 'implant', 'autre');

ALTER TABLE cycle_entries
  ADD COLUMN IF NOT EXISTS flow_details TEXT,
  ADD COLUMN IF NOT EXISTS extra_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS practitioner_note TEXT;

-- Abondance « autre » (précisée en texte).
ALTER TABLE cycle_entries DROP CONSTRAINT IF EXISTS cycle_entries_flow_intensity_check;
ALTER TABLE cycle_entries ADD CONSTRAINT cycle_entries_flow_intensity_check
  CHECK (flow_intensity IN ('spotting', 'light', 'medium', 'heavy', 'other'));

COMMENT ON COLUMN cycle_entries.extra_criteria IS 'Autres critères notés par le praticien : {"Caillots":"Oui","Couleur":"Foncée","Mon critère":"valeur"}';
COMMENT ON COLUMN cycle_entries.practitioner_note IS 'Note du praticien, visible par lui seul (la consultante ne la voit pas dans son app).';
