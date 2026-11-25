


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."block_section" AS ENUM (
    'en_tete',
    'objectifs',
    'alimentation',
    'phytotherapie',
    'micronutrition',
    'aromatologie',
    'hydrologie',
    'activite',
    'equilibre_psycho',
    'respiration',
    'techniques_manuelles',
    'sommeil',
    'environnement',
    'suivi',
    'cloture',
    'notes_libres'
);


ALTER TYPE "public"."block_section" OWNER TO "postgres";


CREATE TYPE "public"."block_source" AS ENUM (
    'afeia_base',
    'praticien',
    'communautaire'
);


ALTER TYPE "public"."block_source" OWNER TO "postgres";


CREATE TYPE "public"."consultation_motif" AS ENUM (
    'digestif',
    'fatigue',
    'stress',
    'sommeil',
    'feminin',
    'perte_poids',
    'immunite',
    'peau',
    'douleurs',
    'detox',
    'cardiovasculaire',
    'enfant',
    'universel'
);


ALTER TYPE "public"."consultation_motif" OWNER TO "postgres";


CREATE TYPE "public"."wearable_backfill_status" AS ENUM (
    'pending',
    'running',
    'done',
    'failed'
);


ALTER TYPE "public"."wearable_backfill_status" OWNER TO "postgres";


CREATE TYPE "public"."wearable_connection_status" AS ENUM (
    'active',
    'revoked',
    'error'
);


ALTER TYPE "public"."wearable_connection_status" OWNER TO "postgres";


CREATE TYPE "public"."wearable_data_type" AS ENUM (
    'sleep',
    'nightly_recharge',
    'continuous_hr',
    'daily_activity'
);


ALTER TYPE "public"."wearable_data_type" OWNER TO "postgres";


CREATE TYPE "public"."wearable_event_status" AS ENUM (
    'pending',
    'processing',
    'done',
    'failed',
    'ignored'
);


ALTER TYPE "public"."wearable_event_status" OWNER TO "postgres";


CREATE TYPE "public"."wearable_provider" AS ENUM (
    'polar'
);


ALTER TYPE "public"."wearable_provider" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_trigger_circular_sync"("patient_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.patients_identity
  SET last_circular_sync_at = now(),
      last_circular_sync_status = 'queued',
      updated_at = now()
  WHERE id = patient_id;
END;
$$;


