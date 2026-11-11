-- Visio intégrée · lien consultant signé.
--
-- 1. appointments.video_join_token : secret du lien envoyé au consultant
--    (/consultation/video/{id}?token=…). Sans lui, la page ne délivre pas de jeton Daily.
-- 2. Rendez-vous à venir qui ont déjà une salle Daily : secret rempli pour que leur lien
--    puisse être envoyé (les e-mails déjà partis contenaient l'adresse Daily brute, désormais
--    refusée puisque les salles deviennent privées : voir scripts/privatize-daily-rooms.ts).
-- 3. Nouveaux comptes praticien : visio intégrée (Daily) par défaut. Comptes existants inchangés.
-- Rejouable.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_join_token text;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_video_join_token_key
  ON appointments (video_join_token)
  WHERE video_join_token IS NOT NULL;

UPDATE appointments
SET video_join_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE video_room_name IS NOT NULL
  AND video_join_token IS NULL
  AND ends_at > now();

ALTER TABLE practitioners ALTER COLUMN video_provider SET DEFAULT 'daily';
