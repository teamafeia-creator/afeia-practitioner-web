-- Facturation : choix de l'outil de facturation + relances manuelles
-- Statistiques : suivi des consultants qui décrochent (questionnaire, réponse, relance, clôture)
-- Idempotent : oui

-- 1. Outil de facturation choisi par le praticien.
--    NULL = pas encore choisi (écran de choix) ; 'afeia' = module de facturation Afeia ;
--    sinon l'outil externe qu'il garde (Afeia ne s'y connecte pas, simple lien).
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS billing_tool TEXT;
DO $$ BEGIN
  ALTER TABLE practitioners ADD CONSTRAINT practitioners_billing_tool_check
    CHECK (billing_tool IS NULL OR billing_tool IN ('afeia', 'pennylane', 'indy', 'tiime', 'abby', 'freebe', 'autre', 'tableur'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON COLUMN practitioners.billing_tool IS 'Outil de facturation du praticien (NULL = non choisi, afeia = module Afeia)';

-- 2. Séance facturée dans l'outil externe (« Marquer comme facturée »).
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS invoiced_externally_at TIMESTAMPTZ;

-- 3. Texte de relance manuelle des impayés gardé pour les prochaines relances.
ALTER TABLE practitioner_billing_settings ADD COLUMN IF NOT EXISTS relance_manuelle_template TEXT;

-- 4. Consultants qui décrochent : actions consignées dans practitioner_actions (metadata JSONB)
--  * dropout_survey   : questionnaire de 2 questions envoyé (metadata : channel, step, signal)
--  * dropout_answer   : réponse au questionnaire classée par le praticien (metadata : cause, point)
--  * dropout_relance  : message adapté à la cause envoyé (metadata : cause, channel)
--  * followup_closed  : accompagnement clôturé (consultant qui va mieux)
ALTER TABLE practitioner_actions DROP CONSTRAINT IF EXISTS practitioner_actions_type_check;
ALTER TABLE practitioner_actions
  ADD CONSTRAINT practitioner_actions_type_check
  CHECK (type IN (
    'snooze', 'unsnooze', 'send_message', 'note_observation', 'celebrate',
    'review_completed', 'review_seen', 'remind_tomorrow', 'relance',
    'dropout_survey', 'dropout_answer', 'dropout_relance', 'followup_closed'
  ));