ALTER FUNCTION "public"."admin_trigger_circular_sync"("patient_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_invoice_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (NEW.status IN ('issued', 'paid')) AND
     (OLD IS NULL OR OLD.status = 'draft') AND
     (NEW.numero IS NULL) THEN
    NEW.numero := get_next_invoice_number(NEW.practitioner_id, NEW.annee_fiscale);
    NEW.date_emission := NOW();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_invoice_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_practitioner_consultant_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT c.id FROM public.consultants c WHERE c.practitioner_id = auth.uid();
$$;


ALTER FUNCTION "public"."auth_practitioner_consultant_ids"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auth_practitioner_consultant_ids"() IS 'Consultants rattachés au praticien connecté (consultants.practitioner_id = auth.uid()).';



CREATE OR REPLACE FUNCTION "public"."auth_self_consultant_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT m.consultant_id FROM public.consultant_memberships m WHERE m.consultant_user_id = auth.uid();
$$;


ALTER FUNCTION "public"."auth_self_consultant_ids"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auth_self_consultant_ids"() IS 'Fiche(s) consultant de l''utilisateur connecté (consultant_memberships.consultant_user_id = auth.uid()).';



CREATE OR REPLACE FUNCTION "public"."billing_connections_delete_secret"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.api_key_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.api_key_secret_id;
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."billing_connections_delete_secret"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."billing_get_api_key"("p_practitioner_id" "uuid", "p_provider" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT s.decrypted_secret
  FROM public.billing_connections bc
  JOIN vault.decrypted_secrets s ON s.id = bc.api_key_secret_id
  WHERE bc.practitioner_id = p_practitioner_id
    AND bc.provider = p_provider
    AND bc.status IN ('active', 'error');
$$;


ALTER FUNCTION "public"."billing_get_api_key"("p_practitioner_id" "uuid", "p_provider" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."billing_revoke_connection"("p_practitioner_id" "uuid", "p_provider" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  SELECT api_key_secret_id INTO v_secret_id
  FROM public.billing_connections
  WHERE practitioner_id = p_practitioner_id AND provider = p_provider
  FOR UPDATE;

  UPDATE public.billing_connections
  SET status = 'revoked', api_key_secret_id = NULL, updated_at = now()
  WHERE practitioner_id = p_practitioner_id AND provider = p_provider;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."billing_revoke_connection"("p_practitioner_id" "uuid", "p_provider" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."billing_save_connection"("p_practitioner_id" "uuid", "p_provider" "text", "p_api_key" "text", "p_account_label" "text", "p_vat_mode" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_id        UUID;
  v_secret_id UUID;
BEGIN
  IF coalesce(p_api_key, '') = '' THEN
    RAISE EXCEPTION 'api key is required';
  END IF;

  SELECT id, api_key_secret_id INTO v_id, v_secret_id
  FROM public.billing_connections
  WHERE practitioner_id = p_practitioner_id AND provider = p_provider
  FOR UPDATE;

  IF v_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_secret_id, p_api_key);
  ELSE
    v_secret_id := vault.create_secret(
      p_api_key,
      'billing:' || p_provider || ':' || p_practitioner_id || ':' || gen_random_uuid(),
      'Clé API outil de facturation'
    );
  END IF;

  INSERT INTO public.billing_connections AS bc (
    practitioner_id, provider, api_key_secret_id, account_label, vat_mode,
    status, connected_at, last_error, updated_at
  ) VALUES (
    p_practitioner_id, p_provider, v_secret_id, p_account_label, coalesce(p_vat_mode, 'franchise'),
    'active', now(), NULL, now()
  )
  ON CONFLICT (practitioner_id, provider) DO UPDATE SET
    api_key_secret_id = EXCLUDED.api_key_secret_id,
    account_label     = EXCLUDED.account_label,
    vat_mode          = EXCLUDED.vat_mode,
    status            = 'active',
    connected_at      = now(),
    last_error        = NULL,
    updated_at        = now()
  RETURNING bc.id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."billing_save_connection"("p_practitioner_id" "uuid", "p_provider" "text", "p_api_key" "text", "p_account_label" "text", "p_vat_mode" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."book_appointment"("p_practitioner_id" "uuid", "p_consultation_type_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_booking_name" "text", "p_booking_email" "text", "p_booking_phone" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_appointment_id UUID;
  v_conflict_count INT;
  v_consultant_id UUID;
BEGIN
  -- Check for conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments
  WHERE practitioner_id = p_practitioner_id
    AND status NOT IN ('cancelled', 'rescheduled')
    AND starts_at < p_ends_at
    AND ends_at > p_starts_at;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_CONFLICT: Ce créneau n''est plus disponible';
  END IF;

  -- Try to match existing consultant by email
  IF p_booking_email IS NOT NULL THEN
    SELECT id INTO v_consultant_id
    FROM consultants
    WHERE email = p_booking_email
      AND practitioner_id = p_practitioner_id
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- If no match, create a new consultant record
  IF v_consultant_id IS NULL THEN
    INSERT INTO consultants (
      practitioner_id, name, email, phone, source
    ) VALUES (
      p_practitioner_id,
      p_booking_name,
      p_booking_email,
      p_booking_phone,
      'online_booking'
    )
    RETURNING id INTO v_consultant_id;
  END IF;

  -- Create the appointment (fixed: consultant_id instead of patient_id)
  INSERT INTO appointments (
    practitioner_id, consultant_id, consultation_type_id,
    starts_at, ends_at, status, source,
    booking_name, booking_email, booking_phone,
    notes_public
  ) VALUES (
    p_practitioner_id, v_consultant_id, p_consultation_type_id,
    p_starts_at, p_ends_at, 'confirmed', 'online_booking',
    p_booking_name, p_booking_email, p_booking_phone,
    p_reason
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;


ALTER FUNCTION "public"."book_appointment"("p_practitioner_id" "uuid", "p_consultation_type_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_booking_name" "text", "p_booking_email" "text", "p_booking_phone" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_patient_invite"("token" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invite_record public.patient_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO invite_record
  FROM public.patient_invites
  WHERE patient_invites.token = claim_patient_invite.token
    AND patient_invites.expires_at > NOW()
    AND patient_invites.used_at IS NULL
  FOR UPDATE;

  IF invite_record.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.patient_memberships
    WHERE patient_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Patient already linked';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.patient_memberships
    WHERE patient_id = invite_record.patient_id
  ) THEN
    RAISE EXCEPTION 'Patient already has an account';
  END IF;

  INSERT INTO public.patient_memberships (patient_id, patient_user_id)
  VALUES (invite_record.patient_id, auth.uid());

  UPDATE public.patient_invites
  SET used_at = NOW(),
      updated_at = NOW()
  WHERE id = invite_record.id;

  RETURN invite_record.patient_id;
END;
$$;


ALTER FUNCTION "public"."claim_patient_invite"("token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_otp_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Delete expired codes for this email
  DELETE FROM public.otp_codes
  WHERE email = NEW.email
    AND (expires_at < NOW() OR created_at < NOW() - INTERVAL '1 hour');

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cleanup_otp_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_consultant_from_questionnaire"("p_questionnaire_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_questionnaire RECORD;
  v_consultant_id UUID;
BEGIN
  SELECT * INTO v_questionnaire
  FROM public.preliminary_questionnaires
  WHERE id = p_questionnaire_id
    AND naturopath_id = auth.uid()
    AND status = 'pending';

  IF v_questionnaire IS NULL THEN
    RAISE EXCEPTION 'Questionnaire not found or already linked';
  END IF;

  INSERT INTO public.consultants (
    practitioner_id,
    name,
    first_name,
    last_name,
    email,
    phone,
    status
  )
  VALUES (
    v_questionnaire.naturopath_id,
    v_questionnaire.first_name || ' ' || v_questionnaire.last_name,
    v_questionnaire.first_name,
    v_questionnaire.last_name,
    v_questionnaire.email,
    v_questionnaire.phone,
    'standard'
  )
  RETURNING id INTO v_consultant_id;

  RETURN v_consultant_id;
END;
$$;


ALTER FUNCTION "public"."create_consultant_from_questionnaire"("p_questionnaire_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_patient_membership_ultimate"("p_patient_id" "uuid", "p_patient_user_id" "uuid") RETURNS TABLE("membership_id" "uuid", "success" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_membership_id UUID;
  v_existing_id UUID;
BEGIN
  -- Log pour debug
  RAISE NOTICE '🔧 RPC appelée - Patient: %, User: %', p_patient_id, p_patient_user_id;

  -- 1. Vérifier l'authentification
  IF auth.uid() IS NULL THEN
    RAISE NOTICE '❌ Non authentifié';
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Non authentifié'::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ Auth OK - UID: %', auth.uid();

  IF auth.uid() != p_patient_user_id THEN
    RAISE NOTICE '❌ UID ne correspond pas';
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Non autorisé'::TEXT;
    RETURN;
  END IF;

  -- 2. Vérifier si existe déjà
  SELECT id INTO v_existing_id
  FROM patient_memberships
  WHERE patient_user_id = p_patient_user_id
  AND patient_id = p_patient_id;

  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE '✅ Membership existe déjà: %', v_existing_id;
    RETURN QUERY SELECT v_existing_id, TRUE, 'Déjà existant'::TEXT;
    RETURN;
  END IF;

  -- 3. Vérifier que le patient existe
  IF NOT EXISTS (SELECT 1 FROM patients WHERE id = p_patient_id) THEN
    RAISE NOTICE '❌ Patient inexistant: %', p_patient_id;
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Patient inexistant'::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✅ Patient existe';

  -- 4. Insérer le membership
  BEGIN
    INSERT INTO patient_memberships (patient_id, patient_user_id, created_at)
    VALUES (p_patient_id, p_patient_user_id, NOW())
    RETURNING id INTO v_membership_id;

    RAISE NOTICE '✅ Membership créé: %', v_membership_id;
    RETURN QUERY SELECT v_membership_id, TRUE, 'Créé avec succès'::TEXT;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Erreur insertion: % - %', SQLSTATE, SQLERRM;
      RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
  END;

END;
$$;


ALTER FUNCTION "public"."create_patient_membership_ultimate"("p_patient_id" "uuid", "p_patient_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_expired_otp_codes"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.otp_codes
  WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."delete_expired_otp_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_activation_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_activation_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_anamnesis_history"("p_consultant_id" "uuid", "p_section" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "anamnesis_id" "uuid", "consultant_id" "uuid", "modified_section" "text", "old_value" "jsonb", "new_value" "jsonb", "version" integer, "modified_by_type" "text", "modified_by_id" "uuid", "modified_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT
    ah.id,
    ah.anamnesis_id,
    ah.consultant_id,
    ah.modified_section,
    ah.old_value,
    ah.new_value,
    ah.version,
    ah.modified_by_type,
    ah.modified_by_id,
    ah.modified_at
  FROM public.anamnesis_history ah
  WHERE ah.consultant_id = p_consultant_id
    AND (p_section IS NULL OR ah.modified_section = p_section)
    AND ah.consultant_id IN (
      SELECT id FROM public.consultants WHERE practitioner_id = auth.uid()
    )
  ORDER BY ah.modified_at DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_anamnesis_history"("p_consultant_id" "uuid", "p_section" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_group_session_registration_count"("p_session_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::INT
  FROM group_session_registrations
  WHERE group_session_id = p_session_id
    AND status != 'cancelled';
$$;


ALTER FUNCTION "public"."get_group_session_registration_count"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_invoice_number"("p_practitioner_id" "uuid", "p_annee_fiscale" integer) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_sequence_name TEXT;
  v_next_num INTEGER;
  v_numero TEXT;
BEGIN
  v_sequence_name := 'invoice_seq_' || REPLACE(p_practitioner_id::TEXT, '-', '_') || '_' || p_annee_fiscale;

  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = v_sequence_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE %I START 1', v_sequence_name);
  END IF;

  EXECUTE format('SELECT nextval(%L)', v_sequence_name) INTO v_next_num;

  v_numero := p_annee_fiscale || '-' || LPAD(v_next_num::TEXT, 4, '0');

  RETURN v_numero;
END;
$$;


ALTER FUNCTION "public"."get_next_invoice_number"("p_practitioner_id" "uuid", "p_annee_fiscale" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_preliminary_questionnaires"("p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "naturopath_id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "phone" "text", "responses" "jsonb", "status" "text", "linked_consultant_id" "uuid", "linked_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT
    pq.id,
    pq.naturopath_id,
    pq.first_name,
    pq.last_name,
    pq.email,
    pq.phone,
    pq.responses,
    pq.status,
    pq.linked_consultant_id,
    pq.linked_at,
    pq.created_at,
    pq.updated_at
  FROM public.preliminary_questionnaires pq
  WHERE pq.naturopath_id = auth.uid()
    AND (p_status IS NULL OR pq.status = p_status)
  ORDER BY pq.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;


ALTER FUNCTION "public"."get_preliminary_questionnaires"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_practitioners"() RETURNS TABLE("id" "uuid", "full_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT id, full_name
  FROM public.practitioners
  ORDER BY full_name;
$$;


ALTER FUNCTION "public"."get_public_practitioners"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_practitioner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') <> 'practitioner' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.practitioners (id, email, full_name, first_name, last_name, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'invited', '') = 'true' THEN 'validated' ELSE 'pending_validation' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_practitioner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $_$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_allowlist WHERE admin_allowlist.email = $1
  );
$_$;


ALTER FUNCTION "public"."is_admin"("email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_preliminary_questionnaire_on_patient_create"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_questionnaire_id UUID;
  v_questionnaire_responses JSONB;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  SELECT id, responses INTO v_questionnaire_id, v_questionnaire_responses
  FROM public.preliminary_questionnaires
  WHERE naturopath_id = NEW.practitioner_id
    AND LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_questionnaire_id IS NOT NULL THEN
    UPDATE public.preliminary_questionnaires
    SET
      status = 'linked_to_consultant',
      linked_consultant_id = NEW.id,
      linked_at = NOW(),
      updated_at = NOW()
    WHERE id = v_questionnaire_id;

    INSERT INTO public.consultant_anamnesis (
      consultant_id,
      naturopath_id,
      answers,
      source,
      preliminary_questionnaire_id,
      version
    )
    VALUES (
      NEW.id,
      NEW.practitioner_id,
      v_questionnaire_responses,
      'preliminary_questionnaire',
      v_questionnaire_id,
      1
    )
    ON CONFLICT (consultant_id)
    DO UPDATE SET
      answers = EXCLUDED.answers,
      source = EXCLUDED.source,
      preliminary_questionnaire_id = EXCLUDED.preliminary_questionnaire_id,
      updated_at = NOW();

    INSERT INTO public.notifications (
      practitioner_id,
      consultant_id,
      type,
      title,
      description,
      level,
      metadata
    )
    VALUES (
      NEW.practitioner_id,
      NEW.id,
      'questionnaire_linked',
      'Questionnaire lié automatiquement',
      'Le questionnaire préliminaire de ' || NEW.name || ' a été automatiquement associé à sa fiche consultant.',
      'info',
      jsonb_build_object(
        'questionnaire_id', v_questionnaire_id,
        'consultant_name', NEW.name,
        'linked_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."link_preliminary_questionnaire_on_patient_create"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_invoice_action"("p_invoice_id" "uuid", "p_action" "text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO invoice_history (invoice_id, action, user_id, metadata)
  VALUES (p_invoice_id, p_action, auth.uid(), p_metadata)
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;


ALTER FUNCTION "public"."log_invoice_action"("p_invoice_id" "uuid", "p_action" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_preliminary_questionnaire"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notifications (
    practitioner_id,
    consultant_id,
    type,
    title,
    description,
    level,
    metadata
  )
  VALUES (
    NEW.naturopath_id,
    NULL,
    'new_preliminary_questionnaire',
    'Nouveau questionnaire préliminaire',
    NEW.first_name || ' ' || NEW.last_name || ' a soumis un questionnaire préliminaire.',
    'info',
    jsonb_build_object(
      'questionnaire_id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'email', NEW.email,
      'submitted_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_preliminary_questionnaire"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_patient_practitioner_reassign"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.practitioner_id IS DISTINCT FROM OLD.practitioner_id THEN
    RAISE EXCEPTION 'Practitioner reassignment is not allowed for patients.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_patient_practitioner_reassign"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_practitioner_account_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND current_user IN ('authenticated', 'anon') THEN
    NEW.account_status := OLD.account_status;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_practitioner_account_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_consultant_plans_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_consultant_plans_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_preliminary_questionnaire"("p_naturopath_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text" DEFAULT NULL::"text", "p_responses" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_questionnaire_id UUID;
BEGIN
  -- Validate required fields
  IF p_naturopath_id IS NULL THEN
    RAISE EXCEPTION 'naturopath_id is required';
  END IF;

  IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
    RAISE EXCEPTION 'first_name is required';
  END IF;

  IF p_last_name IS NULL OR TRIM(p_last_name) = '' THEN
    RAISE EXCEPTION 'last_name is required';
  END IF;

  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'email is required';
  END IF;

  -- Validate email format (basic)
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Verify naturopath exists
  IF NOT EXISTS (SELECT 1 FROM public.practitioners WHERE id = p_naturopath_id) THEN
    RAISE EXCEPTION 'Invalid naturopath_id';
  END IF;

  -- Insert questionnaire
  INSERT INTO public.preliminary_questionnaires (
    naturopath_id,
    first_name,
    last_name,
    email,
    phone,
    responses
  )
  VALUES (
    p_naturopath_id,
    TRIM(p_first_name),
    TRIM(p_last_name),
    LOWER(TRIM(p_email)),
    TRIM(p_phone),
    p_responses
  )
  RETURNING id INTO v_questionnaire_id;

  RETURN v_questionnaire_id;
END;
$_$;


ALTER FUNCTION "public"."submit_preliminary_questionnaire"("p_naturopath_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_responses" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_message_content"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Sync content and body columns
  IF NEW.content IS NOT NULL AND NEW.body IS NULL THEN
    NEW.body := NEW.content;
  ELSIF NEW.body IS NOT NULL AND NEW.content IS NULL THEN
    NEW.content := NEW.body;
  END IF;

  -- Sync read and read_by_practitioner
  IF NEW.read IS NOT NULL AND NEW.read_by_practitioner IS NULL THEN
    NEW.read_by_practitioner := NEW.read;
  ELSIF NEW.read_by_practitioner IS NOT NULL AND NEW.read IS NULL THEN
    NEW.read := NEW.read_by_practitioner;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_message_content"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_anamnesis_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_practitioner_id UUID;
  v_consultant_name TEXT;
  v_old_sections TEXT[];
  v_modified_sections TEXT[];
  v_section TEXT;
  v_old_section_value JSONB;
  v_new_section_value JSONB;
BEGIN
  SELECT c.practitioner_id, c.name
  INTO v_practitioner_id, v_consultant_name
  FROM public.consultants c
  WHERE c.id = NEW.consultant_id;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  NEW.version := COALESCE(OLD.version, 0) + 1;

  SELECT ARRAY(
    SELECT DISTINCT key
    FROM (
      SELECT jsonb_object_keys(COALESCE(OLD.answers, '{}'::jsonb)) AS key
      UNION
      SELECT jsonb_object_keys(COALESCE(NEW.answers, '{}'::jsonb)) AS key
    ) keys
  ) INTO v_old_sections;

  v_modified_sections := ARRAY[]::TEXT[];

  FOREACH v_section IN ARRAY v_old_sections
  LOOP
    v_old_section_value := OLD.answers->v_section;
    v_new_section_value := NEW.answers->v_section;

    IF v_old_section_value IS DISTINCT FROM v_new_section_value THEN
      v_modified_sections := array_append(v_modified_sections, v_section);

      INSERT INTO public.anamnesis_history (
        anamnesis_id,
        consultant_id,
        modified_section,
        old_value,
        new_value,
        full_snapshot,
        version,
        modified_by_type,
        modified_by_id
      )
      VALUES (
        NEW.id,
        NEW.consultant_id,
        v_section,
        v_old_section_value,
        v_new_section_value,
        NEW.answers,
        NEW.version,
        'consultant',
        NULL
      );
    END IF;
  END LOOP;

  IF array_length(v_modified_sections, 1) > 0 THEN
    INSERT INTO public.notifications (
      practitioner_id,
      consultant_id,
      type,
      title,
      description,
      level,
      metadata
    )
    VALUES (
      v_practitioner_id,
      NEW.consultant_id,
      'anamnesis_modified',
      'Anamnèse modifiée',
      'Le consultant ' || v_consultant_name || ' a modifié la section ' ||
        CASE
          WHEN array_length(v_modified_sections, 1) = 1 THEN v_modified_sections[1]
          ELSE array_to_string(v_modified_sections, ', ')
        END || ' de son anamnèse.',
      'info',
      jsonb_build_object(
        'consultant_id', NEW.consultant_id,
        'consultant_name', v_consultant_name,
        'modified_sections', v_modified_sections,
        'version', NEW.version,
        'modified_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_anamnesis_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_consultant_iris_photos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_consultant_iris_photos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_consultant_terrain_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_consultant_terrain_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_educational_resources_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_educational_resources_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_claim_backfill"("p_connection_id" "uuid", "p_stale_after" interval DEFAULT '00:10:00'::interval) RETURNS TABLE("id" "uuid", "consultant_id" "uuid", "provider" "public"."wearable_provider", "provider_user_id" "text", "backfill_cursor" "date", "backfill_days" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  UPDATE public.wearable_connections c
  SET backfill_status = 'running', backfill_updated_at = clock_timestamp()
  WHERE c.id = p_connection_id
    AND c.status = 'active'
    AND (c.backfill_status = 'pending'
         OR (c.backfill_status = 'running'
             AND coalesce(c.backfill_updated_at, '-infinity') < clock_timestamp() - p_stale_after))
  RETURNING c.id, c.consultant_id, c.provider, c.provider_user_id, c.backfill_cursor, c.backfill_days;
$$;


ALTER FUNCTION "public"."wearable_claim_backfill"("p_connection_id" "uuid", "p_stale_after" interval) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."wearable_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "event_type" "text" NOT NULL,
    "provider_user_id" "text" NOT NULL,
    "consultant_id" "uuid",
    "event_date" "date",
    "resource_url" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "status" "public"."wearable_event_status" DEFAULT 'pending'::"public"."wearable_event_status" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_notified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processing_started_at" timestamp with time zone,
    "processed_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."wearable_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_claim_event"("p_id" "uuid") RETURNS SETOF "public"."wearable_events"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  UPDATE public.wearable_events
  SET status = 'processing', processing_started_at = clock_timestamp()
  WHERE id = p_id AND status = 'pending' AND next_attempt_at <= now()
  RETURNING *;
$$;


ALTER FUNCTION "public"."wearable_claim_event"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_connections_delete_secret"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.access_token_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.access_token_secret_id;
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."wearable_connections_delete_secret"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_daily_summary"("p_consultant_id" "uuid", "p_days" integer, "p_today" "date" DEFAULT NULL::"date", "p_timezone" "text" DEFAULT 'Europe/Paris'::"text") RETURNS TABLE("day" "date", "sleep_min" integer, "hrv_ms" integer, "night_hr_bpm" integer, "steps" integer)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  WITH bounds AS (
    SELECT
      coalesce(p_today, (now() AT TIME ZONE p_timezone)::date) AS last_day,
      coalesce(p_today, (now() AT TIME ZONE p_timezone)::date) - (greatest(p_days, 1) - 1) AS first_day
  ),
  allowed AS (
    SELECT 1
    WHERE p_consultant_id IN (SELECT public.auth_practitioner_consultant_ids())
       OR p_consultant_id IN (SELECT public.auth_self_consultant_ids())
  ),
  days AS (
    SELECT d::date AS day
    FROM bounds, allowed, generate_series(bounds.first_day, bounds.last_day, interval '1 day') AS d
  ),
  sleep AS (
    SELECT s.night_date AS day, round(avg(s.total_sleep_s) / 60.0)::int AS sleep_min
    FROM public.sleep_sessions s, bounds
    WHERE s.consultant_id = p_consultant_id AND s.night_date BETWEEN bounds.first_day AND bounds.last_day
    GROUP BY s.night_date
  ),
  hrv AS (
    SELECT h.night_date AS day,
           round(avg(h.hrv_rmssd_avg_ms))::int AS hrv_ms,
           round(avg(h.hr_avg_bpm))::int AS night_hr_bpm
    FROM public.hrv_nightly h, bounds
    WHERE h.consultant_id = p_consultant_id AND h.night_date BETWEEN bounds.first_day AND bounds.last_day
    GROUP BY h.night_date
  ),
  activity AS (
    SELECT a.activity_date AS day, max(a.steps)::int AS steps
    FROM public.daily_activity a, bounds
    WHERE a.consultant_id = p_consultant_id AND a.activity_date BETWEEN bounds.first_day AND bounds.last_day
    GROUP BY a.activity_date
  )
  SELECT d.day, sleep.sleep_min, hrv.hrv_ms, hrv.night_hr_bpm, activity.steps
  FROM days d
  LEFT JOIN sleep USING (day)
  LEFT JOIN hrv USING (day)
  LEFT JOIN activity USING (day)
  ORDER BY d.day;
$$;


ALTER FUNCTION "public"."wearable_daily_summary"("p_consultant_id" "uuid", "p_days" integer, "p_today" "date", "p_timezone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."wearable_daily_summary"("p_consultant_id" "uuid", "p_days" integer, "p_today" "date", "p_timezone" "text") IS 'Séries quotidiennes (sommeil, VFC nocturne, FC nocturne, pas) d''un consultant, jours Europe/Paris, NULL sans donnée ; RLS appliquée.';



CREATE OR REPLACE FUNCTION "public"."wearable_disconnect"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_delete_data" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_secret_id        UUID;
  v_provider_user_id TEXT;
  v_found            BOOLEAN;
  v_counts           JSONB := '{}'::jsonb;
  v_n                INTEGER;
BEGIN
  SELECT access_token_secret_id, provider_user_id, true
    INTO v_secret_id, v_provider_user_id, v_found
  FROM public.wearable_connections
  WHERE consultant_id = p_consultant_id AND provider = p_provider
  FOR UPDATE;

  -- POL-18 : la déconnexion retire le consentement actif (trace conservée, withdrawn_at renseigné).
  UPDATE public.wearable_consents
  SET withdrawn_at = now()
  WHERE consultant_id = p_consultant_id AND withdrawn_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := jsonb_build_object('consents_withdrawn', v_n);

  IF v_found IS NULL THEN
    RETURN jsonb_build_object('found', false, 'consents_withdrawn', v_n);
  END IF;

  UPDATE public.wearable_connections
  SET status = 'revoked',
      access_token_secret_id = NULL,
      token_expires_at = NULL,
      interrupted_at = coalesce(interrupted_at, now()),
      updated_at = now()
  WHERE consultant_id = p_consultant_id AND provider = p_provider;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;

  IF p_delete_data THEN
    DELETE FROM public.sleep_sessions WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('sleep_sessions', v_n);
    DELETE FROM public.hrv_nightly WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('hrv_nightly', v_n);
    DELETE FROM public.hr_samples WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('hr_samples', v_n);
    DELETE FROM public.daily_activity WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('daily_activity', v_n);
    DELETE FROM public.wearable_raw WHERE consultant_id = p_consultant_id AND provider = p_provider;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('wearable_raw', v_n);
    DELETE FROM public.wearable_events
    WHERE provider = p_provider
      AND (consultant_id = p_consultant_id OR provider_user_id = v_provider_user_id);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('wearable_events', v_n);
  END IF;

  RETURN jsonb_build_object('found', true, 'consents_withdrawn', (v_counts->>'consents_withdrawn')::int,
                            'deleted', v_counts - 'consents_withdrawn');
END;
$$;


ALTER FUNCTION "public"."wearable_disconnect"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_delete_data" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_finish_event"("p_id" "uuid", "p_status" "public"."wearable_event_status", "p_error" "text" DEFAULT NULL::"text", "p_retry_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_consultant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("requeued" boolean, "status" "public"."wearable_event_status", "attempts" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_requeue BOOLEAN;
BEGIN
  IF p_status NOT IN ('done', 'failed', 'ignored', 'pending') THEN
    RAISE EXCEPTION 'statut final invalide : %', p_status;
  END IF;

  SELECT e.last_notified_at > e.processing_started_at INTO v_requeue
  FROM public.wearable_events e
  WHERE e.id = p_id AND e.status = 'processing'
  FOR UPDATE;

  IF v_requeue IS NULL THEN
    RAISE EXCEPTION 'événement % introuvable ou pas en cours de traitement', p_id;
  END IF;

  RETURN QUERY
  UPDATE public.wearable_events e SET
    status                = CASE WHEN v_requeue THEN 'pending'::public.wearable_event_status ELSE p_status END,
    attempts              = CASE WHEN v_requeue THEN 0
                                 WHEN p_status = 'failed' THEN e.attempts + 1
                                 ELSE e.attempts END,
    last_error            = CASE WHEN v_requeue OR p_status <> 'failed' THEN NULL ELSE p_error END,
    next_attempt_at       = CASE WHEN v_requeue THEN now() ELSE coalesce(p_retry_at, e.next_attempt_at) END,
    consultant_id         = coalesce(p_consultant_id, e.consultant_id),
    processed_at          = now(),
    processing_started_at = NULL
  WHERE e.id = p_id
  RETURNING v_requeue, e.status, e.attempts;
END;
$$;


ALTER FUNCTION "public"."wearable_finish_event"("p_id" "uuid", "p_status" "public"."wearable_event_status", "p_error" "text", "p_retry_at" timestamp with time zone, "p_consultant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_get_access_token"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT s.decrypted_secret
  FROM public.wearable_connections wc
  JOIN vault.decrypted_secrets s ON s.id = wc.access_token_secret_id
  WHERE wc.consultant_id = p_consultant_id
    AND wc.provider = p_provider
    AND wc.status IN ('active', 'error');
$$;


ALTER FUNCTION "public"."wearable_get_access_token"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_record_event"("p_provider" "public"."wearable_provider", "p_event_type" "text", "p_provider_user_id" "text", "p_event_date" "date", "p_resource_url" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_next_attempt_at" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("id" "uuid", "status" "public"."wearable_event_status", "should_process" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  INSERT INTO public.wearable_events AS e (
    provider, event_type, provider_user_id, event_date, resource_url, payload,
    idempotency_key, next_attempt_at
  ) VALUES (
    p_provider, p_event_type, p_provider_user_id, p_event_date, p_resource_url,
    coalesce(p_payload, '{}'::jsonb), p_idempotency_key, coalesce(p_next_attempt_at, now())
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    last_notified_at = clock_timestamp(),
    payload          = EXCLUDED.payload,
    resource_url     = coalesce(EXCLUDED.resource_url, e.resource_url),
    status           = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN 'pending'::public.wearable_event_status ELSE e.status END,
    attempts         = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN 0 ELSE e.attempts END,
    next_attempt_at  = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN EXCLUDED.next_attempt_at ELSE e.next_attempt_at END,
    last_error       = CASE WHEN e.status IN ('done', 'failed', 'ignored') THEN NULL ELSE e.last_error END
  RETURNING e.id, e.status, (e.status = 'pending' AND e.next_attempt_at <= now()) AS should_process;
$$;


ALTER FUNCTION "public"."wearable_record_event"("p_provider" "public"."wearable_provider", "p_event_type" "text", "p_provider_user_id" "text", "p_event_date" "date", "p_resource_url" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_next_attempt_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_requeue_due_events"("p_max_attempts" integer DEFAULT 5, "p_stale_after" interval DEFAULT '00:15:00'::interval, "p_limit" integer DEFAULT 200) RETURNS TABLE("id" "uuid", "event_type" "text", "attempts" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.wearable_events e
  SET status = 'pending', processing_started_at = NULL
  WHERE (e.status = 'failed' AND e.attempts < p_max_attempts AND e.next_attempt_at <= now())
     OR (e.status = 'processing' AND e.processing_started_at < clock_timestamp() - p_stale_after);

  RETURN QUERY
  SELECT e.id, e.event_type, e.attempts
  FROM public.wearable_events e
  WHERE e.status = 'pending' AND e.next_attempt_at <= now()
  ORDER BY e.next_attempt_at
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."wearable_requeue_due_events"("p_max_attempts" integer, "p_stale_after" interval, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_revoke_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  SELECT access_token_secret_id INTO v_secret_id
  FROM public.wearable_connections
  WHERE consultant_id = p_consultant_id AND provider = p_provider
  FOR UPDATE;

  UPDATE public.wearable_connections
  SET status = 'revoked', access_token_secret_id = NULL, updated_at = now(),
      interrupted_at = coalesce(interrupted_at, now())
  WHERE consultant_id = p_consultant_id AND provider = p_provider;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."wearable_revoke_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_save_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_provider_user_id" "text", "p_access_token" "text", "p_token_expires_at" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_id        UUID;
  v_secret_id UUID;
BEGIN
  IF coalesce(p_access_token, '') = '' THEN
    RAISE EXCEPTION 'access token is required';
  END IF;

  SELECT id, access_token_secret_id INTO v_id, v_secret_id
  FROM public.wearable_connections
  WHERE consultant_id = p_consultant_id AND provider = p_provider
  FOR UPDATE;

  IF v_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_secret_id, p_access_token);
  ELSE
    v_secret_id := vault.create_secret(
      p_access_token,
      'wearable:' || p_provider || ':' || p_consultant_id || ':' || gen_random_uuid(),
      'Jeton OAuth objet connecté'
    );
  END IF;

  INSERT INTO public.wearable_connections AS wc (
    consultant_id, provider, provider_user_id, access_token_secret_id,
    token_expires_at, status, connected_at, last_error, updated_at
  ) VALUES (
    p_consultant_id, p_provider, p_provider_user_id, v_secret_id,
    p_token_expires_at, 'active', now(), NULL, now()
  )
  ON CONFLICT (consultant_id, provider) DO UPDATE SET
    provider_user_id       = EXCLUDED.provider_user_id,
    access_token_secret_id = EXCLUDED.access_token_secret_id,
    token_expires_at       = EXCLUDED.token_expires_at,
    status                 = 'active',
    connected_at           = now(),
    last_error             = NULL,
    updated_at             = now(),
    -- POL-14 : une (re)connexion relance l'import d'historique depuis le début (idempotent).
    backfill_status        = 'pending',
    backfill_cursor        = NULL,
    backfill_updated_at    = NULL,
    -- POL-16 : la connexion n'est plus interrompue.
    interrupted_at         = NULL
  RETURNING wc.id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."wearable_save_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_provider_user_id" "text", "p_access_token" "text", "p_token_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wearable_truncate_normalized"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  TRUNCATE public.sleep_sessions, public.hrv_nightly, public.hr_samples, public.daily_activity;
$$;


ALTER FUNCTION "public"."wearable_truncate_normalized"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_allowlist" (
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."admin_allowlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid",
    "admin_email" "text" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "uuid",
    "details" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_profiles" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    CONSTRAINT "admin_profiles_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'support'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."admin_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_generation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "plan_id" "uuid",
    "generation_type" "text" NOT NULL,
    "section_name" "text",
    "model" "text" NOT NULL,
    "input_tokens" integer,
    "output_tokens" integer,
    "cost_usd" numeric(10,6),
    "latency_ms" integer,
    "status" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_generation_logs_generation_type_check" CHECK (("generation_type" = ANY (ARRAY['full'::"text", 'section'::"text", 'regenerate'::"text"]))),
    CONSTRAINT "ai_generation_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text", 'filtered'::"text"])))
);


ALTER TABLE "public"."ai_generation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allergies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "substance" "text" NOT NULL,
    "severity" "text",
    "reaction" "text",
    "diagnosed" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'practitioner'::"text" NOT NULL,
    CONSTRAINT "allergies_severity_check" CHECK (("severity" = ANY (ARRAY['mild'::"text", 'moderate'::"text", 'severe'::"text"]))),
    CONSTRAINT "allergies_source_check" CHECK (("source" = ANY (ARRAY['practitioner'::"text", 'anamnese'::"text"]))),
    CONSTRAINT "allergies_type_check" CHECK (("type" = ANY (ARRAY['allergy'::"text", 'intolerance'::"text", 'sensitivity'::"text"])))
);


ALTER TABLE "public"."allergies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnese_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "answers" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "anamnese_instances_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'COMPLETED'::"text"])))
);


ALTER TABLE "public"."anamnese_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamneses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "case_file_id" "uuid",
    "motif" "text",
    "objectifs" "text",
    "alimentation" "text",
    "digestion" "text",
    "sommeil" "text",
    "stress" "text",
    "complement" "text",
    "allergies" "text",
    "data" "jsonb",
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anamneses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnesis" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "main_concerns" "jsonb",
    "current_medications" "jsonb",
    "current_supplements" "jsonb",
    "allergies" "text",
    "medical_history" "jsonb",
    "family_history" "jsonb",
    "diet_description" "text",
    "physical_activity" "text",
    "sleep_quality" "text",
    "stress_level" "text",
    "goals" "jsonb",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anamnesis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnesis_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anamnesis_id" "uuid" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "modified_section" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "full_snapshot" "jsonb",
    "version" integer NOT NULL,
    "modified_by_type" "text" NOT NULL,
    "modified_by_id" "uuid",
    "modified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "anamnesis_history_modified_by_type_check" CHECK (("modified_by_type" = ANY (ARRAY['consultant'::"text", 'practitioner'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."anamnesis_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnesis_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "section_id" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "anamnesis_notes_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 10000))),
    CONSTRAINT "anamnesis_notes_section_id_check" CHECK ((("char_length"("section_id") >= 1) AND ("char_length"("section_id") <= 80)))
);


ALTER TABLE "public"."anamnesis_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone,
    "status" "text" DEFAULT 'confirmed'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consultation_type_id" "uuid",
    "location_type" "text" DEFAULT 'in_person'::"text",
    "video_link" "text",
    "notes_internal" "text",
    "notes_public" "text",
    "cancellation_reason" "text",
    "cancelled_by" "text",
    "cancelled_at" timestamp with time zone,
    "rescheduled_from_id" "uuid",
    "source" "text" DEFAULT 'manual'::"text",
    "booking_name" "text",
    "booking_email" "text",
    "booking_phone" "text",
    "google_event_id" "text",
    "video_room_name" "text",
    "deposit_cents" integer,
    "deposit_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "stripe_account_id" "text",
    "confirmation_sent_at" timestamp with time zone,
    "cancel_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoiced_externally_at" timestamp with time zone,
    "external_invoice_provider" "text",
    "external_invoice_id" "text",
    "video_join_token" "text",
    CONSTRAINT "appointments_deposit_status_check" CHECK (("deposit_status" = ANY (ARRAY['none'::"text", 'pending'::"text", 'paid'::"text", 'refunded'::"text", 'kept'::"text", 'expired'::"text"]))),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'in_progress'::"text", 'completed'::"text", 'done'::"text", 'cancelled'::"text", 'rescheduled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."appointments"."external_invoice_id" IS 'Id du brouillon de facture créé par Afeia dans l''outil externe (external_invoice_provider). Sert aussi d''anti-doublon.';



CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "content" "text" NOT NULL,
    "excerpt" "text",
    "category" "text",
    "tags" "text"[],
    "image_url" "text",
    "author" "text",
    "published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_available" boolean DEFAULT false NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."availability_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "availability_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "valid_time_range" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."availability_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "api_key_secret_id" "uuid",
    "account_label" "text",
    "vat_mode" "text" DEFAULT 'franchise'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "last_error" "text",
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_connections_active_has_key" CHECK ((("status" <> 'active'::"text") OR ("api_key_secret_id" IS NOT NULL))),
    CONSTRAINT "billing_connections_provider_check" CHECK (("provider" = ANY (ARRAY['pennylane'::"text", 'abby'::"text"]))),
    CONSTRAINT "billing_connections_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'error'::"text", 'revoked'::"text"]))),
    CONSTRAINT "billing_connections_vat_mode_check" CHECK (("vat_mode" = ANY (ARRAY['franchise'::"text", 'tva_20'::"text"])))
);

ALTER TABLE ONLY "public"."billing_connections" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_connections" IS 'Connexions aux outils de facturation externes. Clé API dans Vault ; lecture/écriture de la clé réservée à service_role.';



CREATE TABLE IF NOT EXISTS "public"."billing_external_customers" (
    "practitioner_id" "uuid" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "external_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_external_customers_provider_check" CHECK (("provider" = ANY (ARRAY['pennylane'::"text", 'abby'::"text"])))
);

ALTER TABLE ONLY "public"."billing_external_customers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_external_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "invoice_id" "uuid",
    "event_type" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_history_event_type_check" CHECK (("event_type" = ANY (ARRAY['subscription_created'::"text", 'subscription_updated'::"text", 'subscription_canceled'::"text", 'payment_succeeded'::"text", 'payment_failed'::"text", 'invoice_created'::"text"])))
);


ALTER TABLE "public"."billing_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "section" "public"."block_section" NOT NULL,
    "motifs" "public"."consultation_motif"[] DEFAULT '{}'::"public"."consultation_motif"[] NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "source" "public"."block_source" DEFAULT 'praticien'::"public"."block_source" NOT NULL,
    "owner_id" "uuid",
    "is_favorite" boolean DEFAULT false NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "last_used_at" timestamp with time zone,
    "ai_keywords" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_motifs" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "blocks_title_check" CHECK (("char_length"("title") <= 120))
);


ALTER TABLE "public"."blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."care_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "title" "text",
    "description" "text",
    "content" "jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "care_plans_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'viewed'::"text"])))
);


ALTER TABLE "public"."care_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."case_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."case_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complement_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "complement_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "taken" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."complement_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_file_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "dosage" "text",
    "frequency" "text",
    "duration_days" integer,
    "start_date" "date",
    "end_date" "date",
    "instructions" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."complements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_analysis_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text",
    "file_size" integer,
    "description" "text",
    "analysis_date" "date",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consultant_analysis_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_anamnesis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "naturopath_id" "uuid",
    "answers" "jsonb",
    "version" integer DEFAULT 1,
    "source" "text" DEFAULT 'manual'::"text",
    "preliminary_questionnaire_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patient_anamnesis_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'preliminary_questionnaire'::"text", 'mobile_app'::"text"])))
);


ALTER TABLE "public"."consultant_anamnesis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_drawings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "template_type" "text" NOT NULL,
    "excalidraw_data" "jsonb" NOT NULL,
    "snapshot_path" "text",
    "appointment_id" "uuid",
    "version" integer DEFAULT 1,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."consultant_drawings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "baseline" "text",
    "progress" "text",
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "set_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metric" "text",
    "metric_target" "text",
    CONSTRAINT "consultant_goals_label_check" CHECK ((("char_length"("label") >= 1) AND ("char_length"("label") <= 200))),
    CONSTRAINT "consultant_goals_metric_check" CHECK ((("metric" IS NULL) OR ("metric" = ANY (ARRAY['sleep'::"text", 'hrv'::"text", 'hr'::"text", 'steps'::"text"])))),
    CONSTRAINT "consultant_goals_metric_target_check" CHECK ((("metric_target" IS NULL) OR ("char_length"("metric_target") <= 120))),
    CONSTRAINT "consultant_goals_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'progressing'::"text", 'reached'::"text"])))
);


ALTER TABLE "public"."consultant_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "city" "text",
    "age" integer,
    "date_of_birth" "date",
    "invitation_code" "text" NOT NULL,
    "code_expires_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consultant_id" "uuid",
    CONSTRAINT "patient_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."consultant_invitations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."consultant_invitations"."consultant_id" IS 'Reference to pre-created patient record (activated=false). Allows tracking before activation.';



CREATE TABLE IF NOT EXISTS "public"."consultant_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "claimed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consultant_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_iris_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "eye" "text" NOT NULL,
    "photo_path" "text" NOT NULL,
    "thumbnail_path" "text",
    "annotations" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text",
    "taken_at" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consultant_iris_photos_eye_check" CHECK (("eye" = ANY (ARRAY['left'::"text", 'right'::"text"])))
);


ALTER TABLE "public"."consultant_iris_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "consultant_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consultant_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "version" integer DEFAULT 1,
    "status" "text" DEFAULT 'draft'::"text",
    "content" "jsonb",
    "shared_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_generated" boolean DEFAULT false,
    "ai_model" "text",
    "ai_generation_date" timestamp with time zone,
    "ai_feedback" "jsonb",
    "selected_sections" "text"[],
    "tracked_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "patient_plans_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'shared'::"text"])))
);


