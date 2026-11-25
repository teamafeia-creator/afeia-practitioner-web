-- POL-10 · Valeurs de wearable_data_type alignées sur la spec POL-10 :
--   continuous_heart_rate → continuous_hr, activity → daily_activity.
-- wearable_raw a été créée en POL-08 (20261103) ; cette migration ne fait que renommer
-- les valeurs (ALTER TYPE … RENAME VALUE conserve les lignes existantes). Rejouable.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'wearable_data_type' AND e.enumlabel = 'continuous_heart_rate') THEN
    ALTER TYPE public.wearable_data_type RENAME VALUE 'continuous_heart_rate' TO 'continuous_hr';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'wearable_data_type' AND e.enumlabel = 'activity') THEN
    ALTER TYPE public.wearable_data_type RENAME VALUE 'activity' TO 'daily_activity';
  END IF;
END $$;

COMMENT ON COLUMN public.wearable_raw.provider_record_id IS
  'Identifiant stable chez le fournisseur. Polar (données journalières) : ''<polar_user_id>:<YYYY-MM-DD>''.';
COMMENT ON COLUMN public.wearable_raw.fetched_at IS
  'Date de la dernière lecture chez le fournisseur ; mise à jour à chaque upsert (nouvelle version).';
