-- Revue du matin : nouvelles actions consignées
--  * review_seen      : « Vu, rien à faire »
--  * remind_tomorrow  : « Me le rappeler demain » (sert aussi à compter les reports)
--  * relance          : relance d'un consultant depuis la liste des consultants
-- Les actions du jour alimentent « Traités ce matin » ; « Annuler » supprime la ligne.

ALTER TABLE practitioner_actions DROP CONSTRAINT IF EXISTS practitioner_actions_type_check;
ALTER TABLE practitioner_actions
  ADD CONSTRAINT practitioner_actions_type_check
  CHECK (type IN (
    'snooze', 'unsnooze', 'send_message', 'note_observation', 'celebrate',
    'review_completed', 'review_seen', 'remind_tomorrow', 'relance'
  ));

CREATE INDEX IF NOT EXISTS idx_practitioner_actions_created
  ON practitioner_actions(practitioner_id, created_at DESC);