ALTER TABLE "public"."consultant_plans" OWNER TO "postgres";


COMMENT ON COLUMN "public"."consultant_plans"."selected_sections" IS 'Catégories du conseillancier choisies par le praticien (NULL = déduites du contenu rempli)';



CREATE TABLE IF NOT EXISTS "public"."consultant_questionnaire_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "sent_to_email" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consultant_questionnaire_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "related_consultant_id" "uuid" NOT NULL,
    "relationship_type" "text" NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "consultant_relationships_type_check" CHECK (("relationship_type" = ANY (ARRAY['parent'::"text", 'child'::"text", 'spouse'::"text", 'sibling'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."consultant_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_session_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "detail" "text",
    "source" "text" DEFAULT 'wearable'::"text" NOT NULL,
    "source_key" "text",
    "done_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consultant_session_topics_source_check" CHECK (("source" = ANY (ARRAY['wearable'::"text", 'practitioner'::"text"]))),
    CONSTRAINT "consultant_session_topics_text_check" CHECK ((("char_length"("text") >= 1) AND ("char_length"("text") <= 500)))
);


ALTER TABLE "public"."consultant_session_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultant_terrain" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "constitution" "text",
    "constitution_secondary" "text",
    "temperament_description" "text",
    "temperament_notes" "text",
    "diathese_menetrier" "text",
    "diathese_notes" "text",
    "diathese_date" "date",
    "surcharge_acides" "text",
    "surcharge_colles" "text",
    "surcharge_cristaux" "text",
    "surcharges_notes" "text",
    "emunctoire_foie" "text",
    "emunctoire_foie_notes" "text",
    "emunctoire_intestins" "text",
    "emunctoire_intestins_notes" "text",
    "emunctoire_reins" "text",
    "emunctoire_reins_notes" "text",
    "emunctoire_peau" "text",
    "emunctoire_peau_notes" "text",
    "emunctoire_poumons" "text",
    "emunctoire_poumons_notes" "text",
    "force_vitale" "text",
    "force_vitale_notes" "text",
    "bilan_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consultant_terrain_constitution_check" CHECK (("constitution" = ANY (ARRAY['sanguin'::"text", 'lymphatique'::"text", 'bilieux'::"text", 'nerveux'::"text"]))),
    CONSTRAINT "consultant_terrain_constitution_secondary_check" CHECK (("constitution_secondary" = ANY (ARRAY['sanguin'::"text", 'lymphatique'::"text", 'bilieux'::"text", 'nerveux'::"text"]))),
    CONSTRAINT "consultant_terrain_diathese_menetrier_check" CHECK (("diathese_menetrier" = ANY (ARRAY['allergique_mn'::"text", 'hyposthenique_mn_cu'::"text", 'dystonique_mn_co'::"text", 'anergique_cu_au_ag'::"text", 'desadaptation_zn_cu'::"text", 'desadaptation_zn_ni_co'::"text"]))),
    CONSTRAINT "consultant_terrain_emunctoire_foie_check" CHECK (("emunctoire_foie" = ANY (ARRAY['fonctionnel'::"text", 'ralenti'::"text", 'surcharge'::"text", 'bloque'::"text"]))),
    CONSTRAINT "consultant_terrain_emunctoire_intestins_check" CHECK (("emunctoire_intestins" = ANY (ARRAY['fonctionnel'::"text", 'ralenti'::"text", 'surcharge'::"text", 'bloque'::"text"]))),
    CONSTRAINT "consultant_terrain_emunctoire_peau_check" CHECK (("emunctoire_peau" = ANY (ARRAY['fonctionnel'::"text", 'reactif'::"text", 'surcharge'::"text", 'bloque'::"text"]))),
    CONSTRAINT "consultant_terrain_emunctoire_poumons_check" CHECK (("emunctoire_poumons" = ANY (ARRAY['fonctionnel'::"text", 'sous_exploite'::"text", 'surcharge'::"text", 'bloque'::"text"]))),
    CONSTRAINT "consultant_terrain_emunctoire_reins_check" CHECK (("emunctoire_reins" = ANY (ARRAY['fonctionnel'::"text", 'ralenti'::"text", 'surcharge'::"text", 'bloque'::"text"]))),
    CONSTRAINT "consultant_terrain_force_vitale_check" CHECK (("force_vitale" = ANY (ARRAY['haute'::"text", 'moyenne'::"text", 'basse'::"text", 'epuisee'::"text"]))),
    CONSTRAINT "consultant_terrain_surcharge_acides_check" CHECK (("surcharge_acides" = ANY (ARRAY['absent'::"text", 'leger'::"text", 'modere'::"text", 'important'::"text"]))),
    CONSTRAINT "consultant_terrain_surcharge_colles_check" CHECK (("surcharge_colles" = ANY (ARRAY['absent'::"text", 'leger'::"text", 'modere'::"text", 'important'::"text"]))),
    CONSTRAINT "consultant_terrain_surcharge_cristaux_check" CHECK (("surcharge_cristaux" = ANY (ARRAY['absent'::"text", 'leger'::"text", 'modere'::"text", 'important'::"text"])))
);


ALTER TABLE "public"."consultant_terrain" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "email" "text",
    "name" "text" NOT NULL,
    "full_name" "text",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "city" "text",
    "age" integer,
    "date_of_birth" "date",
    "consultation_reason" "text",
    "status" "text" DEFAULT 'standard'::"text",
    "is_premium" boolean DEFAULT false,
    "activated" boolean DEFAULT false,
    "activated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "circular_enabled" boolean DEFAULT false,
    "last_circular_sync_at" timestamp with time zone,
    "is_snoozed" boolean DEFAULT false,
    "snooze_until" timestamp with time zone,
    "snooze_reason" "text",
    "has_circular_ring" boolean DEFAULT false,
    "gender" "text",
    "address_line1" "text",
    "address_line2" "text",
    "postal_code" "text",
    "profession" "text",
    "referring_doctor_name" "text",
    "referring_doctor_phone" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relation" "text",
    "is_demo" boolean DEFAULT false,
    "timezone" "text" DEFAULT 'Europe/Paris'::"text" NOT NULL,
    CONSTRAINT "consultants_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"]))),
    CONSTRAINT "patients_status_check" CHECK (("status" = ANY (ARRAY['standard'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."consultants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."consultants"."is_demo" IS 'Indicates if the consultant is a demo/test consultant created without OTP verification';



COMMENT ON COLUMN "public"."consultants"."timezone" IS 'Fuseau IANA du consultant (ex. Europe/Paris). Sert à convertir en UTC les heures locales des objets connectés.';



CREATE TABLE IF NOT EXISTS "public"."consultants_health" (
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "notes" "jsonb",
    "lab_results" "jsonb",
    "questionnaire" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."consultants_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultants_identity" (
    "id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "age" integer,
    "city" "text",
    "status" "text" DEFAULT 'standard'::"text" NOT NULL,
    "is_premium" boolean DEFAULT false NOT NULL,
    "circular_enabled" boolean DEFAULT false NOT NULL,
    "last_circular_sync_at" timestamp with time zone,
    "last_circular_sync_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "patients_identity_status_check" CHECK (("status" = ANY (ARRAY['standard'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."consultants_identity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "numero" "text",
    "date_emission" timestamp with time zone,
    "annee_fiscale" integer NOT NULL,
    "template_id" "text",
    "description" "text" NOT NULL,
    "montant" numeric(10,2) NOT NULL,
    "tva_applicable" boolean DEFAULT false,
    "taux_tva" numeric(5,2),
    "montant_ttc" numeric(10,2),
    "status" "text" NOT NULL,
    "payment_method" "text",
    "payment_date" timestamp with time zone,
    "payment_notes" "text",
    "practitioner_snapshot" "jsonb" NOT NULL,
    "consultant_snapshot" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "appointment_id" "uuid",
    CONSTRAINT "consultation_invoices_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['especes'::"text", 'cheque'::"text", 'cb'::"text", 'virement'::"text", 'stripe'::"text"]))),
    CONSTRAINT "consultation_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'issued'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."consultation_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "consultation_date" timestamp with time zone NOT NULL,
    "title" "text",
    "symptoms" "jsonb",
    "observations" "text",
    "recommendations" "text",
    "private_notes" "text",
    "shared_notes" "text",
    "attachments" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."consultation_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "price_cents" integer,
    "color" "text" DEFAULT '#4CAF50'::"text",
    "buffer_minutes" integer DEFAULT 15,
    "is_bookable_online" boolean DEFAULT true,
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_group" boolean DEFAULT false NOT NULL,
    "max_participants" integer DEFAULT 1 NOT NULL,
    "price_per_participant" boolean DEFAULT true NOT NULL,
    "deposit_percent" integer,
    CONSTRAINT "chk_group_participants" CHECK (((("is_group" = true) AND ("max_participants" >= 2)) OR (("is_group" = false) AND ("max_participants" = 1)))),
    CONSTRAINT "consultation_types_deposit_percent_check" CHECK ((("deposit_percent" >= 0) AND ("deposit_percent" <= 100)))
);


ALTER TABLE "public"."consultation_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consultations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."current_treatments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "dosage" "text",
    "prescriber" "text",
    "start_date" "date",
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stopped_at" "date",
    "stop_reason" "text",
    "source" "text" DEFAULT 'practitioner'::"text" NOT NULL,
    CONSTRAINT "current_treatments_source_check" CHECK (("source" = ANY (ARRAY['practitioner'::"text", 'anamnese'::"text"])))
);


ALTER TABLE "public"."current_treatments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "is_period" boolean DEFAULT false NOT NULL,
    "flow_intensity" "text",
    "period_pain" integer,
    "symptom_cramps" boolean DEFAULT false NOT NULL,
    "symptom_bloating" boolean DEFAULT false NOT NULL,
    "symptom_headache" boolean DEFAULT false NOT NULL,
    "symptom_breast_tenderness" boolean DEFAULT false NOT NULL,
    "symptom_mood_swings" boolean DEFAULT false NOT NULL,
    "symptom_fatigue" boolean DEFAULT false NOT NULL,
    "symptom_acne" boolean DEFAULT false NOT NULL,
    "symptom_cravings" boolean DEFAULT false NOT NULL,
    "symptom_insomnia" boolean DEFAULT false NOT NULL,
    "symptom_water_retention" boolean DEFAULT false NOT NULL,
    "symptom_back_pain" boolean DEFAULT false NOT NULL,
    "symptom_nausea" boolean DEFAULT false NOT NULL,
    "symptom_libido_high" boolean DEFAULT false NOT NULL,
    "symptom_cervical_mucus" "text",
    "temperature" numeric(4,2),
    "notes" "text",
    "source" "text" DEFAULT 'consultant'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cycle_entries_flow_intensity_check" CHECK (("flow_intensity" = ANY (ARRAY['spotting'::"text", 'light'::"text", 'medium'::"text", 'heavy'::"text"]))),
    CONSTRAINT "cycle_entries_period_pain_check" CHECK ((("period_pain" >= 0) AND ("period_pain" <= 10))),
    CONSTRAINT "cycle_entries_source_check" CHECK (("source" = ANY (ARRAY['consultant'::"text", 'practitioner'::"text"]))),
    CONSTRAINT "cycle_entries_symptom_cervical_mucus_check" CHECK (("symptom_cervical_mucus" = ANY (ARRAY['dry'::"text", 'sticky'::"text", 'creamy'::"text", 'egg_white'::"text", 'watery'::"text"])))
);


ALTER TABLE "public"."cycle_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "is_tracking" boolean DEFAULT false NOT NULL,
    "average_cycle_length" integer DEFAULT 28 NOT NULL,
    "average_period_length" integer DEFAULT 5 NOT NULL,
    "cycle_regularity" "text" DEFAULT 'regular'::"text" NOT NULL,
    "contraception" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cycle_profiles_average_cycle_length_check" CHECK ((("average_cycle_length" >= 21) AND ("average_cycle_length" <= 45))),
    CONSTRAINT "cycle_profiles_average_period_length_check" CHECK ((("average_period_length" >= 2) AND ("average_period_length" <= 8))),
    CONSTRAINT "cycle_profiles_cycle_regularity_check" CHECK (("cycle_regularity" = ANY (ARRAY['regular'::"text", 'somewhat_irregular'::"text", 'irregular'::"text", 'absent'::"text"])))
);


ALTER TABLE "public"."cycle_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "source_raw_id" "uuid" NOT NULL,
    "activity_date" "date" NOT NULL,
    "steps" integer,
    "active_calories_kcal" integer,
    "total_calories_kcal" integer,
    "active_s" integer,
    "distance_m" numeric(9,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_activity_active_calories_kcal_check" CHECK (("active_calories_kcal" >= 0)),
    CONSTRAINT "daily_activity_active_s_check" CHECK (("active_s" >= 0)),
    CONSTRAINT "daily_activity_distance_m_check" CHECK (("distance_m" >= (0)::numeric)),
    CONSTRAINT "daily_activity_steps_check" CHECK (("steps" >= 0)),
    CONSTRAINT "daily_activity_total_calories_kcal_check" CHECK (("total_calories_kcal" >= 0))
);

ALTER TABLE ONLY "public"."daily_activity" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_journals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "case_file_id" "uuid",
    "date" "date" NOT NULL,
    "mood" "text",
    "alimentation_quality" "text",
    "sleep_quality" "text",
    "energy_level" "text",
    "complements_taken" "jsonb" DEFAULT '[]'::"jsonb",
    "problemes_particuliers" "text",
    "note_naturopathe" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_journals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "log_date" "date" NOT NULL,
    "good_nutrition" boolean,
    "good_sleep" boolean,
    "good_mood" boolean,
    "supplements_taken" boolean,
    "specific_issues" "text"[],
    "note_for_practitioner" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."educational_resource_favorites" (
    "practitioner_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."educational_resource_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."educational_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid",
    "title" "text" NOT NULL,
    "slug" "text",
    "summary" "text",
    "content_type" "text" NOT NULL,
    "content_markdown" "text",
    "file_path" "text",
    "file_name" "text",
    "video_url" "text",
    "thumbnail_path" "text",
    "category" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "source" "text" DEFAULT 'practitioner'::"text" NOT NULL,
    "is_published" boolean DEFAULT true,
    "read_time_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "theme_label" "text",
    CONSTRAINT "educational_resources_category_check" CHECK (("category" = ANY (ARRAY['alimentation'::"text", 'hydratation'::"text", 'phytotherapie'::"text", 'aromatherapie'::"text", 'respiration'::"text", 'activite_physique'::"text", 'sommeil'::"text", 'gestion_stress'::"text", 'detox'::"text", 'digestion'::"text", 'immunite'::"text", 'peau'::"text", 'feminin'::"text", 'general'::"text"]))),
    CONSTRAINT "educational_resources_content_type_check" CHECK (("content_type" = ANY (ARRAY['article'::"text", 'pdf'::"text", 'image'::"text", 'video_link'::"text"]))),
    CONSTRAINT "educational_resources_source_check" CHECK (("source" = ANY (ARRAY['afeia'::"text", 'practitioner'::"text"])))
);


ALTER TABLE "public"."educational_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_session_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_session_id" "uuid" NOT NULL,
    "consultant_id" "uuid",
    "practitioner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "status" "text" DEFAULT 'registered'::"text" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "cancelled_at" timestamp with time zone,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "group_session_registrations_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'online_booking'::"text"]))),
    CONSTRAINT "group_session_registrations_status_check" CHECK (("status" = ANY (ARRAY['registered'::"text", 'confirmed'::"text", 'attended'::"text", 'no_show'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."group_session_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "consultation_type_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "location_type" "text" NOT NULL,
    "location_details" "text",
    "max_participants" integer NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes_internal" "text",
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "group_sessions_location_type_check" CHECK (("location_type" = ANY (ARRAY['in_person'::"text", 'video'::"text", 'home_visit'::"text"]))),
    CONSTRAINT "group_sessions_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."group_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_samples" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "source_raw_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone NOT NULL,
    "hr_bpm" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_samples_hr_bpm_check" CHECK (("hr_bpm" > 0))
);

ALTER TABLE ONLY "public"."hr_samples" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_samples" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hrv_nightly" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "source_raw_id" "uuid" NOT NULL,
    "night_date" "date" NOT NULL,
    "hrv_rmssd_avg_ms" integer,
    "hr_avg_bpm" smallint,
    "beat_to_beat_avg_ms" integer,
    "breathing_rate_avg_per_min" numeric(4,1),
    "recovery_status" smallint,
    "ans_charge" numeric(4,1),
    "ans_charge_status" smallint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hrv_nightly_beat_to_beat_avg_ms_check" CHECK (("beat_to_beat_avg_ms" > 0)),
    CONSTRAINT "hrv_nightly_breathing_rate_avg_per_min_check" CHECK (("breathing_rate_avg_per_min" > (0)::numeric)),
    CONSTRAINT "hrv_nightly_hr_avg_bpm_check" CHECK (("hr_avg_bpm" > 0)),
    CONSTRAINT "hrv_nightly_hrv_rmssd_avg_ms_check" CHECK (("hrv_rmssd_avg_ms" >= 0))
);

ALTER TABLE ONLY "public"."hrv_nightly" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."hrv_nightly" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inserted_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_version_id" "uuid" NOT NULL,
    "source_block_id" "uuid",
    "section" "public"."block_section" NOT NULL,
    "content_snapshot" "text" NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inserted_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_templates" (
    "id" "text" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text" NOT NULL,
    "montant_defaut" numeric(10,2) NOT NULL,
    "duree_defaut" integer,
    "ordre" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "amount_subtotal" numeric(10,2) NOT NULL,
    "amount_tax" numeric(10,2) DEFAULT 0,
    "amount_total" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "invoice_date" "date" NOT NULL,
    "due_date" "date",
    "paid_at" timestamp with time zone,
    "description" "text",
    "billing_reason" "text",
    "stripe_invoice_id" "text",
    "stripe_invoice_pdf" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'open'::"text", 'paid'::"text", 'void'::"text", 'uncollectible'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "mood" "text",
    "energy_level" integer,
    "sleep_quality" integer,
    "stress_level" integer,
    "notes" "text",
    "symptoms" "text"[],
    "supplements_taken" boolean,
    "diet_followed" boolean,
    "exercise_done" boolean,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "journal_check" CHECK ((("sleep_quality" >= 1) AND ("energy_level" <= 10))),
    CONSTRAINT "journal_energy_level_check" CHECK ((("energy_level" >= 1) AND ("energy_level" <= 10))),
    CONSTRAINT "journal_stress_level_check" CHECK ((("stress_level" >= 1) AND ("stress_level" <= 10)))
);


ALTER TABLE "public"."journal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "mood" "text",
    "energy" "text",
    "text" "text",
    "adherence_hydratation" boolean DEFAULT false,
    "adherence_respiration" boolean DEFAULT false,
    "adherence_mouvement" boolean DEFAULT false,
    "adherence_plantes" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "journal_entries_energy_check" CHECK (("energy" = ANY (ARRAY['Bas'::"text", 'Moyen'::"text", 'Eleve'::"text"]))),
    CONSTRAINT "journal_entries_mood_check" CHECK (("mood" = ANY (ARRAY['happy'::"text", 'neutral'::"text", 'sad'::"text"])))
);


