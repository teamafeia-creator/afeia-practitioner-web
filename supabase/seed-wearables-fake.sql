-- =============================================================================
-- Données « objet connecté » factices pour les consultants de test.
-- Fichier : supabase/seed-wearables-fake.sql
--
-- À exécuter dans le SQL Editor Supabase (rôle postgres). Rejouable : les lignes
-- existantes sont mises à jour, rien n'est dupliqué.
--
-- Cible : soit les e-mails listés dans p_emails, soit (si p_emails est vide) tous les
-- consultants du praticien p_practitioner_email. Les fiches qui ont déjà une VRAIE
-- connexion Polar (provider_user_id sans « seed- ») sont ignorées, sauf si
-- p_replace_real = true.
--
-- Pour chaque consultant ciblé :
--   * la fiche passe en Premium (is_premium = true) ;
--   * une connexion de démonstration est créée (provider_user_id « seed-… » :
--     le cron, le webhook et le bouton Synchroniser l'ignorent, aucun appel Polar) ;
--   * un consentement v1 est enregistré ;
--   * p_days jours de données : sommeil, récupération nocturne (VFC + FC de nuit),
--     activité (pas), et fréquence cardiaque continue sur les 7 derniers jours ;
--   * (bloc 2) un journal quotidien cohérent avec ces nuits : qualité du sommeil, énergie,
--     stress, humeur et quelques notes, pour que les croisements journal × objet s'affichent.
--
-- Chaque consultant reçoit un profil différent (bon dormeur, dette de sommeil,
-- sportif, sédentaire…) pour que les fiches ne se ressemblent pas.
--
-- Pour tout retirer : voir le bloc « NETTOYAGE » en bas du fichier.
-- =============================================================================

DO $$
DECLARE
  -- >>> À ADAPTER <<<
  -- Soit une liste d'e-mails de fiches patients…
  p_emails TEXT[] := ARRAY[]::TEXT[];
  -- …soit, si la liste est vide, tous les patients de ce praticien :
  p_practitioner_email TEXT := 'pwoodeline@gmail.com';
  -- Remplacer aussi les fiches qui ont une vraie connexion Polar ? (false = on les laisse)
  p_replace_real BOOLEAN := false;
  p_days   INTEGER := 60;   -- historique généré (jours)
  p_hr_days INTEGER := 7;   -- jours de fréquence cardiaque continue (toutes les 30 min)

  v_consultant RECORD;
  v_idx        INTEGER := 0;
  v_profile    INTEGER;
  v_secret_id  UUID;
  v_provider_user_id TEXT;
  v_day        DATE;
  v_d          INTEGER;
  v_seed       DOUBLE PRECISION;
  v_weekend    BOOLEAN;
  v_jitter     DOUBLE PRECISION;

  -- paramètres de profil
  v_sleep_base_min INTEGER;  -- durée moyenne de sommeil (minutes)
  v_hrv_base       INTEGER;  -- VFC moyenne (ms)
  v_hr_base        INTEGER;  -- FC moyenne de nuit (bpm)
  v_steps_base     INTEGER;  -- pas moyens par jour
  v_hr_day_base    INTEGER;  -- FC de repos en journée (bpm)

  -- valeurs du jour
  v_sleep_s    INTEGER;
  v_deep_s     INTEGER;
  v_rem_s      INTEGER;
  v_light_s    INTEGER;
  v_interrupt_s INTEGER;
  v_sleep_start TIMESTAMPTZ;
  v_sleep_end   TIMESTAMPTZ;
  v_score      INTEGER;
  v_hrv        INTEGER;
  v_hr_night   INTEGER;
  v_steps      INTEGER;
  v_active_s   INTEGER;
  v_raw_id     UUID;
  v_ts         TIMESTAMPTZ;
  v_hr         INTEGER;
  v_hour       DOUBLE PRECISION;
  v_total_rows INTEGER := 0;
BEGIN
  FOR v_consultant IN
    SELECT c.id, c.email
    FROM public.consultants c
    LEFT JOIN public.practitioners p ON p.id = c.practitioner_id
    LEFT JOIN auth.users u ON u.id = c.practitioner_id
    WHERE (
      (cardinality(p_emails) > 0 AND lower(c.email) = ANY (SELECT lower(e) FROM unnest(p_emails) e))
      OR (cardinality(p_emails) = 0 AND lower(p_practitioner_email) IN (lower(p.email), lower(u.email)))
    )
    ORDER BY c.created_at
  LOOP
    IF NOT p_replace_real AND EXISTS (
      SELECT 1 FROM public.wearable_connections wc
      WHERE wc.consultant_id = v_consultant.id AND wc.provider_user_id NOT LIKE 'seed-%'
    ) THEN
      RAISE NOTICE 'Ignoré (vraie connexion Polar présente) : %', v_consultant.email;
      CONTINUE;
    END IF;

    v_idx := v_idx + 1;
    v_profile := ((v_idx - 1) % 5);

    -- ----- Profil ------------------------------------------------------------
    CASE v_profile
      WHEN 0 THEN -- équilibré
        v_sleep_base_min := 7*60+20; v_hrv_base := 58; v_hr_base := 60; v_steps_base := 8200;  v_hr_day_base := 66;
      WHEN 1 THEN -- dette de sommeil, stress
        v_sleep_base_min := 5*60+50; v_hrv_base := 34; v_hr_base := 71; v_steps_base := 4800;  v_hr_day_base := 76;
      WHEN 2 THEN -- sportif
        v_sleep_base_min := 7*60+50; v_hrv_base := 82; v_hr_base := 52; v_steps_base := 12500; v_hr_day_base := 56;
      WHEN 3 THEN -- sédentaire, sommeil long mais fragmenté
        v_sleep_base_min := 8*60+10; v_hrv_base := 44; v_hr_base := 67; v_steps_base := 3100;  v_hr_day_base := 74;
      ELSE        -- récupération en amélioration (tendance sur la période)
        v_sleep_base_min := 6*60+40; v_hrv_base := 48; v_hr_base := 64; v_steps_base := 6900;  v_hr_day_base := 70;
    END CASE;

    -- ----- Fiche Premium + consentement --------------------------------------
    UPDATE public.consultants SET is_premium = true WHERE id = v_consultant.id AND is_premium IS DISTINCT FROM true;

    INSERT INTO public.wearable_consents (consultant_id, text_version, accepted_at)
    SELECT v_consultant.id, 'v1', now() - (p_days || ' days')::interval
    WHERE NOT EXISTS (
      SELECT 1 FROM public.wearable_consents
      WHERE consultant_id = v_consultant.id AND text_version = 'v1' AND withdrawn_at IS NULL
    );

    -- ----- Connexion de démonstration ----------------------------------------
    v_provider_user_id := 'seed-' || v_consultant.id::text;

    SELECT access_token_secret_id INTO v_secret_id
    FROM public.wearable_connections
    WHERE consultant_id = v_consultant.id AND provider = 'polar';

    IF v_secret_id IS NULL THEN
      v_secret_id := vault.create_secret('demo-token-' || v_consultant.id::text, 'wearable-demo-' || v_consultant.id::text || '-' || extract(epoch from now())::bigint,
                                         'Faux jeton : connexion objet connecté de démonstration');
    END IF;

    INSERT INTO public.wearable_connections
      (consultant_id, provider, provider_user_id, access_token_secret_id, token_expires_at, status,
       connected_at, last_sync_at, last_error, backfill_status, backfill_cursor, backfill_days, backfill_updated_at, interrupted_at)
    VALUES
      (v_consultant.id, 'polar', v_provider_user_id, v_secret_id, now() + interval '365 days', 'active',
       now() - (p_days || ' days')::interval, now() - interval '3 hours', NULL, 'done', CURRENT_DATE - 1, p_days, now(), NULL)
    ON CONFLICT (consultant_id, provider) DO UPDATE SET
      provider_user_id = EXCLUDED.provider_user_id,
      access_token_secret_id = EXCLUDED.access_token_secret_id,
      token_expires_at = EXCLUDED.token_expires_at,
      status = 'active',
      last_sync_at = EXCLUDED.last_sync_at,
      last_error = NULL,
      backfill_status = 'done',
      backfill_cursor = EXCLUDED.backfill_cursor,
      backfill_days = EXCLUDED.backfill_days,
      backfill_updated_at = now(),
      interrupted_at = NULL,
      updated_at = now();

    -- ----- Journées ----------------------------------------------------------
    FOR v_d IN 1..p_days LOOP
      v_day := CURRENT_DATE - v_d;                     -- hier = 1
      v_weekend := EXTRACT(ISODOW FROM v_day) >= 6;
      -- bruit déterministe par consultant et par jour (rejouable)
      v_seed := (('x' || substr(md5(v_consultant.id::text || v_day::text), 1, 8))::bit(32)::bigint % 1000) / 1000.0; -- 0..1
      v_jitter := (v_seed - 0.5) * 2;                  -- -1..1
      -- tendance : le profil 4 s'améliore au fil des jours (plus récent = mieux)
      DECLARE v_trend DOUBLE PRECISION := CASE WHEN v_profile = 4 THEN (p_days - v_d)::double precision / p_days ELSE 0 END;
      BEGIN
        -- Sommeil
        v_sleep_s := GREATEST(4*3600,
          (v_sleep_base_min * 60
           + v_jitter * 55 * 60
           + CASE WHEN v_weekend THEN 35*60 ELSE 0 END
           + v_trend * 50 * 60)::int);
        v_deep_s  := (v_sleep_s * (0.17 + v_jitter * 0.03))::int;
        v_rem_s   := (v_sleep_s * (0.21 + v_jitter * 0.03))::int;
        v_interrupt_s := GREATEST(0, (CASE WHEN v_profile IN (1,3) THEN 40 ELSE 15 END * 60 + v_jitter * 12 * 60)::int);
        v_light_s := v_sleep_s - v_deep_s - v_rem_s;
        v_sleep_start := (v_day::timestamp + time '23:10' + (v_jitter * 50 || ' minutes')::interval
                          + CASE WHEN v_weekend THEN interval '45 minutes' ELSE interval '0' END) AT TIME ZONE 'Europe/Paris';
        v_sleep_end := v_sleep_start + (v_sleep_s + v_interrupt_s) * interval '1 second';
        v_score := LEAST(96, GREATEST(30, (55 + (v_sleep_s - 6*3600) / 180 - v_interrupt_s / 240 + v_jitter * 6)::int));

        -- Récupération nocturne
        v_hrv := GREATEST(15, (v_hrv_base + v_jitter * 9 + v_trend * 14 + CASE WHEN v_weekend THEN 3 ELSE 0 END)::int);
        v_hr_night := GREATEST(40, (v_hr_base - v_jitter * 4 - v_trend * 5)::int);

        -- Activité
        v_steps := GREATEST(600, (v_steps_base
                     + v_jitter * v_steps_base * 0.45
                     + CASE WHEN v_weekend AND v_profile = 2 THEN 4000 WHEN v_weekend THEN -1200 ELSE 0 END
                     + v_trend * 1500)::int);
        v_active_s := (v_steps * 0.55)::int;

        -- Raw + normalisé : sommeil
        INSERT INTO public.wearable_raw (consultant_id, provider, data_type, provider_record_id, data_date, payload, fetched_at)
        VALUES (v_consultant.id, 'polar', 'sleep', 'seed-' || v_consultant.id || '-sleep-' || v_day, v_day,
                jsonb_build_object('seed', true, 'date', v_day, 'total_sleep_s', v_sleep_s), now())
        ON CONFLICT (provider, data_type, provider_record_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
        RETURNING id INTO v_raw_id;

        INSERT INTO public.sleep_sessions
          (consultant_id, provider, source_raw_id, night_date, sleep_start_at, sleep_end_at, total_sleep_s,
           light_sleep_s, deep_sleep_s, rem_sleep_s, unrecognized_sleep_s, interruption_s, sleep_score)
        VALUES (v_consultant.id, 'polar', v_raw_id, v_day, v_sleep_start, v_sleep_end, v_sleep_s,
                v_light_s, v_deep_s, v_rem_s, 0, v_interrupt_s, v_score)
        ON CONFLICT (consultant_id, provider, night_date) DO UPDATE SET
          source_raw_id = EXCLUDED.source_raw_id, sleep_start_at = EXCLUDED.sleep_start_at, sleep_end_at = EXCLUDED.sleep_end_at,
          total_sleep_s = EXCLUDED.total_sleep_s, light_sleep_s = EXCLUDED.light_sleep_s, deep_sleep_s = EXCLUDED.deep_sleep_s,
          rem_sleep_s = EXCLUDED.rem_sleep_s, interruption_s = EXCLUDED.interruption_s, sleep_score = EXCLUDED.sleep_score,
          updated_at = now();

        -- Raw + normalisé : récupération nocturne
        INSERT INTO public.wearable_raw (consultant_id, provider, data_type, provider_record_id, data_date, payload, fetched_at)
        VALUES (v_consultant.id, 'polar', 'nightly_recharge', 'seed-' || v_consultant.id || '-nr-' || v_day, v_day,
                jsonb_build_object('seed', true, 'date', v_day, 'hrv_ms', v_hrv, 'hr_bpm', v_hr_night), now())
        ON CONFLICT (provider, data_type, provider_record_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
        RETURNING id INTO v_raw_id;

        INSERT INTO public.hrv_nightly
          (consultant_id, provider, source_raw_id, night_date, hrv_rmssd_avg_ms, hr_avg_bpm, beat_to_beat_avg_ms,
           breathing_rate_avg_per_min, recovery_status, ans_charge, ans_charge_status)
        VALUES (v_consultant.id, 'polar', v_raw_id, v_day, v_hrv, v_hr_night, (60000 / v_hr_night)::int,
                round((14.5 + v_jitter * 1.2)::numeric, 1),
                CASE WHEN v_hrv >= v_hrv_base + 4 THEN 5 WHEN v_hrv <= v_hrv_base - 6 THEN 2 ELSE 3 END,
                round((v_jitter * 2.5)::numeric, 1),
                CASE WHEN v_jitter > 0.5 THEN 3 WHEN v_jitter < -0.5 THEN 1 ELSE 2 END)
        ON CONFLICT (consultant_id, provider, night_date) DO UPDATE SET
          source_raw_id = EXCLUDED.source_raw_id, hrv_rmssd_avg_ms = EXCLUDED.hrv_rmssd_avg_ms, hr_avg_bpm = EXCLUDED.hr_avg_bpm,
          beat_to_beat_avg_ms = EXCLUDED.beat_to_beat_avg_ms, breathing_rate_avg_per_min = EXCLUDED.breathing_rate_avg_per_min,
          recovery_status = EXCLUDED.recovery_status, ans_charge = EXCLUDED.ans_charge, ans_charge_status = EXCLUDED.ans_charge_status,
          updated_at = now();

        -- Raw + normalisé : activité
        INSERT INTO public.wearable_raw (consultant_id, provider, data_type, provider_record_id, data_date, payload, fetched_at)
        VALUES (v_consultant.id, 'polar', 'daily_activity', 'seed-' || v_consultant.id || '-act-' || v_day, v_day,
                jsonb_build_object('seed', true, 'date', v_day, 'steps', v_steps), now())
        ON CONFLICT (provider, data_type, provider_record_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
        RETURNING id INTO v_raw_id;

        INSERT INTO public.daily_activity
          (consultant_id, provider, source_raw_id, activity_date, steps, active_calories_kcal, total_calories_kcal, active_s, distance_m)
        VALUES (v_consultant.id, 'polar', v_raw_id, v_day, v_steps, (v_steps * 0.04)::int, (1650 + v_steps * 0.04)::int,
                v_active_s, round((v_steps * 0.72)::numeric, 2))
        ON CONFLICT (consultant_id, provider, activity_date) DO UPDATE SET
          source_raw_id = EXCLUDED.source_raw_id, steps = EXCLUDED.steps, active_calories_kcal = EXCLUDED.active_calories_kcal,
          total_calories_kcal = EXCLUDED.total_calories_kcal, active_s = EXCLUDED.active_s, distance_m = EXCLUDED.distance_m,
          updated_at = now();

        -- Fréquence cardiaque continue (derniers jours seulement, toutes les 30 min)
        IF v_d <= p_hr_days THEN
          INSERT INTO public.wearable_raw (consultant_id, provider, data_type, provider_record_id, data_date, payload, fetched_at)
          VALUES (v_consultant.id, 'polar', 'continuous_hr', 'seed-' || v_consultant.id || '-chr-' || v_day, v_day,
                  jsonb_build_object('seed', true, 'date', v_day), now())
          ON CONFLICT (provider, data_type, provider_record_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
          RETURNING id INTO v_raw_id;

          FOR i IN 0..47 LOOP
            v_hour := i / 2.0;
            v_ts := (v_day::timestamp + (v_hour || ' hours')::interval) AT TIME ZONE 'Europe/Paris';
            -- nuit basse, journée haute, pics en fin de matinée et fin d'après-midi
            v_hr := (CASE
                       WHEN v_hour < 6.5 OR v_hour >= 23 THEN v_hr_base + 2
                       WHEN v_hour BETWEEN 10 AND 12 OR v_hour BETWEEN 17 AND 19 THEN v_hr_day_base + 22
                       ELSE v_hr_day_base + 8
                     END
                     + sin(i + v_seed * 10) * 5 + v_jitter * 3)::int;
            INSERT INTO public.hr_samples (consultant_id, provider, source_raw_id, recorded_at, hr_bpm)
            VALUES (v_consultant.id, 'polar', v_raw_id, v_ts, GREATEST(38, v_hr))
            ON CONFLICT (consultant_id, provider, recorded_at) DO UPDATE SET hr_bpm = EXCLUDED.hr_bpm, source_raw_id = EXCLUDED.source_raw_id, updated_at = now();
          END LOOP;
        END IF;

        v_total_rows := v_total_rows + 3;
      END;
    END LOOP;

    RAISE NOTICE 'Données factices : % (%), profil %, % jours', v_consultant.email, v_consultant.id, v_profile, p_days;
  END LOOP;

  IF v_idx = 0 THEN
    RAISE EXCEPTION 'Aucun consultant trouvé (e-mails : %, praticien : %)', p_emails, p_practitioner_email;
  END IF;

  RAISE NOTICE '% consultant(s) alimenté(s), % lignes journalières écrites.', v_idx, v_total_rows;
END $$;

-- =============================================================================
-- BLOC 2 — Journal factice, dérivé des nuits factices (rejouable).
-- Pour chaque consultant à connexion « seed- » : une entrée par jour sur p_days jours.
--   * énergie   : suit la durée de la nuit (règle C) ;
--   * stress    : élevé la veille des nuits à VFC basse (règle B) ;
--   * qualité   : suit la nuit, sauf profils 1 et 3 qui se disent mal reposés
--                 malgré des nuits normales environ un jour sur trois (règle A) ;
--   * humeur    : dérivée de l'énergie ; notes libres certains jours.
-- Les entrées sont marquées custom_indicators @> '{"seed": true}' ; les entrées non
-- marquées d'un vrai patient ne sont jamais écrasées.
-- =============================================================================

DO $$
DECLARE
  p_days INTEGER := 60;
  v_conn RECORD;
  v_idx INTEGER := 0;
  v_profile INTEGER;
  v_day DATE;
  v_d INTEGER;
  v_seed DOUBLE PRECISION;
  v_sleep_base NUMERIC;   -- minutes, moyenne des nuits du consultant
  v_hrv_base NUMERIC;
  v_sleep_min NUMERIC;
  v_hrv_next NUMERIC;
  v_energy INTEGER;
  v_quality INTEGER;
  v_stress INTEGER;
  v_mood TEXT;
  v_note TEXT;
  v_rows INTEGER := 0;
  v_notes_tired TEXT[] := ARRAY['Réveillée plusieurs fois, impression de ne pas avoir dormi.', 'Fatigue dès le réveil.', 'Nuit agitée, beaucoup pensé au travail.', 'Mal à la tête ce matin.'];
  v_notes_good TEXT[] := ARRAY['Bonne journée, marche au soleil.', 'Séance de yoga le soir.', 'Dîner léger, couchée tôt.', 'Journée calme.'];
  v_notes_stress TEXT[] := ARRAY['Grosse journée au travail.', 'Réunion tendue, difficile de décrocher.', 'Enfants malades, journée compliquée.', 'Beaucoup d’écrans ce soir.'];
BEGIN
  FOR v_conn IN
    SELECT wc.consultant_id, c.practitioner_id
    FROM public.wearable_connections wc
    JOIN public.consultants c ON c.id = wc.consultant_id
    WHERE wc.provider_user_id LIKE 'seed-%'
    ORDER BY c.created_at
  LOOP
    v_idx := v_idx + 1;
    v_profile := ((v_idx - 1) % 5);

    SELECT avg(total_sleep_s) / 60.0 INTO v_sleep_base FROM public.sleep_sessions WHERE consultant_id = v_conn.consultant_id;
    SELECT avg(hrv_rmssd_avg_ms) INTO v_hrv_base FROM public.hrv_nightly WHERE consultant_id = v_conn.consultant_id;
    IF v_sleep_base IS NULL THEN
      RAISE NOTICE 'Journal ignoré (pas de nuits factices) : %', v_conn.consultant_id;
      CONTINUE;
    END IF;

    FOR v_d IN 1..p_days LOOP
      v_day := CURRENT_DATE - v_d;
      v_seed := (('x' || substr(md5('journal' || v_conn.consultant_id::text || v_day::text), 1, 8))::bit(32)::bigint % 1000) / 1000.0;

      -- Un jour sur huit sans entrée : le journal n'est pas rempli tous les jours.
      IF v_seed < 0.12 THEN CONTINUE; END IF;

      SELECT total_sleep_s / 60.0 INTO v_sleep_min FROM public.sleep_sessions WHERE consultant_id = v_conn.consultant_id AND night_date = v_day;
      SELECT hrv_rmssd_avg_ms INTO v_hrv_next FROM public.hrv_nightly WHERE consultant_id = v_conn.consultant_id AND night_date = v_day + 1;

      -- Énergie (1-10) : suit la nuit du jour (règle C).
      v_energy := LEAST(10, GREATEST(1, round(6 + COALESCE(v_sleep_min - v_sleep_base, 0) / 35.0 + (v_seed - 0.5) * 2)::int));

      -- Stress (1-10) : élevé quand la nuit suivante a une VFC basse (règle B).
      v_stress := LEAST(10, GREATEST(1, round(5 - COALESCE(v_hrv_next - v_hrv_base, 0) / 3.0 + (v_seed - 0.5) * 2)::int));

      -- Qualité ressentie (1-10) : suit la nuit… sauf décalage volontaire pour les profils 1 et 3 (règle A).
      v_quality := LEAST(10, GREATEST(1, round(6 + COALESCE(v_sleep_min - v_sleep_base, 0) / 30.0 + (v_seed - 0.5) * 2)::int));
      IF v_profile IN (1, 3) AND v_seed > 0.66 AND v_sleep_min >= v_sleep_base - 20 THEN
        v_quality := 3;
      END IF;

      v_mood := CASE WHEN v_energy >= 8 THEN 'tres_bien' WHEN v_energy >= 6 THEN 'bien' WHEN v_energy >= 5 THEN 'neutre' WHEN v_energy >= 3 THEN 'moyen' ELSE 'mauvais' END;

      v_note := CASE
        WHEN v_quality <= 4 AND v_seed > 0.5 THEN v_notes_tired[1 + (v_d % 4)]
        WHEN v_stress >= 7 AND v_seed > 0.4 THEN v_notes_stress[1 + (v_d % 4)]
        WHEN v_energy >= 8 AND v_seed > 0.6 THEN v_notes_good[1 + (v_d % 4)]
        ELSE NULL
      END;

      INSERT INTO public.journal_entries
        (consultant_id, practitioner_id, date, mood, sleep_quality, energy_level, stress_level, text,
         hydration_liters, exercise_type, exercise_duration_minutes, custom_indicators, source, created_at, updated_at)
      VALUES
        (v_conn.consultant_id, v_conn.practitioner_id, v_day, v_mood, v_quality, v_energy, v_stress, v_note,
         round((1.2 + v_seed * 1.3)::numeric, 1),
         CASE WHEN v_seed > 0.55 THEN (ARRAY['marche', 'yoga', 'vélo', 'natation'])[1 + (v_d % 4)] ELSE NULL END,
         CASE WHEN v_seed > 0.55 THEN 20 + (v_d % 4) * 15 ELSE NULL END,
         '{"seed": true}'::jsonb, 'consultant',
         (v_day::timestamp + time '21:30') AT TIME ZONE 'Europe/Paris', now())
      ON CONFLICT (consultant_id, date) DO UPDATE SET
        mood = EXCLUDED.mood, sleep_quality = EXCLUDED.sleep_quality, energy_level = EXCLUDED.energy_level,
        stress_level = EXCLUDED.stress_level, text = EXCLUDED.text, hydration_liters = EXCLUDED.hydration_liters,
        exercise_type = EXCLUDED.exercise_type, exercise_duration_minutes = EXCLUDED.exercise_duration_minutes,
        custom_indicators = EXCLUDED.custom_indicators, updated_at = now()
      WHERE public.journal_entries.custom_indicators @> '{"seed": true}'::jsonb;  -- jamais une vraie entrée

      v_rows := v_rows + 1;
    END LOOP;
    RAISE NOTICE 'Journal factice : consultant % (profil %)', v_conn.consultant_id, v_profile;
  END LOOP;
  RAISE NOTICE '% entrée(s) de journal écrite(s) pour % consultant(s).', v_rows, v_idx;
END $$;

-- =============================================================================
-- NETTOYAGE (à décommenter pour retirer toutes les données factices)
-- Supprime les lignes raw « seed- » ; les tables normalisées suivent en cascade.
-- =============================================================================
-- DELETE FROM public.journal_entries WHERE custom_indicators @> '{"seed": true}'::jsonb;
-- DELETE FROM public.wearable_raw WHERE provider_record_id LIKE 'seed-%';
-- DELETE FROM public.wearable_connections WHERE provider_user_id LIKE 'seed-%';
