-- POL-11 · Tables normalisées des objets connectés, indépendantes du fournisseur.
--
-- Le reste de l'app ne lit que ces tables. Elles sont recalculables à tout moment depuis
-- wearable_raw (npm run wearables:rebuild). Un nouveau fournisseur (Oura, Withings…)
-- = un nouvel adaptateur (lib/wearables/<fournisseur>/mappers), sans toucher aux écrans.
--
-- Conventions (docs/wearables/polar.md §6.6) :
--  * unité dans le nom des colonnes : _s, _ms, _bpm, _kcal, _m, _per_min ;
--  * horodatages en timestamptz (UTC) ;
--  * night_date = date de la nuit, au sens Polar : jour du réveil ;
--  * champ absent chez le fournisseur → NULL, jamais 0.
-- Tables internes au serveur : service_role uniquement.

-- ---------------------------------------------------------------------------
-- Fuseau horaire du consultant (conversion des heures « appareil » sans décalage)
-- ---------------------------------------------------------------------------
ALTER TABLE public.consultants
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Paris';

COMMENT ON COLUMN public.consultants.timezone IS
  'Fuseau IANA du consultant (ex. Europe/Paris). Sert à convertir en UTC les heures locales des objets connectés.';

-- ---------------------------------------------------------------------------
-- Trigger updated_at générique du repo (créé seulement s'il manque)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at' AND p.pronargs = 0
  ) THEN
    CREATE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $f$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $f$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- sleep_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sleep_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id        UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider             public.wearable_provider NOT NULL,
  source_raw_id        UUID NOT NULL REFERENCES public.wearable_raw(id) ON DELETE CASCADE,
  night_date           DATE NOT NULL,
  sleep_start_at       TIMESTAMPTZ,
  sleep_end_at         TIMESTAMPTZ,
  -- Sommeil réel = léger + profond + paradoxal + non reconnu ; NULL si léger, profond ou paradoxal manque.
  total_sleep_s        INTEGER CHECK (total_sleep_s >= 0),
  light_sleep_s        INTEGER CHECK (light_sleep_s >= 0),
  deep_sleep_s         INTEGER CHECK (deep_sleep_s >= 0),
  rem_sleep_s          INTEGER CHECK (rem_sleep_s >= 0),
  unrecognized_sleep_s INTEGER CHECK (unrecognized_sleep_s >= 0),
  interruption_s       INTEGER CHECK (interruption_s >= 0),
  sleep_score          SMALLINT CHECK (sleep_score BETWEEN 0 AND 100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sleep_sessions_business_key UNIQUE (consultant_id, provider, night_date)
);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_consultant_date ON public.sleep_sessions (consultant_id, night_date);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_source ON public.sleep_sessions (source_raw_id);

-- ---------------------------------------------------------------------------
-- hrv_nightly (récupération nocturne)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hrv_nightly (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id              UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider                   public.wearable_provider NOT NULL,
  source_raw_id              UUID NOT NULL REFERENCES public.wearable_raw(id) ON DELETE CASCADE,
  night_date                 DATE NOT NULL,
  hrv_rmssd_avg_ms           INTEGER CHECK (hrv_rmssd_avg_ms >= 0),
  hr_avg_bpm                 SMALLINT CHECK (hr_avg_bpm > 0),
  beat_to_beat_avg_ms        INTEGER CHECK (beat_to_beat_avg_ms > 0),
  breathing_rate_avg_per_min NUMERIC(4,1) CHECK (breathing_rate_avg_per_min > 0),
  -- Indicateurs de récupération propres au fournisseur (Polar : Nightly Recharge 1–6, ANS charge −10…+10, statut 1–5).
  recovery_status            SMALLINT,
  ans_charge                 NUMERIC(4,1),
  ans_charge_status          SMALLINT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hrv_nightly_business_key UNIQUE (consultant_id, provider, night_date)
);
CREATE INDEX IF NOT EXISTS idx_hrv_nightly_consultant_date ON public.hrv_nightly (consultant_id, night_date);
CREATE INDEX IF NOT EXISTS idx_hrv_nightly_source ON public.hrv_nightly (source_raw_id);

-- ---------------------------------------------------------------------------
-- hr_samples (fréquence cardiaque continue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_samples (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider      public.wearable_provider NOT NULL,
  source_raw_id UUID NOT NULL REFERENCES public.wearable_raw(id) ON DELETE CASCADE,
  recorded_at   TIMESTAMPTZ NOT NULL,
  hr_bpm        SMALLINT NOT NULL CHECK (hr_bpm > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hr_samples_business_key UNIQUE (consultant_id, provider, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_hr_samples_consultant_time ON public.hr_samples (consultant_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_hr_samples_source ON public.hr_samples (source_raw_id);

-- ---------------------------------------------------------------------------
-- daily_activity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id        UUID NOT NULL REFERENCES public.consultants(id) ON DELETE CASCADE,
  provider             public.wearable_provider NOT NULL,
  source_raw_id        UUID NOT NULL REFERENCES public.wearable_raw(id) ON DELETE CASCADE,
  activity_date        DATE NOT NULL,
  steps                INTEGER CHECK (steps >= 0),
  active_calories_kcal INTEGER CHECK (active_calories_kcal >= 0),
  total_calories_kcal  INTEGER CHECK (total_calories_kcal >= 0),
  active_s             INTEGER CHECK (active_s >= 0),
  distance_m           NUMERIC(9,2) CHECK (distance_m >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_activity_business_key UNIQUE (consultant_id, provider, activity_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_activity_consultant_date ON public.daily_activity (consultant_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_source ON public.daily_activity (source_raw_id);

-- ---------------------------------------------------------------------------
-- updated_at, droits
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sleep_sessions', 'hrv_nightly', 'hr_samples', 'daily_activity'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_set_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_set_updated_at', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Vide les tables normalisées avant reconstruction (npm run wearables:rebuild).
CREATE OR REPLACE FUNCTION public.wearable_truncate_normalized()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  TRUNCATE public.sleep_sessions, public.hrv_nightly, public.hr_samples, public.daily_activity;
$$;
REVOKE ALL ON FUNCTION public.wearable_truncate_normalized() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_truncate_normalized() TO service_role;