ALTER TABLE "public"."journal_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "year_onset" integer,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'practitioner'::"text" NOT NULL,
    CONSTRAINT "medical_history_category_check" CHECK (("category" = ANY (ARRAY['personal'::"text", 'family'::"text", 'surgical'::"text"]))),
    CONSTRAINT "medical_history_source_check" CHECK (("source" = ANY (ARRAY['practitioner'::"text", 'anamnese'::"text"])))
);


ALTER TABLE "public"."medical_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "sender" "text" NOT NULL,
    "sender_role" "text",
    "sender_type" "text",
    "text" "text",
    "body" "text",
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_sender_check" CHECK (("sender" = ANY (ARRAY['consultant'::"text", 'praticien'::"text"]))),
    CONSTRAINT "messages_sender_role_check" CHECK (("sender_role" = ANY (ARRAY['consultant'::"text", 'practitioner'::"text"]))),
    CONSTRAINT "messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['consultant'::"text", 'practitioner'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "consultant_id" "uuid",
    "type" "text" DEFAULT 'general'::"text",
    "title" "text" NOT NULL,
    "description" "text",
    "level" "text" DEFAULT 'info'::"text",
    "read" boolean DEFAULT false,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_level_check" CHECK (("level" = ANY (ARRAY['info'::"text", 'attention'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['general'::"text", 'anamnesis_modified'::"text", 'new_preliminary_questionnaire'::"text", 'questionnaire_linked'::"text", 'message'::"text", 'appointment'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" DEFAULT 'activation'::"text",
    "practitioner_id" "uuid",
    "consultant_id" "uuid",
    "consultant_first_name" "text",
    "consultant_last_name" "text",
    "consultant_phone" "text",
    "consultant_city" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "otp_codes_type_check" CHECK (("type" = ANY (ARRAY['activation'::"text", 'login'::"text", 'reset'::"text"])))
);


ALTER TABLE "public"."otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_profiles" (
    "user_id" "uuid" NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(20),
    "birth_date" "date",
    "age" integer,
    "city" character varying(100),
    "gender" character varying(20),
    "address" "text",
    "avatar_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."patient_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "card_brand" "text",
    "card_last4" "text",
    "card_exp_month" integer,
    "card_exp_year" integer,
    "sepa_last4" "text",
    "stripe_payment_method_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_methods_type_check" CHECK (("type" = ANY (ARRAY['card'::"text", 'sepa_debit'::"text", 'paypal'::"text"])))
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_observance_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_plan_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "category" "text" NOT NULL,
    "frequency" "text" DEFAULT 'daily'::"text" NOT NULL,
    "weekly_target" integer,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source_key" "text",
    "source_line" "text",
    "period_count" integer,
    "period_unit" "text",
    "auto_check" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_observance_category" CHECK (("category" = ANY (ARRAY['alimentation'::"text", 'hydratation'::"text", 'phytotherapie'::"text", 'complement'::"text", 'aromatologie'::"text", 'hydrologie'::"text", 'activite'::"text", 'respiration'::"text", 'sommeil'::"text", 'equilibre_psycho'::"text", 'technique_manuelle'::"text", 'autre'::"text"]))),
    CONSTRAINT "chk_observance_frequency" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'as_needed'::"text"]))),
    CONSTRAINT "chk_observance_period_count" CHECK ((("period_count" IS NULL) OR ("period_count" > 0))),
    CONSTRAINT "chk_observance_period_unit" CHECK ((("period_unit" IS NULL) OR ("period_unit" = ANY (ARRAY['day'::"text", 'week'::"text", 'month'::"text", 'year'::"text"]))))
);


ALTER TABLE "public"."plan_observance_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_observance_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "observance_item_id" "uuid" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "done" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'consultant'::"text" NOT NULL,
    CONSTRAINT "plan_observance_logs_source_check" CHECK (("source" = ANY (ARRAY['consultant'::"text", 'object'::"text"])))
);


ALTER TABLE "public"."plan_observance_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_version_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "title" "text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid",
    "consultant_id" "uuid",
    "type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "practitioner_actions_type_check" CHECK (("type" = ANY (ARRAY['snooze'::"text", 'unsnooze'::"text", 'send_message'::"text", 'note_observation'::"text", 'celebrate'::"text", 'review_completed'::"text", 'review_seen'::"text", 'remind_tomorrow'::"text", 'relance'::"text", 'dropout_survey'::"text", 'dropout_answer'::"text", 'dropout_relance'::"text", 'followup_closed'::"text"])))
);


ALTER TABLE "public"."practitioner_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."practitioner_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_ai_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "formation" "text",
    "formation_detail" "text",
    "longueur_preferee" "text" DEFAULT 'detaille'::"text",
    "ton" "text" DEFAULT 'chaleureux'::"text",
    "approches" "text"[] DEFAULT '{}'::"text"[],
    "plantes_favorites" "text",
    "complements_favoris" "text",
    "exemples_formulations" "text",
    "total_generations" integer DEFAULT 0,
    "generations_this_month" integer DEFAULT 0,
    "month_reset_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "practitioner_ai_profiles_longueur_preferee_check" CHECK (("longueur_preferee" = ANY (ARRAY['concis'::"text", 'detaille'::"text", 'tres_detaille'::"text"]))),
    CONSTRAINT "practitioner_ai_profiles_ton_check" CHECK (("ton" = ANY (ARRAY['professionnel'::"text", 'chaleureux'::"text", 'coach'::"text"])))
);


ALTER TABLE "public"."practitioner_ai_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_billing_settings" (
    "practitioner_id" "uuid" NOT NULL,
    "siret" "text" NOT NULL,
    "adresse_facturation" "text" NOT NULL,
    "mention_tva" "text" DEFAULT 'TVA non applicable, art. 293 B du CGI'::"text" NOT NULL,
    "statut_juridique" "text" DEFAULT 'Micro-entrepreneur'::"text",
    "libelle_document" "text" DEFAULT 'facture'::"text",
    "email_auto_consultant" boolean DEFAULT true,
    "email_copie_praticien" boolean DEFAULT false,
    "derniere_annee_fiscale" integer,
    "dernier_numero_emis" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "relance_manuelle_template" "text",
    CONSTRAINT "practitioner_billing_settings_libelle_document_check" CHECK (("libelle_document" = ANY (ARRAY['facture'::"text", 'recu'::"text", 'facture-recu'::"text"])))
);


ALTER TABLE "public"."practitioner_billing_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."practitioner_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_resource_favorites" (
    "practitioner_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."practitioner_resource_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'Outils'::"text" NOT NULL,
    "format" "text" NOT NULL,
    "url" "text",
    "file_path" "text",
    "file_name" "text",
    "source" "text" DEFAULT 'practitioner'::"text" NOT NULL,
    "owner_id" "uuid",
    "author_label" "text",
    "review_status" "text" DEFAULT 'private'::"text" NOT NULL,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practitioner_resources_format_check" CHECK (("format" = ANY (ARRAY['link'::"text", 'pdf'::"text", 'video'::"text", 'model'::"text"]))),
    CONSTRAINT "practitioner_resources_review_status_check" CHECK (("review_status" = ANY (ARRAY['private'::"text", 'pending'::"text", 'published'::"text", 'rejected'::"text"]))),
    CONSTRAINT "practitioner_resources_source_check" CHECK (("source" = ANY (ARRAY['afeia'::"text", 'practitioner'::"text"]))),
    CONSTRAINT "practitioner_resources_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 200)))
);


ALTER TABLE "public"."practitioner_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioner_verifications" (
    "practitioner_id" "uuid" NOT NULL,
    "school" "text" NOT NULL,
    "training_year" integer NOT NULL,
    "siret" "text" NOT NULL,
    "city" "text" NOT NULL,
    "charter_accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "training_doc_path" "text",
    "training_doc_name" "text",
    "id_doc_path" "text",
    "id_doc_name" "text",
    "id_doc_deleted_at" timestamp with time zone,
    "pappers" "jsonb",
    "pappers_checked_at" timestamp with time zone,
    "concordance" "jsonb",
    "checks" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "decision_status" "text",
    "decision_motive" "text",
    "decided_at" timestamp with time zone,
    "decided_by" "text",
    "practitioner_reply" "text",
    "replied_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."practitioner_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practitioners" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "default_consultation_reason" "text",
    "calendly_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "first_name" "text",
    "last_name" "text",
    "photo_url" "text",
    "specialties" "text"[] DEFAULT '{}'::"text"[],
    "siret" "text",
    "adeli_number" "text",
    "formations" "text",
    "years_experience" integer,
    "cabinet_address" "text",
    "professional_phone" "text",
    "website" "text",
    "bio" "text",
    "booking_slug" "text",
    "booking_enabled" boolean DEFAULT false,
    "booking_intro_text" "text",
    "booking_address" "text",
    "booking_phone" "text",
    "cancellation_policy_hours" integer DEFAULT 24,
    "cancellation_policy_text" "text",
    "video_provider" "text" DEFAULT 'daily'::"text",
    "daily_api_key" "text",
    "booking_deposit_percent" integer DEFAULT 30 NOT NULL,
    "account_status" "text" DEFAULT 'validated'::"text" NOT NULL,
    "billing_tool" "text",
    CONSTRAINT "practitioners_account_status_check" CHECK (("account_status" = ANY (ARRAY['pending_validation'::"text", 'validated'::"text", 'info_requested'::"text", 'rejected'::"text"]))),
    CONSTRAINT "practitioners_billing_tool_check" CHECK ((("billing_tool" IS NULL) OR ("billing_tool" = ANY (ARRAY['afeia'::"text", 'pennylane'::"text", 'indy'::"text", 'tiime'::"text", 'abby'::"text", 'freebe'::"text", 'autre'::"text", 'tableur'::"text"])))),
    CONSTRAINT "practitioners_booking_deposit_percent_check" CHECK ((("booking_deposit_percent" >= 0) AND ("booking_deposit_percent" <= 100))),
    CONSTRAINT "practitioners_video_provider_check" CHECK (("video_provider" = ANY (ARRAY['external'::"text", 'daily'::"text"])))
);


ALTER TABLE "public"."practitioners" OWNER TO "postgres";


COMMENT ON COLUMN "public"."practitioners"."phone" IS 'Numéro de téléphone du praticien';



COMMENT ON COLUMN "public"."practitioners"."first_name" IS 'Prénom du praticien';



COMMENT ON COLUMN "public"."practitioners"."last_name" IS 'Nom de famille du praticien';



COMMENT ON COLUMN "public"."practitioners"."photo_url" IS 'URL de la photo de profil (Supabase Storage)';



COMMENT ON COLUMN "public"."practitioners"."specialties" IS 'Spécialités / domaines d''expertise (tableau de tags)';



COMMENT ON COLUMN "public"."practitioners"."siret" IS 'Numéro SIRET (14 chiffres)';



COMMENT ON COLUMN "public"."practitioners"."adeli_number" IS 'Numéro ADELI ou certification';



COMMENT ON COLUMN "public"."practitioners"."formations" IS 'Formations et diplômes (texte libre)';



COMMENT ON COLUMN "public"."practitioners"."years_experience" IS 'Années d''expérience professionnelle';



COMMENT ON COLUMN "public"."practitioners"."cabinet_address" IS 'Adresse du cabinet';



COMMENT ON COLUMN "public"."practitioners"."professional_phone" IS 'Téléphone professionnel';



COMMENT ON COLUMN "public"."practitioners"."website" IS 'Site web professionnel';



COMMENT ON COLUMN "public"."practitioners"."bio" IS 'Biographie / description pour la page de prise de RDV publique';



COMMENT ON COLUMN "public"."practitioners"."billing_tool" IS 'Outil de facturation du praticien (NULL = non choisi, afeia = module Afeia)';



CREATE TABLE IF NOT EXISTS "public"."practitioners_public" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "calendly_url" "text",
    "subscription_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    CONSTRAINT "practitioners_public_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"]))),
    CONSTRAINT "practitioners_public_subscription_status_check" CHECK ((("subscription_status" IS NULL) OR ("subscription_status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'canceled'::"text"]))))
);


ALTER TABLE "public"."practitioners_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preliminary_questionnaires" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "naturopath_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "responses" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "linked_consultant_id" "uuid",
    "linked_at" timestamp with time zone,
    "submitted_from_ip" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "preliminary_questionnaires_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'linked_to_consultant'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."preliminary_questionnaires" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prescription_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "dosage" "text",
    "frequency" "text",
    "duration" integer,
    "instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."prescription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "question_key" "text" NOT NULL,
    "position" integer NOT NULL,
    "label" "text" NOT NULL,
    "answer_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "options" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "placeholder" "text" DEFAULT ''::"text" NOT NULL,
    "help" "text" DEFAULT ''::"text" NOT NULL,
    "required" boolean DEFAULT false NOT NULL,
    "medical_warning" boolean DEFAULT false NOT NULL,
    CONSTRAINT "questionnaire_questions_answer_type_check" CHECK (("answer_type" = ANY (ARRAY['text'::"text", 'choice'::"text", 'multi'::"text"])))
);


ALTER TABLE "public"."questionnaire_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version_id" "uuid" NOT NULL,
    "section_key" "text" NOT NULL,
    "position" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "visible" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."questionnaire_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" integer,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "published_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "questionnaire_versions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."questionnaire_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "consultant_plan_id" "uuid",
    "plan_section_key" "text",
    "message" "text",
    "read_at" timestamp with time zone,
    "sent_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."resource_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sleep_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "source_raw_id" "uuid" NOT NULL,
    "night_date" "date" NOT NULL,
    "sleep_start_at" timestamp with time zone,
    "sleep_end_at" timestamp with time zone,
    "total_sleep_s" integer,
    "light_sleep_s" integer,
    "deep_sleep_s" integer,
    "rem_sleep_s" integer,
    "unrecognized_sleep_s" integer,
    "interruption_s" integer,
    "sleep_score" smallint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sleep_sessions_deep_sleep_s_check" CHECK (("deep_sleep_s" >= 0)),
    CONSTRAINT "sleep_sessions_interruption_s_check" CHECK (("interruption_s" >= 0)),
    CONSTRAINT "sleep_sessions_light_sleep_s_check" CHECK (("light_sleep_s" >= 0)),
    CONSTRAINT "sleep_sessions_rem_sleep_s_check" CHECK (("rem_sleep_s" >= 0)),
    CONSTRAINT "sleep_sessions_sleep_score_check" CHECK ((("sleep_score" >= 0) AND ("sleep_score" <= 100))),
    CONSTRAINT "sleep_sessions_total_sleep_s_check" CHECK (("total_sleep_s" >= 0)),
    CONSTRAINT "sleep_sessions_unrecognized_sleep_s_check" CHECK (("unrecognized_sleep_s" >= 0))
);

ALTER TABLE ONLY "public"."sleep_sessions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sleep_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_subscriptions" (
    "id" "text" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "customer_id" "text",
    "status" "text",
    "price_id" "text",
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "latest_invoice_id" "text",
    "payment_failed" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "price_monthly" numeric(10,2) DEFAULT 0,
    "price_yearly" numeric(10,2) DEFAULT 0,
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "max_patients" integer,
    "circular_integration" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_plans_name_check" CHECK (("name" = ANY (ARRAY['free'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "billing_cycle" "text" DEFAULT 'monthly'::"text",
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'trialing'::"text", 'incomplete'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplement_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "brand" "text",
    "dosage" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "timing" "text",
    "duration" "text",
    "notes" "text",
    "image_url" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplement_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "primary_motif" "public"."consultation_motif" NOT NULL,
    "secondary_motifs" "public"."consultation_motif"[] DEFAULT '{}'::"public"."consultation_motif"[] NOT NULL,
    "source" "public"."block_source" DEFAULT 'praticien'::"public"."block_source" NOT NULL,
    "owner_id" "uuid",
    "blocks_mapping" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "templates_title_check" CHECK (("char_length"("title") <= 150))
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['PATIENT'::"text", 'PRACTITIONER'::"text", 'ADMIN'::"text"]))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text", 'SUSPENDED'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wearable_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "provider_user_id" "text" NOT NULL,
    "access_token_secret_id" "uuid",
    "token_expires_at" timestamp with time zone,
    "status" "public"."wearable_connection_status" DEFAULT 'active'::"public"."wearable_connection_status" NOT NULL,
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sync_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "backfill_status" "public"."wearable_backfill_status" DEFAULT 'pending'::"public"."wearable_backfill_status" NOT NULL,
    "backfill_cursor" "date",
    "backfill_days" integer DEFAULT 90 NOT NULL,
    "backfill_updated_at" timestamp with time zone,
    "interrupted_at" timestamp with time zone,
    CONSTRAINT "wearable_connections_active_has_token" CHECK ((("status" <> 'active'::"public"."wearable_connection_status") OR ("access_token_secret_id" IS NOT NULL))),
    CONSTRAINT "wearable_connections_backfill_days_check" CHECK ((("backfill_days" >= 1) AND ("backfill_days" <= 365)))
);

ALTER TABLE ONLY "public"."wearable_connections" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."wearable_connections" IS 'Connexions OAuth aux objets connectés. Jeton dans Vault ; lecture/écriture du jeton réservée à service_role.';



CREATE OR REPLACE VIEW "public"."wearable_connection_overview" WITH ("security_invoker"='true') AS
 SELECT "id",
    "consultant_id",
    "provider",
    "status",
    "connected_at",
    "last_sync_at",
    "last_error",
    "token_expires_at",
    "backfill_status",
    "backfill_cursor",
    "interrupted_at"
   FROM "public"."wearable_connections";


ALTER VIEW "public"."wearable_connection_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wearable_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "text_version" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "withdrawn_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wearable_consents_text_version_check" CHECK (("text_version" ~ '^v[0-9]+$'::"text")),
    CONSTRAINT "wearable_consents_withdrawn_after_accepted" CHECK ((("withdrawn_at" IS NULL) OR ("withdrawn_at" >= "accepted_at")))
);

ALTER TABLE ONLY "public"."wearable_consents" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_consents" OWNER TO "postgres";


COMMENT ON TABLE "public"."wearable_consents" IS 'Consentements au partage des données d''objet connecté (version du texte, acceptation, retrait).';



CREATE TABLE IF NOT EXISTS "public"."wearable_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "recorded_date" "date" NOT NULL,
    "data_type" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "source" "text" DEFAULT 'circular'::"text",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "wearable_data_data_type_check" CHECK (("data_type" = ANY (ARRAY['sleep'::"text", 'hrv'::"text", 'activity'::"text", 'temperature'::"text"])))
);


ALTER TABLE "public"."wearable_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wearable_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "type" "text",
    "level" "text",
    "message" "text",
    "suggested_action" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wearable_insights_level_check" CHECK (("level" = ANY (ARRAY['info'::"text", 'attention'::"text"]))),
    CONSTRAINT "wearable_insights_type_check" CHECK (("type" = ANY (ARRAY['sleep'::"text", 'hrv'::"text", 'activity'::"text"])))
);


ALTER TABLE "public"."wearable_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wearable_oauth_states" (
    "nonce" "text" NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "consumed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."wearable_oauth_states" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_oauth_states" OWNER TO "postgres";


COMMENT ON TABLE "public"."wearable_oauth_states" IS 'Nonces de state OAuth déjà consommés (usage unique). Purgeables après expires_at.';



CREATE TABLE IF NOT EXISTS "public"."wearable_raw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "provider" "public"."wearable_provider" NOT NULL,
    "data_type" "public"."wearable_data_type" NOT NULL,
    "provider_record_id" "text" NOT NULL,
    "data_date" "date" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "source_event_id" "uuid",
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."wearable_raw" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_raw" OWNER TO "postgres";


COMMENT ON COLUMN "public"."wearable_raw"."provider_record_id" IS 'Identifiant stable chez le fournisseur. Polar (données journalières) : ''<polar_user_id>:<YYYY-MM-DD>''.';



COMMENT ON COLUMN "public"."wearable_raw"."fetched_at" IS 'Date de la dernière lecture chez le fournisseur ; mise à jour à chaque upsert (nouvelle version).';



CREATE TABLE IF NOT EXISTS "public"."wearable_recap_settings" (
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "frequency" "text" DEFAULT '1w'::"text" NOT NULL,
    "weekdays" smallint[] DEFAULT '{1}'::smallint[] NOT NULL,
    "anchor" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wearable_recap_settings_frequency_check" CHECK (("frequency" = ANY (ARRAY['1d'::"text", '1w'::"text", '2w'::"text", '1m'::"text"]))),
    CONSTRAINT "wearable_recap_settings_weekdays_check" CHECK (((("cardinality"("weekdays") >= 1) AND ("cardinality"("weekdays") <= 7)) AND ("weekdays" <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint])))
);


ALTER TABLE "public"."wearable_recap_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wearable_recaps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "frequency" "text" NOT NULL,
    "prepared_for" "date" NOT NULL,
    "period_from" "date" NOT NULL,
    "period_to" "date" NOT NULL,
    "valid_until" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "points" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "variants" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "body" "text",
    "message_id" "uuid",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wearable_recaps_frequency_check" CHECK (("frequency" = ANY (ARRAY['1d'::"text", '1w'::"text", '2w'::"text", '1m'::"text"]))),
    CONSTRAINT "wearable_recaps_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'skipped'::"text", 'expired'::"text", 'nothing'::"text", 'not_enough'::"text"])))
);


