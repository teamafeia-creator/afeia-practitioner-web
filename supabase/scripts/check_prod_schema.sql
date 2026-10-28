-- =============================================================================
-- check_prod_schema.sql
-- Vérifie que les objets créés par les migrations datées >= 20260213 existent
-- bien en base. LECTURE SEULE : ce script ne modifie rien.
--
-- Usage : coller dans le SQL Editor Supabase et exécuter.
-- Résultat : une ligne par objet MANQUANT (ou obsolète). Aucun résultat = schéma à jour.
--
-- Colonnes de sortie :
--   migration  : fichier de supabase/migrations/ à appliquer
--   kind       : table | column | function | function_outdated | column_rename
--   object     : objet concerné
--
-- Pour regénérer la liste après ajout d'une migration, mettre à jour les
-- blocs VALUES ci-dessous.
-- =============================================================================

WITH expected_tables (migration, table_name) AS (
  VALUES
    ('20260213000000_group_sessions', 'group_sessions'),
    ('20260213000000_group_sessions', 'group_session_registrations'),
    ('20260213_consultant_drawings', 'consultant_drawings'),
    ('20260213_medical_record_enrichment', 'medical_history'),
    ('20260213_medical_record_enrichment', 'allergies'),
    ('20260213_medical_record_enrichment', 'current_treatments'),
    ('20260213_medical_record_enrichment', 'consultant_relationships'),
    ('20260213_waitlist', 'waitlist_entries'),
    ('20260215_consultant_terrain', 'consultant_terrain'),
    ('20260215_consultant_terrain', 'consultant_iris_photos'),
    ('20260215_cycle_tracking', 'cycle_profiles'),
    ('20260215_cycle_tracking', 'cycle_entries'),
    ('20260215_educational_resources', 'educational_resources'),
    ('20260215_educational_resources', 'resource_assignments'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs')
),
expected_columns (migration, table_name, column_name) AS (
  VALUES
    ('20260213000000_group_sessions', 'group_sessions', 'id'),
    ('20260213000000_group_sessions', 'group_sessions', 'practitioner_id'),
    ('20260213000000_group_sessions', 'group_sessions', 'consultation_type_id'),
    ('20260213000000_group_sessions', 'group_sessions', 'title'),
    ('20260213000000_group_sessions', 'group_sessions', 'description'),
    ('20260213000000_group_sessions', 'group_sessions', 'starts_at'),
    ('20260213000000_group_sessions', 'group_sessions', 'ends_at'),
    ('20260213000000_group_sessions', 'group_sessions', 'location_type'),
    ('20260213000000_group_sessions', 'group_sessions', 'location_details'),
    ('20260213000000_group_sessions', 'group_sessions', 'max_participants'),
    ('20260213000000_group_sessions', 'group_sessions', 'status'),
    ('20260213000000_group_sessions', 'group_sessions', 'notes_internal'),
    ('20260213000000_group_sessions', 'group_sessions', 'cancellation_reason'),
    ('20260213000000_group_sessions', 'group_sessions', 'cancelled_at'),
    ('20260213000000_group_sessions', 'group_sessions', 'created_at'),
    ('20260213000000_group_sessions', 'group_sessions', 'updated_at'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'id'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'group_session_id'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'consultant_id'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'practitioner_id'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'name'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'email'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'phone'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'status'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'registered_at'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'cancelled_at'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'source'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'notes'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'created_at'),
    ('20260213000000_group_sessions', 'group_session_registrations', 'updated_at'),
    ('20260213000000_group_sessions', 'consultation_types', 'is_group'),
    ('20260213000000_group_sessions', 'consultation_types', 'max_participants'),
    ('20260213000000_group_sessions', 'consultation_types', 'price_per_participant'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'id'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'consultant_id'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'practitioner_id'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'title'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'template_type'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'excalidraw_data'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'snapshot_path'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'appointment_id'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'version'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'notes'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'created_at'),
    ('20260213_consultant_drawings', 'consultant_drawings', 'updated_at'),
    ('20260213_medical_record_enrichment', 'medical_history', 'id'),
    ('20260213_medical_record_enrichment', 'medical_history', 'consultant_id'),
    ('20260213_medical_record_enrichment', 'medical_history', 'practitioner_id'),
    ('20260213_medical_record_enrichment', 'medical_history', 'category'),
    ('20260213_medical_record_enrichment', 'medical_history', 'description'),
    ('20260213_medical_record_enrichment', 'medical_history', 'year_onset'),
    ('20260213_medical_record_enrichment', 'medical_history', 'is_active'),
    ('20260213_medical_record_enrichment', 'medical_history', 'notes'),
    ('20260213_medical_record_enrichment', 'medical_history', 'created_at'),
    ('20260213_medical_record_enrichment', 'medical_history', 'updated_at'),
    ('20260213_medical_record_enrichment', 'allergies', 'id'),
    ('20260213_medical_record_enrichment', 'allergies', 'consultant_id'),
    ('20260213_medical_record_enrichment', 'allergies', 'practitioner_id'),
    ('20260213_medical_record_enrichment', 'allergies', 'type'),
    ('20260213_medical_record_enrichment', 'allergies', 'substance'),
    ('20260213_medical_record_enrichment', 'allergies', 'severity'),
    ('20260213_medical_record_enrichment', 'allergies', 'reaction'),
    ('20260213_medical_record_enrichment', 'allergies', 'diagnosed'),
    ('20260213_medical_record_enrichment', 'allergies', 'notes'),
    ('20260213_medical_record_enrichment', 'allergies', 'created_at'),
    ('20260213_medical_record_enrichment', 'allergies', 'updated_at'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'id'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'consultant_id'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'practitioner_id'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'name'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'dosage'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'prescriber'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'start_date'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'is_active'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'notes'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'created_at'),
    ('20260213_medical_record_enrichment', 'current_treatments', 'updated_at'),
    ('20260213_medical_record_enrichment', 'consultant_relationships', 'id'),
    ('20260213_medical_record_enrichment', 'consultant_relationships', 'consultant_id'),
    ('20260213_medical_record_enrichment', 'consultant_relationships', 'related_consultant_id'),
    ('20260213_medical_record_enrichment', 'consultant_relationships', 'relationship_type'),
    ('20260213_medical_record_enrichment', 'consultant_relationships', 'label'),
    ('20260213_medical_record_enrichment', 'consultant_relationships', 'created_at'),
    ('20260213_medical_record_enrichment', 'consultants', 'date_of_birth'),
    ('20260213_medical_record_enrichment', 'consultants', 'gender'),
    ('20260213_medical_record_enrichment', 'consultants', 'address_line1'),
    ('20260213_medical_record_enrichment', 'consultants', 'address_line2'),
    ('20260213_medical_record_enrichment', 'consultants', 'postal_code'),
    ('20260213_medical_record_enrichment', 'consultants', 'profession'),
    ('20260213_medical_record_enrichment', 'consultants', 'referring_doctor_name'),
    ('20260213_medical_record_enrichment', 'consultants', 'referring_doctor_phone'),
    ('20260213_medical_record_enrichment', 'consultants', 'emergency_contact_name'),
    ('20260213_medical_record_enrichment', 'consultants', 'emergency_contact_phone'),
    ('20260213_medical_record_enrichment', 'consultants', 'emergency_contact_relation'),
    ('20260213_video_conferencing', 'practitioners', 'video_provider'),
    ('20260213_video_conferencing', 'practitioners', 'daily_api_key'),
    ('20260213_video_conferencing', 'appointments', 'video_room_name'),
    ('20260213_waitlist', 'waitlist_entries', 'id'),
    ('20260213_waitlist', 'waitlist_entries', 'practitioner_id'),
    ('20260213_waitlist', 'waitlist_entries', 'consultation_type_id'),
    ('20260213_waitlist', 'waitlist_entries', 'email'),
    ('20260213_waitlist', 'waitlist_entries', 'first_name'),
    ('20260213_waitlist', 'waitlist_entries', 'phone'),
    ('20260213_waitlist', 'waitlist_entries', 'preferred_time_of_day'),
    ('20260213_waitlist', 'waitlist_entries', 'preferred_days'),
    ('20260213_waitlist', 'waitlist_entries', 'notified_at'),
    ('20260213_waitlist', 'waitlist_entries', 'notified_for_slot'),
    ('20260213_waitlist', 'waitlist_entries', 'fulfilled_at'),
    ('20260213_waitlist', 'waitlist_entries', 'expires_at'),
    ('20260213_waitlist', 'waitlist_entries', 'created_at'),
    ('20260213_waitlist', 'practitioners', 'waitlist_enabled'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'id'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'consultant_id'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'practitioner_id'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'constitution'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'constitution_secondary'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'temperament_description'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'temperament_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'diathese_menetrier'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'diathese_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'diathese_date'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'surcharge_acides'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'surcharge_colles'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'surcharge_cristaux'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'surcharges_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_foie'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_foie_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_intestins'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_intestins_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_reins'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_reins_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_peau'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_peau_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_poumons'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'emunctoire_poumons_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'force_vitale'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'force_vitale_notes'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'bilan_date'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'created_at'),
    ('20260215_consultant_terrain', 'consultant_terrain', 'updated_at'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'id'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'consultant_id'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'practitioner_id'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'eye'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'photo_path'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'thumbnail_path'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'annotations'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'notes'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'taken_at'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'created_at'),
    ('20260215_consultant_terrain', 'consultant_iris_photos', 'updated_at'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'id'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'consultant_id'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'practitioner_id'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'is_tracking'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'average_cycle_length'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'average_period_length'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'cycle_regularity'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'contraception'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'notes'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'created_at'),
    ('20260215_cycle_tracking', 'cycle_profiles', 'updated_at'),
    ('20260215_cycle_tracking', 'cycle_entries', 'id'),
    ('20260215_cycle_tracking', 'cycle_entries', 'consultant_id'),
    ('20260215_cycle_tracking', 'cycle_entries', 'date'),
    ('20260215_cycle_tracking', 'cycle_entries', 'is_period'),
    ('20260215_cycle_tracking', 'cycle_entries', 'flow_intensity'),
    ('20260215_cycle_tracking', 'cycle_entries', 'period_pain'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_cramps'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_bloating'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_headache'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_breast_tenderness'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_mood_swings'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_fatigue'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_acne'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_cravings'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_insomnia'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_water_retention'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_back_pain'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_nausea'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_libido_high'),
    ('20260215_cycle_tracking', 'cycle_entries', 'symptom_cervical_mucus'),
    ('20260215_cycle_tracking', 'cycle_entries', 'temperature'),
    ('20260215_cycle_tracking', 'cycle_entries', 'notes'),
    ('20260215_cycle_tracking', 'cycle_entries', 'source'),
    ('20260215_cycle_tracking', 'cycle_entries', 'created_at'),
    ('20260215_educational_resources', 'educational_resources', 'id'),
    ('20260215_educational_resources', 'educational_resources', 'practitioner_id'),
    ('20260215_educational_resources', 'educational_resources', 'title'),
    ('20260215_educational_resources', 'educational_resources', 'slug'),
    ('20260215_educational_resources', 'educational_resources', 'summary'),
    ('20260215_educational_resources', 'educational_resources', 'content_type'),
    ('20260215_educational_resources', 'educational_resources', 'content_markdown'),
    ('20260215_educational_resources', 'educational_resources', 'file_path'),
    ('20260215_educational_resources', 'educational_resources', 'file_name'),
    ('20260215_educational_resources', 'educational_resources', 'video_url'),
    ('20260215_educational_resources', 'educational_resources', 'thumbnail_path'),
    ('20260215_educational_resources', 'educational_resources', 'category'),
    ('20260215_educational_resources', 'educational_resources', 'tags'),
    ('20260215_educational_resources', 'educational_resources', 'source'),
    ('20260215_educational_resources', 'educational_resources', 'is_published'),
    ('20260215_educational_resources', 'educational_resources', 'read_time_minutes'),
    ('20260215_educational_resources', 'educational_resources', 'created_at'),
    ('20260215_educational_resources', 'educational_resources', 'updated_at'),
    ('20260215_educational_resources', 'resource_assignments', 'id'),
    ('20260215_educational_resources', 'resource_assignments', 'resource_id'),
    ('20260215_educational_resources', 'resource_assignments', 'consultant_id'),
    ('20260215_educational_resources', 'resource_assignments', 'practitioner_id'),
    ('20260215_educational_resources', 'resource_assignments', 'consultant_plan_id'),
    ('20260215_educational_resources', 'resource_assignments', 'plan_section_key'),
    ('20260215_educational_resources', 'resource_assignments', 'message'),
    ('20260215_educational_resources', 'resource_assignments', 'read_at'),
    ('20260215_educational_resources', 'resource_assignments', 'sent_at'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'id'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'consultant_id'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'practitioner_id'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'label'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'category'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'value_type'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'unit'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'target_value'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'source_plan_id'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'sort_order'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'is_active'),
    ('20260215_journal_enrichi_observance', 'consultant_journal_indicators', 'created_at'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'id'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'consultant_plan_id'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'practitioner_id'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'consultant_id'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'label'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'category'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'frequency'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'weekly_target'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'sort_order'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'is_active'),
    ('20260215_journal_enrichi_observance', 'plan_observance_items', 'created_at'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs', 'id'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs', 'observance_item_id'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs', 'consultant_id'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs', 'date'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs', 'done'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs', 'notes'),
    ('20260215_journal_enrichi_observance', 'plan_observance_logs', 'created_at'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'practitioner_id'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'sleep_quality'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'stress_level'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'energy_level'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'bristol_type'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'bristol_frequency'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'transit_notes'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'hydration_liters'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'hydration_type'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'hydration_notes'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'exercise_type'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'exercise_duration_minutes'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'exercise_intensity'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'exercise_notes'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'custom_indicators'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'source'),
    ('20260215_journal_enrichi_observance', 'journal_entries', 'updated_at'),
    ('20260216_add_is_demo_column', 'consultants', 'is_demo'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'first_name'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'last_name'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'photo_url'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'specialties'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'siret'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'adeli_number'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'formations'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'years_experience'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'cabinet_address'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'professional_phone'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'website'),
    ('20260216_expand_practitioner_profile', 'practitioners', 'bio')
),
expected_functions (migration, signature, check_outdated) AS (
  VALUES
    ('20260213000000_group_sessions',           'public.get_group_session_registration_count(uuid)', false),
    ('20260213_medical_record_enrichment',      'public.set_updated_at()', false),
    ('20260215_consultant_terrain',             'public.update_consultant_terrain_updated_at()', false),
    ('20260215_consultant_terrain',             'public.update_consultant_iris_photos_updated_at()', false),
    ('20260215_educational_resources',          'public.update_educational_resources_updated_at()', false),
    ('20260215_fix_questionnaire_functions',    'public.create_consultant_from_questionnaire(uuid)', true),
    ('20260215_fix_questionnaire_functions',    'public.get_preliminary_questionnaires(text, integer, integer)', true),
    ('20260215_fix_questionnaire_functions',    'public.get_anamnesis_history(uuid, text, integer)', true),
    ('20260215_fix_questionnaire_functions',    'public.link_preliminary_questionnaire_on_patient_create()', true),
    ('20260215_fix_questionnaire_functions',    'public.track_anamnesis_changes()', true),
    ('20260215_fix_questionnaire_functions',    'public.notify_new_preliminary_questionnaire()', true),
    ('20260217_fix_book_appointment_rpc',       'public.book_appointment(uuid, uuid, timestamptz, timestamptz, text, text, text, text)', true)
),
missing AS (
  -- Tables manquantes
  SELECT et.migration, 'table'::text AS kind, et.table_name::text AS object
  FROM expected_tables et
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = et.table_name
  )

  UNION ALL

  -- Colonnes manquantes (si la table elle-même manque, seule la table est signalée)
  SELECT ec.migration, 'column', ec.table_name || '.' || ec.column_name
  FROM expected_columns ec
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = ec.table_name
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = ec.table_name
      AND c.column_name = ec.column_name
  )

  UNION ALL

  -- Renommage consultant_memberships.patient_id -> consultant_id
  SELECT '20260215_fix_consultant_memberships_column', 'column_rename',
         'consultant_memberships.patient_id -> consultant_id'
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'consultant_memberships'
      AND c.column_name = 'patient_id'
  )

  UNION ALL

  -- Fonctions / RPC manquantes
  SELECT ef.migration, 'function', ef.signature
  FROM expected_functions ef
  WHERE to_regprocedure(ef.signature) IS NULL

  UNION ALL

  -- Fonctions présentes mais encore dans l'ancienne version (patient_* au lieu de consultant_*)
  SELECT ef.migration, 'function_outdated', ef.signature || ' référence encore patient(s)/patient_id'
  FROM expected_functions ef
  JOIN pg_proc p ON p.oid = to_regprocedure(ef.signature)
  WHERE ef.check_outdated
    -- commentaires SQL retirés pour éviter les faux positifs (« au lieu de patient_id »)
    AND regexp_replace(p.prosrc, '--[^\n]*', '', 'g') ~ '\m(patients|patient_id|patient_anamnesis)\M'
)
SELECT migration, kind, object
FROM missing
ORDER BY migration, kind, object;