ALTER TABLE "public"."wearable_recaps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wearable_signal_reviews" (
    "consultant_id" "uuid" NOT NULL,
    "practitioner_id" "uuid" NOT NULL,
    "signal_key" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wearable_signal_reviews_signal_key_check" CHECK ((("char_length"("signal_key") >= 1) AND ("char_length"("signal_key") <= 120))),
    CONSTRAINT "wearable_signal_reviews_status_check" CHECK (("status" = ANY (ARRAY['seen'::"text", 'sent'::"text"])))
);


ALTER TABLE "public"."wearable_signal_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wearable_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consultant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "sleep_duration" integer,
    "sleep_score" integer,
    "hrv_avg" integer,
    "activity_level" integer,
    "completeness" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wearable_summaries" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_allowlist"
    ADD CONSTRAINT "admin_allowlist_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."ai_generation_logs"
    ADD CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allergies"
    ADD CONSTRAINT "allergies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamnese_instances"
    ADD CONSTRAINT "anamnese_instances_patient_id_key" UNIQUE ("consultant_id");



ALTER TABLE ONLY "public"."anamnese_instances"
    ADD CONSTRAINT "anamnese_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamneses"
    ADD CONSTRAINT "anamneses_patient_id_key" UNIQUE ("consultant_id");



ALTER TABLE ONLY "public"."anamneses"
    ADD CONSTRAINT "anamneses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamnesis_history"
    ADD CONSTRAINT "anamnesis_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamnesis_notes"
    ADD CONSTRAINT "anamnesis_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamnesis"
    ADD CONSTRAINT "anamnesis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."availability_overrides"
    ADD CONSTRAINT "availability_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availability_schedules"
    ADD CONSTRAINT "availability_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_connections"
    ADD CONSTRAINT "billing_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_connections"
    ADD CONSTRAINT "billing_connections_practitioner_provider_key" UNIQUE ("practitioner_id", "provider");



ALTER TABLE ONLY "public"."billing_external_customers"
    ADD CONSTRAINT "billing_external_customers_pkey" PRIMARY KEY ("practitioner_id", "consultant_id", "provider");



ALTER TABLE ONLY "public"."billing_history"
    ADD CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_plans"
    ADD CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."case_files"
    ADD CONSTRAINT "case_files_patient_id_key" UNIQUE ("patient_id");



ALTER TABLE ONLY "public"."case_files"
    ADD CONSTRAINT "case_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complement_tracking"
    ADD CONSTRAINT "complement_tracking_patient_id_complement_id_date_key" UNIQUE ("consultant_id", "complement_id", "date");



ALTER TABLE ONLY "public"."complement_tracking"
    ADD CONSTRAINT "complement_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complements"
    ADD CONSTRAINT "complements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_drawings"
    ADD CONSTRAINT "consultant_drawings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_goals"
    ADD CONSTRAINT "consultant_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_iris_photos"
    ADD CONSTRAINT "consultant_iris_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_relationships"
    ADD CONSTRAINT "consultant_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_relationships"
    ADD CONSTRAINT "consultant_relationships_unique" UNIQUE ("consultant_id", "related_consultant_id");



ALTER TABLE ONLY "public"."consultant_session_topics"
    ADD CONSTRAINT "consultant_session_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_terrain"
    ADD CONSTRAINT "consultant_terrain_consultant_id_key" UNIQUE ("consultant_id");



ALTER TABLE ONLY "public"."consultant_terrain"
    ADD CONSTRAINT "consultant_terrain_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_invoices"
    ADD CONSTRAINT "consultation_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_notes"
    ADD CONSTRAINT "consultation_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_types"
    ADD CONSTRAINT "consultation_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."current_treatments"
    ADD CONSTRAINT "current_treatments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_entries"
    ADD CONSTRAINT "cycle_entries_consultant_id_date_key" UNIQUE ("consultant_id", "date");



ALTER TABLE ONLY "public"."cycle_entries"
    ADD CONSTRAINT "cycle_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_profiles"
    ADD CONSTRAINT "cycle_profiles_consultant_id_key" UNIQUE ("consultant_id");



ALTER TABLE ONLY "public"."cycle_profiles"
    ADD CONSTRAINT "cycle_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_activity"
    ADD CONSTRAINT "daily_activity_business_key" UNIQUE ("consultant_id", "provider", "activity_date");



ALTER TABLE ONLY "public"."daily_activity"
    ADD CONSTRAINT "daily_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_journals"
    ADD CONSTRAINT "daily_journals_patient_id_date_key" UNIQUE ("patient_id", "date");



ALTER TABLE ONLY "public"."daily_journals"
    ADD CONSTRAINT "daily_journals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_patient_id_log_date_key" UNIQUE ("patient_id", "log_date");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."educational_resource_favorites"
    ADD CONSTRAINT "educational_resource_favorites_pkey" PRIMARY KEY ("practitioner_id", "resource_id");



ALTER TABLE ONLY "public"."educational_resources"
    ADD CONSTRAINT "educational_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."educational_resources"
    ADD CONSTRAINT "educational_resources_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."group_session_registrations"
    ADD CONSTRAINT "group_session_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_sessions"
    ADD CONSTRAINT "group_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_samples"
    ADD CONSTRAINT "hr_samples_business_key" UNIQUE ("consultant_id", "provider", "recorded_at");



ALTER TABLE ONLY "public"."hr_samples"
    ADD CONSTRAINT "hr_samples_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hrv_nightly"
    ADD CONSTRAINT "hrv_nightly_business_key" UNIQUE ("consultant_id", "provider", "night_date");



ALTER TABLE ONLY "public"."hrv_nightly"
    ADD CONSTRAINT "hrv_nightly_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inserted_blocks"
    ADD CONSTRAINT "inserted_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_history"
    ADD CONSTRAINT "invoice_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_templates"
    ADD CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("practitioner_id", "id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_patient_id_date_key" UNIQUE ("consultant_id", "date");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal"
    ADD CONSTRAINT "journal_patient_id_date_key" UNIQUE ("patient_id", "date");



ALTER TABLE ONLY "public"."journal"
    ADD CONSTRAINT "journal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_history"
    ADD CONSTRAINT "medical_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_observance_logs"
    ADD CONSTRAINT "observance_logs_item_date_unique" UNIQUE ("observance_item_id", "date");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_analysis_results"
    ADD CONSTRAINT "patient_analysis_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_anamnesis"
    ADD CONSTRAINT "patient_anamnesis_patient_id_key" UNIQUE ("consultant_id");



ALTER TABLE ONLY "public"."consultant_anamnesis"
    ADD CONSTRAINT "patient_anamnesis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_invitations"
    ADD CONSTRAINT "patient_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_invites"
    ADD CONSTRAINT "patient_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_invites"
    ADD CONSTRAINT "patient_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."consultant_memberships"
    ADD CONSTRAINT "patient_memberships_patient_id_patient_user_id_key" UNIQUE ("consultant_id", "consultant_user_id");



ALTER TABLE ONLY "public"."consultant_memberships"
    ADD CONSTRAINT "patient_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultant_plans"
    ADD CONSTRAINT "patient_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."consultant_questionnaire_codes"
    ADD CONSTRAINT "patient_questionnaire_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultants_health"
    ADD CONSTRAINT "patients_health_pkey" PRIMARY KEY ("consultant_id");



ALTER TABLE ONLY "public"."consultants_identity"
    ADD CONSTRAINT "patients_identity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultants"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_stripe_payment_method_id_key" UNIQUE ("stripe_payment_method_id");



ALTER TABLE ONLY "public"."plan_observance_items"
    ADD CONSTRAINT "plan_observance_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_observance_logs"
    ADD CONSTRAINT "plan_observance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_sections"
    ADD CONSTRAINT "plan_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_versions"
    ADD CONSTRAINT "plan_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_versions"
    ADD CONSTRAINT "plan_versions_plan_id_version_key" UNIQUE ("plan_id", "version");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_patient_id_key" UNIQUE ("consultant_id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practitioner_actions"
    ADD CONSTRAINT "practitioner_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practitioner_activity_log"
    ADD CONSTRAINT "practitioner_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practitioner_ai_profiles"
    ADD CONSTRAINT "practitioner_ai_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practitioner_ai_profiles"
    ADD CONSTRAINT "practitioner_ai_profiles_practitioner_id_key" UNIQUE ("practitioner_id");



ALTER TABLE ONLY "public"."practitioner_billing_settings"
    ADD CONSTRAINT "practitioner_billing_settings_pkey" PRIMARY KEY ("practitioner_id");



ALTER TABLE ONLY "public"."practitioner_notes"
    ADD CONSTRAINT "practitioner_notes_patient_id_practitioner_id_key" UNIQUE ("consultant_id", "practitioner_id");



ALTER TABLE ONLY "public"."practitioner_notes"
    ADD CONSTRAINT "practitioner_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practitioner_resource_favorites"
    ADD CONSTRAINT "practitioner_resource_favorites_pkey" PRIMARY KEY ("practitioner_id", "resource_id");



ALTER TABLE ONLY "public"."practitioner_resources"
    ADD CONSTRAINT "practitioner_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practitioner_verifications"
    ADD CONSTRAINT "practitioner_verifications_pkey" PRIMARY KEY ("practitioner_id");



ALTER TABLE ONLY "public"."practitioners"
    ADD CONSTRAINT "practitioners_booking_slug_key" UNIQUE ("booking_slug");



ALTER TABLE ONLY "public"."practitioners"
    ADD CONSTRAINT "practitioners_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."practitioners"
    ADD CONSTRAINT "practitioners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practitioners_public"
    ADD CONSTRAINT "practitioners_public_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preliminary_questionnaires"
    ADD CONSTRAINT "preliminary_questionnaires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_questions"
    ADD CONSTRAINT "questionnaire_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_questions"
    ADD CONSTRAINT "questionnaire_questions_section_id_question_key_key" UNIQUE ("section_id", "question_key");



ALTER TABLE ONLY "public"."questionnaire_sections"
    ADD CONSTRAINT "questionnaire_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_sections"
    ADD CONSTRAINT "questionnaire_sections_version_id_section_key_key" UNIQUE ("version_id", "section_key");



ALTER TABLE ONLY "public"."questionnaire_versions"
    ADD CONSTRAINT "questionnaire_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_assignments"
    ADD CONSTRAINT "resource_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sleep_sessions"
    ADD CONSTRAINT "sleep_sessions_business_key" UNIQUE ("consultant_id", "provider", "night_date");



ALTER TABLE ONLY "public"."sleep_sessions"
    ADD CONSTRAINT "sleep_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_subscriptions"
    ADD CONSTRAINT "stripe_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."supplement_items"
    ADD CONSTRAINT "supplement_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_session_registrations"
    ADD CONSTRAINT "uq_group_session_email" UNIQUE ("group_session_id", "email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_connections"
    ADD CONSTRAINT "wearable_connections_consultant_provider_key" UNIQUE ("consultant_id", "provider");



ALTER TABLE ONLY "public"."wearable_connections"
    ADD CONSTRAINT "wearable_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_connections"
    ADD CONSTRAINT "wearable_connections_provider_user_key" UNIQUE ("provider", "provider_user_id");



ALTER TABLE ONLY "public"."wearable_consents"
    ADD CONSTRAINT "wearable_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_data"
    ADD CONSTRAINT "wearable_data_patient_id_recorded_date_data_type_key" UNIQUE ("consultant_id", "recorded_date", "data_type");



ALTER TABLE ONLY "public"."wearable_data"
    ADD CONSTRAINT "wearable_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_events"
    ADD CONSTRAINT "wearable_events_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."wearable_events"
    ADD CONSTRAINT "wearable_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_insights"
    ADD CONSTRAINT "wearable_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_oauth_states"
    ADD CONSTRAINT "wearable_oauth_states_pkey" PRIMARY KEY ("nonce");



ALTER TABLE ONLY "public"."wearable_raw"
    ADD CONSTRAINT "wearable_raw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_raw"
    ADD CONSTRAINT "wearable_raw_provider_record_key" UNIQUE ("provider", "data_type", "provider_record_id");



ALTER TABLE ONLY "public"."wearable_recap_settings"
    ADD CONSTRAINT "wearable_recap_settings_pkey" PRIMARY KEY ("consultant_id");



ALTER TABLE ONLY "public"."wearable_recaps"
    ADD CONSTRAINT "wearable_recaps_once" UNIQUE ("consultant_id", "prepared_for");



ALTER TABLE ONLY "public"."wearable_recaps"
    ADD CONSTRAINT "wearable_recaps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wearable_signal_reviews"
    ADD CONSTRAINT "wearable_signal_reviews_pkey" PRIMARY KEY ("consultant_id", "signal_key");



ALTER TABLE ONLY "public"."wearable_summaries"
    ADD CONSTRAINT "wearable_summaries_patient_id_date_key" UNIQUE ("consultant_id", "date");



ALTER TABLE ONLY "public"."wearable_summaries"
    ADD CONSTRAINT "wearable_summaries_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "appointments_video_join_token_key" ON "public"."appointments" USING "btree" ("video_join_token") WHERE ("video_join_token" IS NOT NULL);



CREATE INDEX "consultant_drawings_consultant_created_idx" ON "public"."consultant_drawings" USING "btree" ("consultant_id", "created_at" DESC);



CREATE INDEX "consultants_health_practitioner_id_idx" ON "public"."consultants_health" USING "btree" ("practitioner_id");



CREATE INDEX "consultants_identity_practitioner_id_idx" ON "public"."consultants_identity" USING "btree" ("practitioner_id");



CREATE INDEX "idx_activity_log_created" ON "public"."practitioner_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_log_practitioner" ON "public"."practitioner_activity_log" USING "btree" ("practitioner_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_type" ON "public"."practitioner_activity_log" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_admin_profiles_email" ON "public"."admin_profiles" USING "btree" ("email");



CREATE INDEX "idx_ai_logs_created" ON "public"."ai_generation_logs" USING "btree" ("created_at");



CREATE INDEX "idx_ai_logs_practitioner" ON "public"."ai_generation_logs" USING "btree" ("practitioner_id");



CREATE INDEX "idx_allergies_consultant_id" ON "public"."allergies" USING "btree" ("consultant_id");



CREATE INDEX "idx_allergies_practitioner_id" ON "public"."allergies" USING "btree" ("practitioner_id");



CREATE INDEX "idx_anamneses_consultant" ON "public"."anamneses" USING "btree" ("consultant_id");



CREATE INDEX "idx_anamnesis_notes_consultant" ON "public"."anamnesis_notes" USING "btree" ("consultant_id", "section_id", "created_at");



CREATE INDEX "idx_anamnesis_patient" ON "public"."anamnesis" USING "btree" ("patient_id");



CREATE INDEX "idx_anamnesis_practitioner" ON "public"."anamnesis" USING "btree" ("practitioner_id");



CREATE UNIQUE INDEX "idx_appointments_cancel_token" ON "public"."appointments" USING "btree" ("cancel_token");



CREATE INDEX "idx_appointments_checkout_session" ON "public"."appointments" USING "btree" ("stripe_checkout_session_id");



CREATE INDEX "idx_appointments_consultant" ON "public"."appointments" USING "btree" ("consultant_id");



CREATE INDEX "idx_appointments_consultation_type" ON "public"."appointments" USING "btree" ("consultation_type_id");



CREATE INDEX "idx_appointments_practitioner" ON "public"."appointments" USING "btree" ("practitioner_id");



CREATE INDEX "idx_appointments_starts_at" ON "public"."appointments" USING "btree" ("starts_at");



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_articles_published" ON "public"."articles" USING "btree" ("published");



CREATE INDEX "idx_articles_slug" ON "public"."articles" USING "btree" ("slug");



CREATE INDEX "idx_audit_log_admin" ON "public"."admin_audit_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_audit_log_created_at" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_target" ON "public"."admin_audit_log" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_availability_practitioner" ON "public"."availability_schedules" USING "btree" ("practitioner_id");



CREATE INDEX "idx_blocks_favorite" ON "public"."blocks" USING "btree" ("owner_id", "is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "idx_blocks_motifs" ON "public"."blocks" USING "gin" ("motifs");



CREATE INDEX "idx_blocks_owner" ON "public"."blocks" USING "btree" ("owner_id") WHERE ("owner_id" IS NOT NULL);



CREATE INDEX "idx_blocks_search" ON "public"."blocks" USING "gin" ("to_tsvector"('"french"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("content", ''::"text"))));



CREATE INDEX "idx_blocks_section" ON "public"."blocks" USING "btree" ("section");



CREATE INDEX "idx_blocks_source" ON "public"."blocks" USING "btree" ("source");



CREATE INDEX "idx_blocks_tags" ON "public"."blocks" USING "gin" ("tags");



CREATE INDEX "idx_blocks_usage" ON "public"."blocks" USING "btree" ("owner_id", "usage_count" DESC);



CREATE INDEX "idx_consultant_analysis_results_consultant" ON "public"."consultant_analysis_results" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultant_analysis_results_practitioner" ON "public"."consultant_analysis_results" USING "btree" ("practitioner_id");



CREATE INDEX "idx_consultant_anamnesis_consultant" ON "public"."consultant_anamnesis" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultant_anamnesis_naturopath" ON "public"."consultant_anamnesis" USING "btree" ("naturopath_id");



CREATE INDEX "idx_consultant_goals_consultant" ON "public"."consultant_goals" USING "btree" ("consultant_id", "position");



CREATE INDEX "idx_consultant_invitations_consultant_id" ON "public"."consultant_invitations" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultant_invitations_email" ON "public"."consultant_invitations" USING "btree" ("email");



CREATE INDEX "idx_consultant_invitations_practitioner" ON "public"."consultant_invitations" USING "btree" ("practitioner_id");



CREATE INDEX "idx_consultant_invitations_status" ON "public"."consultant_invitations" USING "btree" ("status");



CREATE INDEX "idx_consultant_iris_photos_lookup" ON "public"."consultant_iris_photos" USING "btree" ("consultant_id", "eye", "taken_at" DESC);



CREATE INDEX "idx_consultant_plans_consultant" ON "public"."consultant_plans" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultant_plans_consultant_version" ON "public"."consultant_plans" USING "btree" ("consultant_id", "version");



CREATE INDEX "idx_consultant_plans_practitioner" ON "public"."consultant_plans" USING "btree" ("practitioner_id");



CREATE INDEX "idx_consultant_plans_status" ON "public"."consultant_plans" USING "btree" ("status");



CREATE INDEX "idx_consultant_questionnaire_codes_consultant_id" ON "public"."consultant_questionnaire_codes" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultant_questionnaire_codes_expires_at" ON "public"."consultant_questionnaire_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_consultant_relationships_consultant_id" ON "public"."consultant_relationships" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultant_relationships_related_consultant_id" ON "public"."consultant_relationships" USING "btree" ("related_consultant_id");



CREATE INDEX "idx_consultant_terrain_consultant_id" ON "public"."consultant_terrain" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultants_activated" ON "public"."consultants" USING "btree" ("activated");



CREATE INDEX "idx_consultants_deleted_at" ON "public"."consultants" USING "btree" ("deleted_at");



CREATE INDEX "idx_consultants_email" ON "public"."consultants" USING "btree" ("email");



CREATE INDEX "idx_consultants_email_lower" ON "public"."consultants" USING "btree" ("lower"("email"));



CREATE INDEX "idx_consultants_practitioner" ON "public"."consultants" USING "btree" ("practitioner_id");



CREATE INDEX "idx_consultants_snoozed" ON "public"."consultants" USING "btree" ("is_snoozed") WHERE ("is_snoozed" = true);



CREATE INDEX "idx_consultation_date" ON "public"."consultation_notes" USING "btree" ("consultation_date" DESC);



CREATE INDEX "idx_consultation_invoices_annee" ON "public"."consultation_invoices" USING "btree" ("annee_fiscale");



CREATE INDEX "idx_consultation_invoices_appointment" ON "public"."consultation_invoices" USING "btree" ("appointment_id");



CREATE INDEX "idx_consultation_invoices_consultant" ON "public"."consultation_invoices" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultation_invoices_date_emission" ON "public"."consultation_invoices" USING "btree" ("date_emission");



CREATE INDEX "idx_consultation_invoices_practitioner" ON "public"."consultation_invoices" USING "btree" ("practitioner_id");



CREATE INDEX "idx_consultation_invoices_status" ON "public"."consultation_invoices" USING "btree" ("status");



CREATE INDEX "idx_consultation_patient" ON "public"."consultation_notes" USING "btree" ("patient_id");



CREATE INDEX "idx_consultation_practitioner" ON "public"."consultation_notes" USING "btree" ("practitioner_id");



CREATE INDEX "idx_consultation_types_practitioner" ON "public"."consultation_types" USING "btree" ("practitioner_id");



CREATE INDEX "idx_consultations_consultant" ON "public"."consultations" USING "btree" ("consultant_id");



CREATE INDEX "idx_consultations_date" ON "public"."consultations" USING "btree" ("date");



CREATE INDEX "idx_current_treatments_consultant_id" ON "public"."current_treatments" USING "btree" ("consultant_id");



CREATE INDEX "idx_current_treatments_practitioner_id" ON "public"."current_treatments" USING "btree" ("practitioner_id");



CREATE INDEX "idx_cycle_entries_consultant_date" ON "public"."cycle_entries" USING "btree" ("consultant_id", "date" DESC);



CREATE INDEX "idx_cycle_profiles_consultant" ON "public"."cycle_profiles" USING "btree" ("consultant_id");



CREATE INDEX "idx_daily_activity_consultant_date" ON "public"."daily_activity" USING "btree" ("consultant_id", "activity_date");



CREATE INDEX "idx_daily_activity_source" ON "public"."daily_activity" USING "btree" ("source_raw_id");



CREATE INDEX "idx_daily_logs_date" ON "public"."daily_logs" USING "btree" ("log_date");



CREATE INDEX "idx_daily_logs_patient" ON "public"."daily_logs" USING "btree" ("patient_id");



CREATE INDEX "idx_educational_resources_practitioner_category" ON "public"."educational_resources" USING "btree" ("practitioner_id", "category");



CREATE INDEX "idx_educational_resources_source_published" ON "public"."educational_resources" USING "btree" ("source", "is_published");



CREATE INDEX "idx_educational_resources_tags" ON "public"."educational_resources" USING "gin" ("tags");



CREATE INDEX "idx_group_session_registrations_consultant" ON "public"."group_session_registrations" USING "btree" ("consultant_id");



CREATE INDEX "idx_group_session_registrations_session" ON "public"."group_session_registrations" USING "btree" ("group_session_id");



CREATE INDEX "idx_group_sessions_practitioner_starts" ON "public"."group_sessions" USING "btree" ("practitioner_id", "starts_at");



CREATE INDEX "idx_hr_samples_consultant_time" ON "public"."hr_samples" USING "btree" ("consultant_id", "recorded_at");



CREATE INDEX "idx_hr_samples_source" ON "public"."hr_samples" USING "btree" ("source_raw_id");



CREATE INDEX "idx_hrv_nightly_consultant_date" ON "public"."hrv_nightly" USING "btree" ("consultant_id", "night_date");



CREATE INDEX "idx_hrv_nightly_source" ON "public"."hrv_nightly" USING "btree" ("source_raw_id");



CREATE INDEX "idx_inserted_blocks_plan" ON "public"."inserted_blocks" USING "btree" ("plan_version_id");



CREATE INDEX "idx_inserted_blocks_source" ON "public"."inserted_blocks" USING "btree" ("source_block_id");



CREATE INDEX "idx_invoice_history_created" ON "public"."invoice_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_invoice_history_invoice" ON "public"."invoice_history" USING "btree" ("invoice_id");



CREATE UNIQUE INDEX "idx_invoice_numero_unique" ON "public"."consultation_invoices" USING "btree" ("numero") WHERE ("numero" IS NOT NULL);



CREATE INDEX "idx_invoice_templates_practitioner" ON "public"."invoice_templates" USING "btree" ("practitioner_id");



CREATE INDEX "idx_invoices_practitioner" ON "public"."invoices" USING "btree" ("practitioner_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_subscription" ON "public"."invoices" USING "btree" ("subscription_id");



CREATE INDEX "idx_journal_consultant_date" ON "public"."journal_entries" USING "btree" ("consultant_id", "date");



CREATE INDEX "idx_journal_date" ON "public"."journal" USING "btree" ("date" DESC);



CREATE INDEX "idx_journal_entries_date" ON "public"."journal_entries" USING "btree" ("date");



CREATE INDEX "idx_journal_patient" ON "public"."journal" USING "btree" ("patient_id");



CREATE INDEX "idx_medical_history_consultant_id" ON "public"."medical_history" USING "btree" ("consultant_id");



CREATE INDEX "idx_medical_history_practitioner_id" ON "public"."medical_history" USING "btree" ("practitioner_id");



CREATE INDEX "idx_messages_consultant" ON "public"."messages" USING "btree" ("consultant_id");



CREATE INDEX "idx_messages_read" ON "public"."messages" USING "btree" ("read");



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender");



CREATE INDEX "idx_messages_sent_at" ON "public"."messages" USING "btree" ("sent_at");



CREATE INDEX "idx_notifications_consultant" ON "public"."notifications" USING "btree" ("consultant_id");



CREATE INDEX "idx_notifications_practitioner" ON "public"."notifications" USING "btree" ("practitioner_id");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_observance_items_consultant_source" ON "public"."plan_observance_items" USING "btree" ("consultant_id", "source_key") WHERE "is_active";



CREATE INDEX "idx_observance_logs_consultant_date" ON "public"."plan_observance_logs" USING "btree" ("consultant_id", "date");



CREATE INDEX "idx_observance_logs_item_date" ON "public"."plan_observance_logs" USING "btree" ("observance_item_id", "date");



CREATE INDEX "idx_otp_codes_consultant_id" ON "public"."otp_codes" USING "btree" ("consultant_id");



CREATE INDEX "idx_otp_codes_email" ON "public"."otp_codes" USING "btree" ("email");



CREATE INDEX "idx_otp_codes_practitioner" ON "public"."otp_codes" USING "btree" ("practitioner_id");



CREATE INDEX "idx_overrides_practitioner_date" ON "public"."availability_overrides" USING "btree" ("practitioner_id", "date");



CREATE INDEX "idx_plans_consultant" ON "public"."plans" USING "btree" ("consultant_id");



CREATE INDEX "idx_practitioner_actions_consultant" ON "public"."practitioner_actions" USING "btree" ("consultant_id");



CREATE INDEX "idx_practitioner_actions_created" ON "public"."practitioner_actions" USING "btree" ("practitioner_id", "created_at" DESC);



CREATE INDEX "idx_practitioner_actions_practitioner" ON "public"."practitioner_actions" USING "btree" ("practitioner_id");



CREATE INDEX "idx_practitioner_resources_owner" ON "public"."practitioner_resources" USING "btree" ("owner_id");



CREATE INDEX "idx_practitioner_resources_status" ON "public"."practitioner_resources" USING "btree" ("review_status");



CREATE UNIQUE INDEX "idx_practitioners_booking_slug" ON "public"."practitioners" USING "btree" ("booking_slug") WHERE ("booking_slug" IS NOT NULL);



CREATE UNIQUE INDEX "idx_practitioners_siret" ON "public"."practitioners" USING "btree" ("siret") WHERE ("siret" IS NOT NULL);



CREATE INDEX "idx_preliminary_questionnaires_email" ON "public"."preliminary_questionnaires" USING "btree" ("email");



CREATE INDEX "idx_preliminary_questionnaires_naturopath" ON "public"."preliminary_questionnaires" USING "btree" ("naturopath_id");



CREATE INDEX "idx_preliminary_questionnaires_status" ON "public"."preliminary_questionnaires" USING "btree" ("status");



CREATE INDEX "idx_recommendations_patient" ON "public"."recommendations" USING "btree" ("patient_id");



CREATE INDEX "idx_resource_assignments_consultant" ON "public"."resource_assignments" USING "btree" ("consultant_id", "read_at");



CREATE UNIQUE INDEX "idx_resource_assignments_unique" ON "public"."resource_assignments" USING "btree" ("resource_id", "consultant_id", "consultant_plan_id") WHERE ("consultant_plan_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_resource_assignments_unique_no_plan" ON "public"."resource_assignments" USING "btree" ("resource_id", "consultant_id") WHERE ("consultant_plan_id" IS NULL);



CREATE INDEX "idx_session_topics_consultant" ON "public"."consultant_session_topics" USING "btree" ("consultant_id", "done_at", "created_at");



CREATE INDEX "idx_sleep_sessions_consultant_date" ON "public"."sleep_sessions" USING "btree" ("consultant_id", "night_date");



CREATE INDEX "idx_sleep_sessions_source" ON "public"."sleep_sessions" USING "btree" ("source_raw_id");



CREATE INDEX "idx_subscriptions_practitioner" ON "public"."subscriptions" USING "btree" ("practitioner_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_supplement_items_plan" ON "public"."supplement_items" USING "btree" ("plan_id");



CREATE INDEX "idx_templates_motif" ON "public"."templates" USING "btree" ("primary_motif");



CREATE INDEX "idx_templates_owner" ON "public"."templates" USING "btree" ("owner_id");



CREATE INDEX "idx_wearable_connections_backfill" ON "public"."wearable_connections" USING "btree" ("backfill_status") WHERE ("backfill_status" = ANY (ARRAY['pending'::"public"."wearable_backfill_status", 'running'::"public"."wearable_backfill_status"]));



CREATE INDEX "idx_wearable_consents_consultant" ON "public"."wearable_consents" USING "btree" ("consultant_id");



CREATE INDEX "idx_wearable_consultant_date" ON "public"."wearable_summaries" USING "btree" ("consultant_id", "date");



CREATE INDEX "idx_wearable_date" ON "public"."wearable_data" USING "btree" ("recorded_date" DESC);



CREATE INDEX "idx_wearable_events_provider_user" ON "public"."wearable_events" USING "btree" ("provider", "provider_user_id");



CREATE INDEX "idx_wearable_events_queue" ON "public"."wearable_events" USING "btree" ("status", "next_attempt_at");



CREATE INDEX "idx_wearable_insights_consultant" ON "public"."wearable_insights" USING "btree" ("consultant_id");



CREATE INDEX "idx_wearable_oauth_states_expires_at" ON "public"."wearable_oauth_states" USING "btree" ("expires_at");



CREATE INDEX "idx_wearable_patient" ON "public"."wearable_data" USING "btree" ("consultant_id");



CREATE INDEX "idx_wearable_raw_consultant_type_date" ON "public"."wearable_raw" USING "btree" ("consultant_id", "data_type", "data_date");



CREATE INDEX "idx_wearable_recaps_practitioner" ON "public"."wearable_recaps" USING "btree" ("practitioner_id", "status", "valid_until");



CREATE INDEX "idx_wearable_summaries_date" ON "public"."wearable_summaries" USING "btree" ("date");



CREATE INDEX "idx_wearable_summaries_patient" ON "public"."wearable_summaries" USING "btree" ("consultant_id");



CREATE INDEX "idx_wearable_type" ON "public"."wearable_data" USING "btree" ("data_type");



CREATE INDEX "practitioner_verifications_created_idx" ON "public"."practitioner_verifications" USING "btree" ("created_at" DESC);



CREATE INDEX "prescription_items_prescription_id_idx" ON "public"."prescription_items" USING "btree" ("prescription_id");



CREATE INDEX "questionnaire_questions_section_idx" ON "public"."questionnaire_questions" USING "btree" ("section_id", "position");



CREATE INDEX "questionnaire_sections_version_idx" ON "public"."questionnaire_sections" USING "btree" ("version_id", "position");



CREATE UNIQUE INDEX "questionnaire_versions_single_draft" ON "public"."questionnaire_versions" USING "btree" ("status") WHERE ("status" = 'draft'::"text");



CREATE UNIQUE INDEX "questionnaire_versions_version_key" ON "public"."questionnaire_versions" USING "btree" ("version") WHERE ("version" IS NOT NULL);



CREATE INDEX "stripe_subscriptions_payment_failed_idx" ON "public"."stripe_subscriptions" USING "btree" ("payment_failed");



CREATE INDEX "stripe_subscriptions_practitioner_id_idx" ON "public"."stripe_subscriptions" USING "btree" ("practitioner_id");



CREATE INDEX "stripe_subscriptions_status_idx" ON "public"."stripe_subscriptions" USING "btree" ("status");



CREATE UNIQUE INDEX "uq_anamnesis_first_note" ON "public"."anamnesis_notes" USING "btree" ("consultant_id", "practitioner_id") WHERE ("section_id" = 'first_note'::"text");



CREATE UNIQUE INDEX "uq_session_topics_open_key" ON "public"."consultant_session_topics" USING "btree" ("consultant_id", "source_key") WHERE (("done_at" IS NULL) AND ("source_key" IS NOT NULL));



CREATE UNIQUE INDEX "wearable_consents_one_active" ON "public"."wearable_consents" USING "btree" ("consultant_id", "text_version") WHERE ("withdrawn_at" IS NULL);



CREATE OR REPLACE TRIGGER "billing_connections_delete_secret" AFTER DELETE ON "public"."billing_connections" FOR EACH ROW EXECUTE FUNCTION "public"."billing_connections_delete_secret"();



CREATE OR REPLACE TRIGGER "blocks_updated_at" BEFORE UPDATE ON "public"."blocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "daily_activity_set_updated_at" BEFORE UPDATE ON "public"."daily_activity" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_samples_set_updated_at" BEFORE UPDATE ON "public"."hr_samples" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "hrv_nightly_set_updated_at" BEFORE UPDATE ON "public"."hrv_nightly" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "practitioners_protect_account_status" BEFORE UPDATE ON "public"."practitioners" FOR EACH ROW EXECUTE FUNCTION "public"."protect_practitioner_account_status"();



CREATE OR REPLACE TRIGGER "prevent_patient_practitioner_reassign" BEFORE UPDATE ON "public"."consultants_identity" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_patient_practitioner_reassign"();



CREATE OR REPLACE TRIGGER "set_consultant_plans_updated_at" BEFORE UPDATE ON "public"."consultant_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_consultant_plans_updated_at"();



CREATE OR REPLACE TRIGGER "set_consultation_invoices_updated_at" BEFORE UPDATE ON "public"."consultation_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_invoice_templates_updated_at" BEFORE UPDATE ON "public"."invoice_templates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_practitioner_billing_settings_updated_at" BEFORE UPDATE ON "public"."practitioner_billing_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_allergies" BEFORE UPDATE ON "public"."allergies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_current_treatments" BEFORE UPDATE ON "public"."current_treatments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_medical_history" BEFORE UPDATE ON "public"."medical_history" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_on_consultant_drawings" BEFORE UPDATE ON "public"."consultant_drawings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sleep_sessions_set_updated_at" BEFORE UPDATE ON "public"."sleep_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_consultant_iris_photos_updated_at" BEFORE UPDATE ON "public"."consultant_iris_photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_consultant_iris_photos_updated_at"();



CREATE OR REPLACE TRIGGER "trg_consultant_terrain_updated_at" BEFORE UPDATE ON "public"."consultant_terrain" FOR EACH ROW EXECUTE FUNCTION "public"."update_consultant_terrain_updated_at"();



CREATE OR REPLACE TRIGGER "trg_educational_resources_updated_at" BEFORE UPDATE ON "public"."educational_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_educational_resources_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_assign_invoice_number" BEFORE INSERT OR UPDATE ON "public"."consultation_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."assign_invoice_number"();



CREATE OR REPLACE TRIGGER "trigger_link_preliminary_questionnaire" AFTER INSERT ON "public"."consultants" FOR EACH ROW EXECUTE FUNCTION "public"."link_preliminary_questionnaire_on_patient_create"();



CREATE OR REPLACE TRIGGER "trigger_track_anamnesis_changes" BEFORE UPDATE ON "public"."consultant_anamnesis" FOR EACH ROW EXECUTE FUNCTION "public"."track_anamnesis_changes"();



CREATE OR REPLACE TRIGGER "wearable_connections_delete_secret" AFTER DELETE ON "public"."wearable_connections" FOR EACH ROW EXECUTE FUNCTION "public"."wearable_connections_delete_secret"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generation_logs"
    ADD CONSTRAINT "ai_generation_logs_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generation_logs"
    ADD CONSTRAINT "ai_generation_logs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."consultant_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_generation_logs"
    ADD CONSTRAINT "ai_generation_logs_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."allergies"
    ADD CONSTRAINT "allergies_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."allergies"
    ADD CONSTRAINT "allergies_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."anamnese_instances"
    ADD CONSTRAINT "anamnese_instances_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamneses"
    ADD CONSTRAINT "anamneses_case_file_id_fkey" FOREIGN KEY ("case_file_id") REFERENCES "public"."case_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."anamneses"
    ADD CONSTRAINT "anamneses_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_history"
    ADD CONSTRAINT "anamnesis_history_anamnesis_id_fkey" FOREIGN KEY ("anamnesis_id") REFERENCES "public"."consultant_anamnesis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_history"
    ADD CONSTRAINT "anamnesis_history_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_notes"
    ADD CONSTRAINT "anamnesis_notes_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_notes"
    ADD CONSTRAINT "anamnesis_notes_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_consultation_type_id_fkey" FOREIGN KEY ("consultation_type_id") REFERENCES "public"."consultation_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."appointments"("id");



ALTER TABLE ONLY "public"."availability_overrides"
    ADD CONSTRAINT "availability_overrides_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."availability_schedules"
    ADD CONSTRAINT "availability_schedules_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_connections"
    ADD CONSTRAINT "billing_connections_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_external_customers"
    ADD CONSTRAINT "billing_external_customers_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_external_customers"
    ADD CONSTRAINT "billing_external_customers_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_history"
    ADD CONSTRAINT "billing_history_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_history"
    ADD CONSTRAINT "billing_history_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_history"
    ADD CONSTRAINT "billing_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_plans"
    ADD CONSTRAINT "care_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."care_plans"
    ADD CONSTRAINT "care_plans_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_files"
    ADD CONSTRAINT "case_files_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_files"
    ADD CONSTRAINT "case_files_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complement_tracking"
    ADD CONSTRAINT "complement_tracking_complement_id_fkey" FOREIGN KEY ("complement_id") REFERENCES "public"."complements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complement_tracking"
    ADD CONSTRAINT "complement_tracking_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complements"
    ADD CONSTRAINT "complements_case_file_id_fkey" FOREIGN KEY ("case_file_id") REFERENCES "public"."case_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_drawings"
    ADD CONSTRAINT "consultant_drawings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id");



ALTER TABLE ONLY "public"."consultant_drawings"
    ADD CONSTRAINT "consultant_drawings_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_drawings"
    ADD CONSTRAINT "consultant_drawings_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."consultant_goals"
    ADD CONSTRAINT "consultant_goals_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_goals"
    ADD CONSTRAINT "consultant_goals_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_iris_photos"
    ADD CONSTRAINT "consultant_iris_photos_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_iris_photos"
    ADD CONSTRAINT "consultant_iris_photos_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."consultant_relationships"
    ADD CONSTRAINT "consultant_relationships_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_relationships"
    ADD CONSTRAINT "consultant_relationships_related_consultant_id_fkey" FOREIGN KEY ("related_consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_session_topics"
    ADD CONSTRAINT "consultant_session_topics_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_session_topics"
    ADD CONSTRAINT "consultant_session_topics_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_terrain"
    ADD CONSTRAINT "consultant_terrain_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_terrain"
    ADD CONSTRAINT "consultant_terrain_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."consultation_invoices"
    ADD CONSTRAINT "consultation_invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultation_invoices"
    ADD CONSTRAINT "consultation_invoices_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consultation_invoices"
    ADD CONSTRAINT "consultation_invoices_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultation_invoices"
    ADD CONSTRAINT "consultation_invoices_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_types"
    ADD CONSTRAINT "consultation_types_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."current_treatments"
    ADD CONSTRAINT "current_treatments_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."current_treatments"
    ADD CONSTRAINT "current_treatments_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."cycle_entries"
    ADD CONSTRAINT "cycle_entries_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_profiles"
    ADD CONSTRAINT "cycle_profiles_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_activity"
    ADD CONSTRAINT "daily_activity_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_activity"
    ADD CONSTRAINT "daily_activity_source_raw_id_fkey" FOREIGN KEY ("source_raw_id") REFERENCES "public"."wearable_raw"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_journals"
    ADD CONSTRAINT "daily_journals_case_file_id_fkey" FOREIGN KEY ("case_file_id") REFERENCES "public"."case_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_journals"
    ADD CONSTRAINT "daily_journals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."educational_resource_favorites"
    ADD CONSTRAINT "educational_resource_favorites_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."educational_resource_favorites"
    ADD CONSTRAINT "educational_resource_favorites_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."educational_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."educational_resources"
    ADD CONSTRAINT "educational_resources_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_anamnesis"
    ADD CONSTRAINT "fk_preliminary_questionnaire" FOREIGN KEY ("preliminary_questionnaire_id") REFERENCES "public"."preliminary_questionnaires"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_session_registrations"
    ADD CONSTRAINT "group_session_registrations_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id");



ALTER TABLE ONLY "public"."group_session_registrations"
    ADD CONSTRAINT "group_session_registrations_group_session_id_fkey" FOREIGN KEY ("group_session_id") REFERENCES "public"."group_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_session_registrations"
    ADD CONSTRAINT "group_session_registrations_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."group_sessions"
    ADD CONSTRAINT "group_sessions_consultation_type_id_fkey" FOREIGN KEY ("consultation_type_id") REFERENCES "public"."consultation_types"("id");



ALTER TABLE ONLY "public"."group_sessions"
    ADD CONSTRAINT "group_sessions_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."hr_samples"
    ADD CONSTRAINT "hr_samples_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_samples"
    ADD CONSTRAINT "hr_samples_source_raw_id_fkey" FOREIGN KEY ("source_raw_id") REFERENCES "public"."wearable_raw"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hrv_nightly"
    ADD CONSTRAINT "hrv_nightly_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hrv_nightly"
    ADD CONSTRAINT "hrv_nightly_source_raw_id_fkey" FOREIGN KEY ("source_raw_id") REFERENCES "public"."wearable_raw"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inserted_blocks"
    ADD CONSTRAINT "inserted_blocks_source_block_id_fkey" FOREIGN KEY ("source_block_id") REFERENCES "public"."blocks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_history"
    ADD CONSTRAINT "invoice_history_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."consultation_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_history"
    ADD CONSTRAINT "invoice_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_templates"
    ADD CONSTRAINT "invoice_templates_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_history"
    ADD CONSTRAINT "medical_history_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_history"
    ADD CONSTRAINT "medical_history_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultant_analysis_results"
    ADD CONSTRAINT "patient_analysis_results_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_analysis_results"
    ADD CONSTRAINT "patient_analysis_results_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_anamnesis"
    ADD CONSTRAINT "patient_anamnesis_naturopath_id_fkey" FOREIGN KEY ("naturopath_id") REFERENCES "public"."practitioners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultant_anamnesis"
    ADD CONSTRAINT "patient_anamnesis_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_invitations"
    ADD CONSTRAINT "patient_invitations_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultant_invitations"
    ADD CONSTRAINT "patient_invitations_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_invites"
    ADD CONSTRAINT "patient_invites_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_invites"
    ADD CONSTRAINT "patient_invites_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_memberships"
    ADD CONSTRAINT "patient_memberships_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_plans"
    ADD CONSTRAINT "patient_plans_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_plans"
    ADD CONSTRAINT "patient_plans_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultant_questionnaire_codes"
    ADD CONSTRAINT "patient_questionnaire_codes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."consultant_questionnaire_codes"
    ADD CONSTRAINT "patient_questionnaire_codes_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultants_health"
    ADD CONSTRAINT "patients_health_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants_identity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultants_health"
    ADD CONSTRAINT "patients_health_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultants_identity"
    ADD CONSTRAINT "patients_identity_practitioners_public_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners_public"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultants"
    ADD CONSTRAINT "patients_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_observance_items"
    ADD CONSTRAINT "plan_observance_items_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_observance_items"
    ADD CONSTRAINT "plan_observance_items_consultant_plan_id_fkey" FOREIGN KEY ("consultant_plan_id") REFERENCES "public"."consultant_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_observance_items"
    ADD CONSTRAINT "plan_observance_items_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."plan_observance_logs"
    ADD CONSTRAINT "plan_observance_logs_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_observance_logs"
    ADD CONSTRAINT "plan_observance_logs_observance_item_id_fkey" FOREIGN KEY ("observance_item_id") REFERENCES "public"."plan_observance_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_sections"
    ADD CONSTRAINT "plan_sections_plan_version_id_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_versions"
    ADD CONSTRAINT "plan_versions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_actions"
    ADD CONSTRAINT "practitioner_actions_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_actions"
    ADD CONSTRAINT "practitioner_actions_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_ai_profiles"
    ADD CONSTRAINT "practitioner_ai_profiles_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_billing_settings"
    ADD CONSTRAINT "practitioner_billing_settings_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_notes"
    ADD CONSTRAINT "practitioner_notes_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_notes"
    ADD CONSTRAINT "practitioner_notes_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_resource_favorites"
    ADD CONSTRAINT "practitioner_resource_favorites_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_resource_favorites"
    ADD CONSTRAINT "practitioner_resource_favorites_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."practitioner_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_resources"
    ADD CONSTRAINT "practitioner_resources_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioner_verifications"
    ADD CONSTRAINT "practitioner_verifications_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioners"
    ADD CONSTRAINT "practitioners_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practitioners_public"
    ADD CONSTRAINT "practitioners_public_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preliminary_questionnaires"
    ADD CONSTRAINT "preliminary_questionnaires_linked_patient_id_fkey" FOREIGN KEY ("linked_consultant_id") REFERENCES "public"."consultants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."preliminary_questionnaires"
    ADD CONSTRAINT "preliminary_questionnaires_naturopath_id_fkey" FOREIGN KEY ("naturopath_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_questions"
    ADD CONSTRAINT "questionnaire_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."questionnaire_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_sections"
    ADD CONSTRAINT "questionnaire_sections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_assignments"
    ADD CONSTRAINT "resource_assignments_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_assignments"
    ADD CONSTRAINT "resource_assignments_consultant_plan_id_fkey" FOREIGN KEY ("consultant_plan_id") REFERENCES "public"."consultant_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."resource_assignments"
    ADD CONSTRAINT "resource_assignments_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id");



ALTER TABLE ONLY "public"."resource_assignments"
    ADD CONSTRAINT "resource_assignments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."educational_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sleep_sessions"
    ADD CONSTRAINT "sleep_sessions_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sleep_sessions"
    ADD CONSTRAINT "sleep_sessions_source_raw_id_fkey" FOREIGN KEY ("source_raw_id") REFERENCES "public"."wearable_raw"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_subscriptions"
    ADD CONSTRAINT "stripe_subscriptions_practitioner_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners_public"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_connections"
    ADD CONSTRAINT "wearable_connections_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_consents"
    ADD CONSTRAINT "wearable_consents_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_events"
    ADD CONSTRAINT "wearable_events_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wearable_insights"
    ADD CONSTRAINT "wearable_insights_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_oauth_states"
    ADD CONSTRAINT "wearable_oauth_states_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_raw"
    ADD CONSTRAINT "wearable_raw_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_raw"
    ADD CONSTRAINT "wearable_raw_source_event_id_fkey" FOREIGN KEY ("source_event_id") REFERENCES "public"."wearable_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wearable_recap_settings"
    ADD CONSTRAINT "wearable_recap_settings_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_recap_settings"
    ADD CONSTRAINT "wearable_recap_settings_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_recaps"
    ADD CONSTRAINT "wearable_recaps_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_recaps"
    ADD CONSTRAINT "wearable_recaps_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_signal_reviews"
    ADD CONSTRAINT "wearable_signal_reviews_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_signal_reviews"
    ADD CONSTRAINT "wearable_signal_reviews_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wearable_summaries"
    ADD CONSTRAINT "wearable_summaries_patient_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE CASCADE;



CREATE POLICY "Access own consultant anamneses" ON "public"."anamneses" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant consultations" ON "public"."consultations" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant journal" ON "public"."journal_entries" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant messages" ON "public"."messages" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant plan_sections" ON "public"."plan_sections" USING (("plan_version_id" IN ( SELECT "pv"."id"
   FROM (("public"."plan_versions" "pv"
     JOIN "public"."plans" "p" ON (("pv"."plan_id" = "p"."id")))
     JOIN "public"."consultants" "ct" ON (("p"."consultant_id" = "ct"."id")))
  WHERE ("ct"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant plan_versions" ON "public"."plan_versions" USING (("plan_id" IN ( SELECT "p"."id"
   FROM ("public"."plans" "p"
     JOIN "public"."consultants" "ct" ON (("p"."consultant_id" = "ct"."id")))
  WHERE ("ct"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant plans" ON "public"."plans" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant wearable_insights" ON "public"."wearable_insights" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Access own consultant wearable_summaries" ON "public"."wearable_summaries" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Accès insertions" ON "public"."inserted_blocks" USING (true);



CREATE POLICY "Admin access activity log" ON "public"."practitioner_activity_log" FOR SELECT USING ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Admin access audit log" ON "public"."admin_audit_log" USING ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text"))) WITH CHECK ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Admin access consultants identity" ON "public"."consultants_identity" USING (true);



CREATE POLICY "Admin access practitioners public" ON "public"."practitioners_public" USING ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text"))) WITH CHECK ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Admin allowlist delete" ON "public"."admin_allowlist" FOR DELETE USING ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Admin allowlist insert" ON "public"."admin_allowlist" FOR INSERT WITH CHECK ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Admin allowlist select" ON "public"."admin_allowlist" FOR SELECT USING ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Admin view stripe subscriptions" ON "public"."stripe_subscriptions" FOR SELECT USING ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Consultants can insert own membership" ON "public"."consultant_memberships" FOR INSERT WITH CHECK (("consultant_user_id" = "auth"."uid"()));



CREATE POLICY "Consultants can view own membership" ON "public"."consultant_memberships" FOR SELECT USING (("consultant_user_id" = "auth"."uid"()));



CREATE POLICY "Consultants view own anamnesis_history" ON "public"."anamnesis_history" FOR SELECT USING (("consultant_id" IN ( SELECT "anamnesis_history"."consultant_id"
   FROM "public"."consultant_memberships"
  WHERE ("consultant_memberships"."consultant_user_id" = "auth"."uid"()))));



CREATE POLICY "Créer ses blocs" ON "public"."blocks" FOR INSERT WITH CHECK ((("owner_id" = "auth"."uid"()) AND ("source" = 'praticien'::"public"."block_source")));



CREATE POLICY "Créer ses modèles" ON "public"."templates" FOR INSERT WITH CHECK ((("owner_id" = "auth"."uid"()) AND ("source" = 'praticien'::"public"."block_source")));



CREATE POLICY "Enable all for authenticated users" ON "public"."patient_profiles" USING (true);



CREATE POLICY "Modifier ses blocs" ON "public"."blocks" FOR UPDATE USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Modifier ses modèles" ON "public"."templates" FOR UPDATE USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Practitioner access consultants health" ON "public"."consultants_health" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioner access consultants identity" ON "public"."consultants_identity" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioner access own public" ON "public"."practitioners_public" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Practitioner insert own activity" ON "public"."practitioner_activity_log" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioner view stripe subscriptions" ON "public"."stripe_subscriptions" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners access own consultant anamnesis" ON "public"."consultant_anamnesis" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Practitioners can delete own consultants" ON "public"."consultants" FOR DELETE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners can insert own consultants" ON "public"."consultants" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners can manage own actions" ON "public"."practitioner_actions" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners can manage their AI profile" ON "public"."practitioner_ai_profiles" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners can select own consultants" ON "public"."consultants" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners can update own consultants" ON "public"."consultants" FOR UPDATE USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners can view their AI logs" ON "public"."ai_generation_logs" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners manage own availability" ON "public"."availability_schedules" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners manage own consultation_types" ON "public"."consultation_types" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners manage own overrides" ON "public"."availability_overrides" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Practitioners manage questionnaire codes" ON "public"."consultant_questionnaire_codes" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"())))) WITH CHECK (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Practitioners view consultant anamnesis_history" ON "public"."anamnesis_history" FOR SELECT USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



CREATE POLICY "Praticiens creent leurs factures" ON "public"."consultation_invoices" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens creent leurs parametres" ON "public"."practitioner_billing_settings" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens creent leurs templates" ON "public"."invoice_templates" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens modifient leurs factures" ON "public"."consultation_invoices" FOR UPDATE USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens modifient leurs parametres" ON "public"."practitioner_billing_settings" FOR UPDATE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens modifient leurs templates" ON "public"."invoice_templates" FOR UPDATE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens suppriment leurs factures brouillon" ON "public"."consultation_invoices" FOR DELETE USING ((("practitioner_id" = "auth"."uid"()) AND ("status" = 'draft'::"text")));



CREATE POLICY "Praticiens suppriment leurs templates" ON "public"."invoice_templates" FOR DELETE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens voient l historique de leurs factures" ON "public"."invoice_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."consultation_invoices"
  WHERE (("consultation_invoices"."id" = "invoice_history"."invoice_id") AND ("consultation_invoices"."practitioner_id" = "auth"."uid"())))));



CREATE POLICY "Praticiens voient leurs factures" ON "public"."consultation_invoices" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens voient leurs parametres" ON "public"."practitioner_billing_settings" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Praticiens voient leurs templates" ON "public"."invoice_templates" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "Service can insert AI logs" ON "public"."ai_generation_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role full access prescription items" ON "public"."prescription_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Super admin manage admin_profiles" ON "public"."admin_profiles" USING ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text"))) WITH CHECK ("public"."is_admin"(("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Supprimer ses blocs" ON "public"."blocks" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Supprimer ses modèles" ON "public"."templates" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Systeme cree l historique" ON "public"."invoice_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "Voir ses blocs et blocs AFEIA" ON "public"."blocks" FOR SELECT USING ((("source" = 'afeia_base'::"public"."block_source") OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "Voir ses modèles et modèles AFEIA" ON "public"."templates" FOR SELECT USING ((("source" = 'afeia_base'::"public"."block_source") OR ("owner_id" = "auth"."uid"())));



ALTER TABLE "public"."admin_allowlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "afeia_resources_select" ON "public"."educational_resources" FOR SELECT TO "authenticated" USING (((("practitioner_id" IS NULL) AND ("source" = 'afeia'::"text")) OR ("practitioner_id" = "auth"."uid"())));



ALTER TABLE "public"."ai_generation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."allergies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allergies_delete" ON "public"."allergies" FOR DELETE USING (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "allergies_insert" ON "public"."allergies" FOR INSERT WITH CHECK (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "allergies_select" ON "public"."allergies" FOR SELECT USING (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "allergies_update" ON "public"."allergies" FOR UPDATE USING (("auth"."uid"() = "practitioner_id"));



ALTER TABLE "public"."anamnese_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anamneses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anamnesis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anamnesis_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anamnesis_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anamnesis_patients" ON "public"."anamnesis" FOR SELECT USING (("patient_id" = "auth"."uid"()));



CREATE POLICY "anamnesis_practitioners" ON "public"."anamnesis" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments_delete_own" ON "public"."appointments" FOR DELETE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "appointments_insert_own" ON "public"."appointments" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "appointments_select_own" ON "public"."appointments" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "appointments_update_own" ON "public"."appointments" FOR UPDATE USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."availability_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."availability_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_connections_owner_select" ON "public"."billing_connections" FOR SELECT TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."billing_external_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."case_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complement_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_analysis_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_anamnesis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_drawings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultant_drawings_delete_own" ON "public"."consultant_drawings" FOR DELETE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_drawings_insert_own" ON "public"."consultant_drawings" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_drawings_select_own" ON "public"."consultant_drawings" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_drawings_update_own" ON "public"."consultant_drawings" FOR UPDATE USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."consultant_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_iris_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultant_iris_photos_delete" ON "public"."consultant_iris_photos" FOR DELETE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_iris_photos_insert" ON "public"."consultant_iris_photos" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_iris_photos_select" ON "public"."consultant_iris_photos" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_iris_photos_update" ON "public"."consultant_iris_photos" FOR UPDATE USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."consultant_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultant_plans_practitioner_delete" ON "public"."consultant_plans" FOR DELETE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_plans_practitioner_insert" ON "public"."consultant_plans" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_plans_practitioner_select" ON "public"."consultant_plans" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_plans_practitioner_update" ON "public"."consultant_plans" FOR UPDATE USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."consultant_questionnaire_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultant_relationships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultant_relationships_delete" ON "public"."consultant_relationships" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."consultants"
  WHERE (("consultants"."id" = "consultant_relationships"."consultant_id") AND ("consultants"."practitioner_id" = "auth"."uid"())))));



CREATE POLICY "consultant_relationships_insert" ON "public"."consultant_relationships" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."consultants"
  WHERE (("consultants"."id" = "consultant_relationships"."consultant_id") AND ("consultants"."practitioner_id" = "auth"."uid"())))));



CREATE POLICY "consultant_relationships_select" ON "public"."consultant_relationships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."consultants"
  WHERE (("consultants"."id" = "consultant_relationships"."consultant_id") AND ("consultants"."practitioner_id" = "auth"."uid"())))));



CREATE POLICY "consultant_relationships_update" ON "public"."consultant_relationships" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."consultants"
  WHERE (("consultants"."id" = "consultant_relationships"."consultant_id") AND ("consultants"."practitioner_id" = "auth"."uid"())))));



ALTER TABLE "public"."consultant_session_topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultant_session_topics_own" ON "public"."consultant_session_topics" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK ((("practitioner_id" = "auth"."uid"()) AND ("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids"))));



ALTER TABLE "public"."consultant_terrain" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultant_terrain_delete" ON "public"."consultant_terrain" FOR DELETE USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_terrain_insert" ON "public"."consultant_terrain" FOR INSERT WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_terrain_select" ON "public"."consultant_terrain" FOR SELECT USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "consultant_terrain_update" ON "public"."consultant_terrain" FOR UPDATE USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."consultants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultants_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultants_identity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultation_patients" ON "public"."consultation_notes" FOR SELECT USING (("patient_id" = "auth"."uid"()));



CREATE POLICY "consultation_practitioners" ON "public"."consultation_notes" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."consultation_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."current_treatments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "current_treatments_delete" ON "public"."current_treatments" FOR DELETE USING (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "current_treatments_insert" ON "public"."current_treatments" FOR INSERT WITH CHECK (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "current_treatments_select" ON "public"."current_treatments" FOR SELECT USING (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "current_treatments_update" ON "public"."current_treatments" FOR UPDATE USING (("auth"."uid"() = "practitioner_id"));



ALTER TABLE "public"."cycle_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cycle_entries_practitioner_all" ON "public"."cycle_entries" USING ((EXISTS ( SELECT 1
   FROM "public"."consultants" "c"
  WHERE (("c"."id" = "cycle_entries"."consultant_id") AND ("c"."practitioner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."consultants" "c"
  WHERE (("c"."id" = "cycle_entries"."consultant_id") AND ("c"."practitioner_id" = "auth"."uid"())))));



ALTER TABLE "public"."cycle_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cycle_profiles_practitioner_all" ON "public"."cycle_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."consultants" "c"
  WHERE (("c"."id" = "cycle_profiles"."consultant_id") AND ("c"."practitioner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."consultants" "c"
  WHERE (("c"."id" = "cycle_profiles"."consultant_id") AND ("c"."practitioner_id" = "auth"."uid"())))));



ALTER TABLE "public"."daily_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_activity_consultant_select" ON "public"."daily_activity" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_self_consultant_ids"() AS "auth_self_consultant_ids")));



CREATE POLICY "daily_activity_practitioner_select" ON "public"."daily_activity" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids")));



ALTER TABLE "public"."daily_journals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."educational_resource_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."educational_resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_registrations_anon_insert" ON "public"."group_session_registrations" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "group_registrations_auth_delete" ON "public"."group_session_registrations" FOR DELETE TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "group_registrations_auth_insert" ON "public"."group_session_registrations" FOR INSERT TO "authenticated" WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "group_registrations_auth_select" ON "public"."group_session_registrations" FOR SELECT TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "group_registrations_auth_update" ON "public"."group_session_registrations" FOR UPDATE TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."group_session_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_sessions_anon_select" ON "public"."group_sessions" FOR SELECT TO "anon" USING (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text"])));



CREATE POLICY "group_sessions_auth_delete" ON "public"."group_sessions" FOR DELETE TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "group_sessions_auth_insert" ON "public"."group_sessions" FOR INSERT TO "authenticated" WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "group_sessions_auth_select" ON "public"."group_sessions" FOR SELECT TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "group_sessions_auth_update" ON "public"."group_sessions" FOR UPDATE TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."hr_samples" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_samples_consultant_select" ON "public"."hr_samples" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_self_consultant_ids"() AS "auth_self_consultant_ids")));



CREATE POLICY "hr_samples_practitioner_select" ON "public"."hr_samples" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids")));



ALTER TABLE "public"."hrv_nightly" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hrv_nightly_consultant_select" ON "public"."hrv_nightly" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_self_consultant_ids"() AS "auth_self_consultant_ids")));



CREATE POLICY "hrv_nightly_practitioner_select" ON "public"."hrv_nightly" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids")));



ALTER TABLE "public"."inserted_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitations_practitioner" ON "public"."consultant_invitations" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."invoice_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_practitioner" ON "public"."invoices" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."journal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."journal_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "journal_patients" ON "public"."journal" USING (("patient_id" = "auth"."uid"()));



ALTER TABLE "public"."medical_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "medical_history_delete" ON "public"."medical_history" FOR DELETE USING (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "medical_history_insert" ON "public"."medical_history" FOR INSERT WITH CHECK (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "medical_history_select" ON "public"."medical_history" FOR SELECT USING (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "medical_history_update" ON "public"."medical_history" FOR UPDATE USING (("auth"."uid"() = "practitioner_id"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_practitioner" ON "public"."messages" USING (("consultant_id" IN ( SELECT "consultants"."id"
   FROM "public"."consultants"
  WHERE ("consultants"."practitioner_id" = "auth"."uid"()))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_practitioner" ON "public"."notifications" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "observance_items_consultant_select" ON "public"."plan_observance_items" FOR SELECT USING (("auth"."uid"() = "consultant_id"));



CREATE POLICY "observance_items_practitioner_all" ON "public"."plan_observance_items" USING (("auth"."uid"() = "practitioner_id"));



CREATE POLICY "observance_logs_consultant_all" ON "public"."plan_observance_logs" USING (("auth"."uid"() = "consultant_id"));



CREATE POLICY "observance_logs_practitioner_select" ON "public"."plan_observance_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."plan_observance_items" "poi"
  WHERE (("poi"."id" = "plan_observance_logs"."observance_item_id") AND ("poi"."practitioner_id" = "auth"."uid"())))));



ALTER TABLE "public"."otp_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "otp_codes_all" ON "public"."otp_codes" USING (true) WITH CHECK (true);



CREATE POLICY "own_anamnesis_notes" ON "public"."anamnesis_notes" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "own_consultant_goals" ON "public"."consultant_goals" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "own_practitioner_resource_favorites" ON "public"."practitioner_resource_favorites" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "own_resource_favorites" ON "public"."educational_resource_favorites" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "patient_memberships_insert_own" ON "public"."consultant_memberships" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "consultant_user_id"));



CREATE POLICY "patient_memberships_select_own" ON "public"."consultant_memberships" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "consultant_user_id"));



CREATE POLICY "patient_memberships_select_practitioner" ON "public"."consultant_memberships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."consultants"
  WHERE (("consultants"."id" = "consultant_memberships"."consultant_id") AND ("consultants"."practitioner_id" = "auth"."uid"())))));



CREATE POLICY "patient_memberships_update_practitioner" ON "public"."consultant_memberships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."consultants"
  WHERE (("consultants"."id" = "consultant_memberships"."consultant_id") AND ("consultants"."practitioner_id" = "auth"."uid"())))));



ALTER TABLE "public"."patient_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods_practitioner" ON "public"."payment_methods" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."plan_observance_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_observance_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practitioner_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practitioner_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practitioner_ai_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practitioner_assignments_delete" ON "public"."resource_assignments" FOR DELETE TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "practitioner_assignments_insert" ON "public"."resource_assignments" FOR INSERT TO "authenticated" WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "practitioner_assignments_select" ON "public"."resource_assignments" FOR SELECT TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "practitioner_assignments_update" ON "public"."resource_assignments" FOR UPDATE TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."practitioner_billing_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practitioner_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practitioner_resource_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practitioner_resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practitioner_resources_delete" ON "public"."educational_resources" FOR DELETE TO "authenticated" USING (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "practitioner_resources_delete_own" ON "public"."practitioner_resources" FOR DELETE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) AND ("source" = 'practitioner'::"text")));



CREATE POLICY "practitioner_resources_insert" ON "public"."educational_resources" FOR INSERT TO "authenticated" WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "practitioner_resources_insert_own" ON "public"."practitioner_resources" FOR INSERT TO "authenticated" WITH CHECK ((("owner_id" = "auth"."uid"()) AND ("source" = 'practitioner'::"text") AND ("review_status" = ANY (ARRAY['private'::"text", 'pending'::"text"]))));



CREATE POLICY "practitioner_resources_read" ON "public"."practitioner_resources" FOR SELECT TO "authenticated" USING ((("review_status" = 'published'::"text") OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "practitioner_resources_update" ON "public"."educational_resources" FOR UPDATE TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK (("practitioner_id" = "auth"."uid"()));



CREATE POLICY "practitioner_resources_update_own" ON "public"."practitioner_resources" FOR UPDATE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) AND ("source" = 'practitioner'::"text"))) WITH CHECK ((("owner_id" = "auth"."uid"()) AND ("source" = 'practitioner'::"text") AND ("review_status" = ANY (ARRAY['private'::"text", 'pending'::"text"]))));



ALTER TABLE "public"."practitioner_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practitioners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practitioners_own" ON "public"."practitioners" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."practitioners_public" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preliminary_questionnaires" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preliminary_questionnaires_read" ON "public"."preliminary_questionnaires" FOR SELECT USING (("naturopath_id" = "auth"."uid"()));



CREATE POLICY "preliminary_questionnaires_submit" ON "public"."preliminary_questionnaires" FOR INSERT WITH CHECK (true);



CREATE POLICY "preliminary_questionnaires_update" ON "public"."preliminary_questionnaires" FOR UPDATE USING (("naturopath_id" = "auth"."uid"()));



ALTER TABLE "public"."prescription_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questionnaire_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questionnaire_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questionnaire_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sleep_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sleep_sessions_consultant_select" ON "public"."sleep_sessions" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_self_consultant_ids"() AS "auth_self_consultant_ids")));



CREATE POLICY "sleep_sessions_practitioner_select" ON "public"."sleep_sessions" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids")));



ALTER TABLE "public"."stripe_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_plans_read" ON "public"."subscription_plans" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_practitioner" ON "public"."subscriptions" USING (("practitioner_id" = "auth"."uid"()));



ALTER TABLE "public"."supplement_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wearable_connections_consultant_select" ON "public"."wearable_connections" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "m"."consultant_id"
   FROM "public"."consultant_memberships" "m"
  WHERE ("m"."consultant_user_id" = "auth"."uid"()))));



CREATE POLICY "wearable_connections_practitioner_select" ON "public"."wearable_connections" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."consultants" "c"
  WHERE (("c"."id" = "wearable_connections"."consultant_id") AND ("c"."practitioner_id" = "auth"."uid"())))));



ALTER TABLE "public"."wearable_consents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wearable_consents_practitioner_select" ON "public"."wearable_consents" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids")));



CREATE POLICY "wearable_consents_self_insert" ON "public"."wearable_consents" FOR INSERT TO "authenticated" WITH CHECK ((("consultant_id" IN ( SELECT "public"."auth_self_consultant_ids"() AS "auth_self_consultant_ids")) AND ("withdrawn_at" IS NULL)));



CREATE POLICY "wearable_consents_self_select" ON "public"."wearable_consents" FOR SELECT TO "authenticated" USING (("consultant_id" IN ( SELECT "public"."auth_self_consultant_ids"() AS "auth_self_consultant_ids")));



ALTER TABLE "public"."wearable_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_oauth_states" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wearable_patients" ON "public"."wearable_data" USING (("consultant_id" = "auth"."uid"()));



ALTER TABLE "public"."wearable_raw" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wearable_recap_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wearable_recap_settings_own" ON "public"."wearable_recap_settings" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK ((("practitioner_id" = "auth"."uid"()) AND ("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids"))));



ALTER TABLE "public"."wearable_recaps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wearable_recaps_own" ON "public"."wearable_recaps" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK ((("practitioner_id" = "auth"."uid"()) AND ("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids"))));



ALTER TABLE "public"."wearable_signal_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wearable_signal_reviews_own" ON "public"."wearable_signal_reviews" TO "authenticated" USING (("practitioner_id" = "auth"."uid"())) WITH CHECK ((("practitioner_id" = "auth"."uid"()) AND ("consultant_id" IN ( SELECT "public"."auth_practitioner_consultant_ids"() AS "auth_practitioner_consultant_ids"))));



ALTER TABLE "public"."wearable_summaries" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."admin_trigger_circular_sync"("patient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_trigger_circular_sync"("patient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_trigger_circular_sync"("patient_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_invoice_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_invoice_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_invoice_number"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_practitioner_consultant_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_practitioner_consultant_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_practitioner_consultant_ids"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_self_consultant_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_self_consultant_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_self_consultant_ids"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."billing_connections_delete_secret"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."billing_connections_delete_secret"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."billing_get_api_key"("p_practitioner_id" "uuid", "p_provider" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."billing_get_api_key"("p_practitioner_id" "uuid", "p_provider" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."billing_revoke_connection"("p_practitioner_id" "uuid", "p_provider" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."billing_revoke_connection"("p_practitioner_id" "uuid", "p_provider" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."billing_save_connection"("p_practitioner_id" "uuid", "p_provider" "text", "p_api_key" "text", "p_account_label" "text", "p_vat_mode" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."billing_save_connection"("p_practitioner_id" "uuid", "p_provider" "text", "p_api_key" "text", "p_account_label" "text", "p_vat_mode" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."book_appointment"("p_practitioner_id" "uuid", "p_consultation_type_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_booking_name" "text", "p_booking_email" "text", "p_booking_phone" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."book_appointment"("p_practitioner_id" "uuid", "p_consultation_type_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_booking_name" "text", "p_booking_email" "text", "p_booking_phone" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."book_appointment"("p_practitioner_id" "uuid", "p_consultation_type_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_booking_name" "text", "p_booking_email" "text", "p_booking_phone" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_patient_invite"("token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_patient_invite"("token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_patient_invite"("token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_otp_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_otp_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_otp_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_consultant_from_questionnaire"("p_questionnaire_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_consultant_from_questionnaire"("p_questionnaire_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_consultant_from_questionnaire"("p_questionnaire_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_patient_membership_ultimate"("p_patient_id" "uuid", "p_patient_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_patient_membership_ultimate"("p_patient_id" "uuid", "p_patient_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_patient_membership_ultimate"("p_patient_id" "uuid", "p_patient_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_expired_otp_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_expired_otp_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_expired_otp_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_activation_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_activation_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_activation_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_anamnesis_history"("p_consultant_id" "uuid", "p_section" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_anamnesis_history"("p_consultant_id" "uuid", "p_section" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_anamnesis_history"("p_consultant_id" "uuid", "p_section" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_session_registration_count"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_session_registration_count"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_session_registration_count"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_invoice_number"("p_practitioner_id" "uuid", "p_annee_fiscale" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_invoice_number"("p_practitioner_id" "uuid", "p_annee_fiscale" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_invoice_number"("p_practitioner_id" "uuid", "p_annee_fiscale" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_preliminary_questionnaires"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_preliminary_questionnaires"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_preliminary_questionnaires"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_practitioners"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_practitioners"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_practitioners"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_practitioner"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_practitioner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_practitioner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_preliminary_questionnaire_on_patient_create"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_preliminary_questionnaire_on_patient_create"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_preliminary_questionnaire_on_patient_create"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_invoice_action"("p_invoice_id" "uuid", "p_action" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_invoice_action"("p_invoice_id" "uuid", "p_action" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_invoice_action"("p_invoice_id" "uuid", "p_action" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_preliminary_questionnaire"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_preliminary_questionnaire"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_preliminary_questionnaire"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_patient_practitioner_reassign"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_patient_practitioner_reassign"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_patient_practitioner_reassign"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_practitioner_account_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_practitioner_account_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_practitioner_account_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_consultant_plans_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_consultant_plans_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_consultant_plans_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_preliminary_questionnaire"("p_naturopath_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_responses" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_preliminary_questionnaire"("p_naturopath_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_responses" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_preliminary_questionnaire"("p_naturopath_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_responses" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_message_content"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_message_content"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_message_content"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_anamnesis_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_anamnesis_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_anamnesis_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_consultant_iris_photos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_consultant_iris_photos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_consultant_iris_photos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_consultant_terrain_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_consultant_terrain_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_consultant_terrain_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_educational_resources_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_educational_resources_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_educational_resources_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_claim_backfill"("p_connection_id" "uuid", "p_stale_after" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_claim_backfill"("p_connection_id" "uuid", "p_stale_after" interval) TO "service_role";



GRANT ALL ON TABLE "public"."wearable_events" TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_claim_event"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_claim_event"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_connections_delete_secret"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_connections_delete_secret"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_daily_summary"("p_consultant_id" "uuid", "p_days" integer, "p_today" "date", "p_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_daily_summary"("p_consultant_id" "uuid", "p_days" integer, "p_today" "date", "p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wearable_daily_summary"("p_consultant_id" "uuid", "p_days" integer, "p_today" "date", "p_timezone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_disconnect"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_delete_data" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_disconnect"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_delete_data" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_finish_event"("p_id" "uuid", "p_status" "public"."wearable_event_status", "p_error" "text", "p_retry_at" timestamp with time zone, "p_consultant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_finish_event"("p_id" "uuid", "p_status" "public"."wearable_event_status", "p_error" "text", "p_retry_at" timestamp with time zone, "p_consultant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_get_access_token"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_get_access_token"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_record_event"("p_provider" "public"."wearable_provider", "p_event_type" "text", "p_provider_user_id" "text", "p_event_date" "date", "p_resource_url" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_next_attempt_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_record_event"("p_provider" "public"."wearable_provider", "p_event_type" "text", "p_provider_user_id" "text", "p_event_date" "date", "p_resource_url" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_next_attempt_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_requeue_due_events"("p_max_attempts" integer, "p_stale_after" interval, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_requeue_due_events"("p_max_attempts" integer, "p_stale_after" interval, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_revoke_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_revoke_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider") TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_save_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_provider_user_id" "text", "p_access_token" "text", "p_token_expires_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_save_connection"("p_consultant_id" "uuid", "p_provider" "public"."wearable_provider", "p_provider_user_id" "text", "p_access_token" "text", "p_token_expires_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."wearable_truncate_normalized"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wearable_truncate_normalized"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_allowlist" TO "anon";
GRANT ALL ON TABLE "public"."admin_allowlist" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_allowlist" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_profiles" TO "anon";
GRANT ALL ON TABLE "public"."admin_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ai_generation_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_generation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_generation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."allergies" TO "anon";
GRANT ALL ON TABLE "public"."allergies" TO "authenticated";
GRANT ALL ON TABLE "public"."allergies" TO "service_role";



GRANT ALL ON TABLE "public"."anamnese_instances" TO "anon";
GRANT ALL ON TABLE "public"."anamnese_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."anamnese_instances" TO "service_role";



GRANT ALL ON TABLE "public"."anamneses" TO "anon";
GRANT ALL ON TABLE "public"."anamneses" TO "authenticated";
GRANT ALL ON TABLE "public"."anamneses" TO "service_role";



GRANT ALL ON TABLE "public"."anamnesis" TO "anon";
GRANT ALL ON TABLE "public"."anamnesis" TO "authenticated";
GRANT ALL ON TABLE "public"."anamnesis" TO "service_role";



GRANT ALL ON TABLE "public"."anamnesis_history" TO "anon";
GRANT ALL ON TABLE "public"."anamnesis_history" TO "authenticated";
GRANT ALL ON TABLE "public"."anamnesis_history" TO "service_role";



GRANT ALL ON TABLE "public"."anamnesis_notes" TO "anon";
GRANT ALL ON TABLE "public"."anamnesis_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."anamnesis_notes" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."availability_overrides" TO "anon";
GRANT ALL ON TABLE "public"."availability_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."availability_schedules" TO "anon";
GRANT ALL ON TABLE "public"."availability_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."billing_connections" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("practitioner_id") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("provider") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("account_label") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("vat_mode") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("last_error") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("connected_at") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT SELECT("last_used_at") ON TABLE "public"."billing_connections" TO "authenticated";



GRANT ALL ON TABLE "public"."billing_external_customers" TO "service_role";



GRANT ALL ON TABLE "public"."billing_history" TO "anon";
GRANT ALL ON TABLE "public"."billing_history" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_history" TO "service_role";



GRANT ALL ON TABLE "public"."blocks" TO "anon";
GRANT ALL ON TABLE "public"."blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."blocks" TO "service_role";



GRANT ALL ON TABLE "public"."care_plans" TO "anon";
GRANT ALL ON TABLE "public"."care_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."care_plans" TO "service_role";



GRANT ALL ON TABLE "public"."case_files" TO "anon";
GRANT ALL ON TABLE "public"."case_files" TO "authenticated";
GRANT ALL ON TABLE "public"."case_files" TO "service_role";



GRANT ALL ON TABLE "public"."complement_tracking" TO "anon";
GRANT ALL ON TABLE "public"."complement_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."complement_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."complements" TO "anon";
GRANT ALL ON TABLE "public"."complements" TO "authenticated";
GRANT ALL ON TABLE "public"."complements" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_analysis_results" TO "anon";
GRANT ALL ON TABLE "public"."consultant_analysis_results" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_analysis_results" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_anamnesis" TO "anon";
GRANT ALL ON TABLE "public"."consultant_anamnesis" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_anamnesis" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_drawings" TO "anon";
GRANT ALL ON TABLE "public"."consultant_drawings" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_drawings" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_goals" TO "anon";
GRANT ALL ON TABLE "public"."consultant_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_goals" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_invitations" TO "anon";
GRANT ALL ON TABLE "public"."consultant_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_invites" TO "anon";
GRANT ALL ON TABLE "public"."consultant_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_invites" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_iris_photos" TO "anon";
GRANT ALL ON TABLE "public"."consultant_iris_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_iris_photos" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_memberships" TO "anon";
GRANT ALL ON TABLE "public"."consultant_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_plans" TO "anon";
GRANT ALL ON TABLE "public"."consultant_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_plans" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_questionnaire_codes" TO "anon";
GRANT ALL ON TABLE "public"."consultant_questionnaire_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_questionnaire_codes" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_relationships" TO "anon";
GRANT ALL ON TABLE "public"."consultant_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_session_topics" TO "anon";
GRANT ALL ON TABLE "public"."consultant_session_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_session_topics" TO "service_role";



GRANT ALL ON TABLE "public"."consultant_terrain" TO "anon";
GRANT ALL ON TABLE "public"."consultant_terrain" TO "authenticated";
GRANT ALL ON TABLE "public"."consultant_terrain" TO "service_role";



GRANT ALL ON TABLE "public"."consultants" TO "anon";
GRANT ALL ON TABLE "public"."consultants" TO "authenticated";
GRANT ALL ON TABLE "public"."consultants" TO "service_role";



GRANT ALL ON TABLE "public"."consultants_health" TO "anon";
GRANT ALL ON TABLE "public"."consultants_health" TO "authenticated";
GRANT ALL ON TABLE "public"."consultants_health" TO "service_role";



GRANT ALL ON TABLE "public"."consultants_identity" TO "anon";
GRANT ALL ON TABLE "public"."consultants_identity" TO "authenticated";
GRANT ALL ON TABLE "public"."consultants_identity" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_invoices" TO "anon";
GRANT ALL ON TABLE "public"."consultation_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."consultation_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_notes" TO "anon";
GRANT ALL ON TABLE "public"."consultation_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."consultation_notes" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_types" TO "anon";
GRANT ALL ON TABLE "public"."consultation_types" TO "authenticated";
GRANT ALL ON TABLE "public"."consultation_types" TO "service_role";



GRANT ALL ON TABLE "public"."consultations" TO "anon";
GRANT ALL ON TABLE "public"."consultations" TO "authenticated";
GRANT ALL ON TABLE "public"."consultations" TO "service_role";



GRANT ALL ON TABLE "public"."current_treatments" TO "anon";
GRANT ALL ON TABLE "public"."current_treatments" TO "authenticated";
GRANT ALL ON TABLE "public"."current_treatments" TO "service_role";



GRANT ALL ON TABLE "public"."cycle_entries" TO "anon";
GRANT ALL ON TABLE "public"."cycle_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."cycle_entries" TO "service_role";



GRANT ALL ON TABLE "public"."cycle_profiles" TO "anon";
GRANT ALL ON TABLE "public"."cycle_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."cycle_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."daily_activity" TO "service_role";
GRANT SELECT ON TABLE "public"."daily_activity" TO "authenticated";



GRANT ALL ON TABLE "public"."daily_journals" TO "anon";
GRANT ALL ON TABLE "public"."daily_journals" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_journals" TO "service_role";



GRANT ALL ON TABLE "public"."daily_logs" TO "anon";
GRANT ALL ON TABLE "public"."daily_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_logs" TO "service_role";



GRANT ALL ON TABLE "public"."educational_resource_favorites" TO "anon";
GRANT ALL ON TABLE "public"."educational_resource_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."educational_resource_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."educational_resources" TO "anon";
GRANT ALL ON TABLE "public"."educational_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."educational_resources" TO "service_role";



GRANT ALL ON TABLE "public"."group_session_registrations" TO "anon";
GRANT ALL ON TABLE "public"."group_session_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."group_session_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."group_sessions" TO "anon";
GRANT ALL ON TABLE "public"."group_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."group_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."hr_samples" TO "service_role";
GRANT SELECT ON TABLE "public"."hr_samples" TO "authenticated";



GRANT ALL ON TABLE "public"."hrv_nightly" TO "service_role";
GRANT SELECT ON TABLE "public"."hrv_nightly" TO "authenticated";



GRANT ALL ON TABLE "public"."inserted_blocks" TO "anon";
GRANT ALL ON TABLE "public"."inserted_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."inserted_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_history" TO "anon";
GRANT ALL ON TABLE "public"."invoice_history" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_history" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_templates" TO "anon";
GRANT ALL ON TABLE "public"."invoice_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_templates" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."journal" TO "anon";
GRANT ALL ON TABLE "public"."journal" TO "authenticated";
GRANT ALL ON TABLE "public"."journal" TO "service_role";



GRANT ALL ON TABLE "public"."journal_entries" TO "anon";
GRANT ALL ON TABLE "public"."journal_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_entries" TO "service_role";



GRANT ALL ON TABLE "public"."medical_history" TO "anon";
GRANT ALL ON TABLE "public"."medical_history" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_history" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."patient_profiles" TO "anon";
GRANT ALL ON TABLE "public"."patient_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."plan_observance_items" TO "anon";
GRANT ALL ON TABLE "public"."plan_observance_items" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_observance_items" TO "service_role";



GRANT ALL ON TABLE "public"."plan_observance_logs" TO "anon";
GRANT ALL ON TABLE "public"."plan_observance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_observance_logs" TO "service_role";



GRANT ALL ON TABLE "public"."plan_sections" TO "anon";
GRANT ALL ON TABLE "public"."plan_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_sections" TO "service_role";



GRANT ALL ON TABLE "public"."plan_versions" TO "anon";
GRANT ALL ON TABLE "public"."plan_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_versions" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_actions" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_actions" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_ai_profiles" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_ai_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_ai_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_billing_settings" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_billing_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_billing_settings" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_notes" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_notes" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_resource_favorites" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_resource_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_resource_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_resources" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_resources" TO "service_role";



GRANT ALL ON TABLE "public"."practitioner_verifications" TO "anon";
GRANT ALL ON TABLE "public"."practitioner_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioner_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."practitioners" TO "anon";
GRANT ALL ON TABLE "public"."practitioners" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioners" TO "service_role";



GRANT ALL ON TABLE "public"."practitioners_public" TO "anon";
GRANT ALL ON TABLE "public"."practitioners_public" TO "authenticated";
GRANT ALL ON TABLE "public"."practitioners_public" TO "service_role";



GRANT ALL ON TABLE "public"."preliminary_questionnaires" TO "anon";
GRANT ALL ON TABLE "public"."preliminary_questionnaires" TO "authenticated";
GRANT ALL ON TABLE "public"."preliminary_questionnaires" TO "service_role";



GRANT ALL ON TABLE "public"."prescription_items" TO "anon";
GRANT ALL ON TABLE "public"."prescription_items" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_items" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_questions" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_questions" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_sections" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_sections" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_versions" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_versions" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations" TO "anon";
GRANT ALL ON TABLE "public"."recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."resource_assignments" TO "anon";
GRANT ALL ON TABLE "public"."resource_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."sleep_sessions" TO "service_role";
GRANT SELECT ON TABLE "public"."sleep_sessions" TO "authenticated";



GRANT ALL ON TABLE "public"."stripe_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."stripe_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."supplement_items" TO "anon";
GRANT ALL ON TABLE "public"."supplement_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplement_items" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_connections" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("consultant_id") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("provider") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("token_expires_at") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("connected_at") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("last_sync_at") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("last_error") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("backfill_status") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("backfill_cursor") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT SELECT("interrupted_at") ON TABLE "public"."wearable_connections" TO "authenticated";



GRANT ALL ON TABLE "public"."wearable_connection_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."wearable_connection_overview" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_consents" TO "service_role";
GRANT SELECT ON TABLE "public"."wearable_consents" TO "authenticated";



GRANT INSERT("consultant_id") ON TABLE "public"."wearable_consents" TO "authenticated";



GRANT INSERT("text_version") ON TABLE "public"."wearable_consents" TO "authenticated";



GRANT ALL ON TABLE "public"."wearable_data" TO "anon";
GRANT ALL ON TABLE "public"."wearable_data" TO "authenticated";
GRANT ALL ON TABLE "public"."wearable_data" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_insights" TO "anon";
GRANT ALL ON TABLE "public"."wearable_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."wearable_insights" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_oauth_states" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_raw" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_recap_settings" TO "anon";
GRANT ALL ON TABLE "public"."wearable_recap_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."wearable_recap_settings" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_recaps" TO "anon";
GRANT ALL ON TABLE "public"."wearable_recaps" TO "authenticated";
GRANT ALL ON TABLE "public"."wearable_recaps" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_signal_reviews" TO "anon";
GRANT ALL ON TABLE "public"."wearable_signal_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."wearable_signal_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."wearable_summaries" TO "anon";
GRANT ALL ON TABLE "public"."wearable_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."wearable_summaries" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































