import { supabase } from '../lib/supabase';
import type {
  PreliminaryQuestionnaire,
  PreliminaryQuestionnaireWithPatient,
  PublicPractitioner,
  AnamnesisHistory
} from '../lib/types';

// ============================================
// Public Functions (no auth required)
// ============================================

/**
 * Get list of practitioners for public questionnaire dropdown
 */
export async function getPublicPractitioners(): Promise<PublicPractitioner[]> {
  const { data, error } = await supabase.rpc('get_public_practitioners');

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger la liste des naturopathes.');
  }

  return data ?? [];
}

/**
 * Submit a preliminary questionnaire (public, no auth required)
 */
export async function submitPreliminaryQuestionnaire(params: {
  naturopathId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  responses: Record<string, Record<string, string>>;
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_preliminary_questionnaire', {
    p_naturopath_id: params.naturopathId,
    p_first_name: params.firstName,
    p_last_name: params.lastName,
    p_email: params.email,
    p_phone: params.phone ?? null,
    p_responses: params.responses
  });

  if (error) {
    // Handle specific error messages
    if (error.message.includes('Invalid email format')) {
      throw new Error('Format d\'email invalide.');
    }
    if (error.message.includes('Invalid naturopath_id')) {
      throw new Error('Naturopathe non trouvé.');
    }
    if (error.message.includes('required')) {
      throw new Error('Tous les champs obligatoires doivent être remplis.');
    }
    throw new Error(error.message ?? 'Erreur lors de la soumission du questionnaire.');
  }

  return data as string;
}

// ============================================
// Practitioner Functions (auth required)
// ============================================

/**
 * Get preliminary questionnaires for the current practitioner
 */
export async function getPreliminaryQuestionnaires(params?: {
  status?: 'pending' | 'linked_to_patient' | 'archived';
  limit?: number;
  offset?: number;
}): Promise<PreliminaryQuestionnaire[]> {
  const { data, error } = await supabase.rpc('get_preliminary_questionnaires', {
    p_status: params?.status ?? null,
    p_limit: params?.limit ?? 50,
    p_offset: params?.offset ?? 0
  });

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger les questionnaires préliminaires.');
  }

  return (data ?? []) as PreliminaryQuestionnaire[];
}

/**
 * Get a single preliminary questionnaire by ID
 */
export async function getPreliminaryQuestionnaireById(
  id: string
): Promise<PreliminaryQuestionnaireWithPatient | null> {
  const { data, error } = await supabase
    .from('preliminary_questionnaires')
    .select(
      `
      *,
      linked_patient:patients(*)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger le questionnaire.');
  }

  return data as PreliminaryQuestionnaireWithPatient | null;
}

/**
 * Create a patient from a preliminary questionnaire
 * Returns { patientId, code } - code is the OTP sent to the patient
 */
export async function createPatientFromQuestionnaire(questionnaireId: string): Promise<{
  patientId: string;
  code?: string;
  email?: string;
}> {
  // 1. Créer le patient depuis le questionnaire (RPC existant)
  const { data, error } = await supabase.rpc('create_patient_from_questionnaire', {
    p_questionnaire_id: questionnaireId
  });

  if (error) {
    if (error.message.includes('not found or already linked')) {
      throw new Error('Questionnaire non trouvé ou déjà associé à un patient.');
    }
    throw new Error(error.message ?? 'Erreur lors de la création du patient.');
  }

  const patientId = data as string;

  // 2. Récupérer les infos du patient créé
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('email, full_name, first_name, last_name')
    .eq('id', patientId)
    .single();

  if (patientError || !patient) {
    console.error('❌ Erreur récupération patient après création:', patientError);
    return { patientId };
  }

  // 3. Récupérer le token de session pour l'API
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    console.error('⚠️ Pas de token de session pour envoyer le code d\'activation');
    return { patientId, email: patient.email };
  }

  // 4. Envoyer le code d'activation via l'API route
  const patientName = patient.full_name ||
    [patient.first_name, patient.last_name].filter(Boolean).join(' ') ||
    'Patient';

  try {
    const response = await fetch('/api/patients/send-activation-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        email: patient.email,
        name: patientName,
        patientId: patientId
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Code d\'activation envoyé pour patient créé depuis questionnaire');
      console.log('📧 Email:', patient.email);
      console.log('🔑 Code:', result.code);
      return {
        patientId,
        code: result.code,
        email: patient.email
      };
    } else {
      console.error('⚠️ Erreur envoi code activation:', result.error);
      return { patientId, email: patient.email };
    }
  } catch (err) {
    console.error('⚠️ Exception envoi code activation:', err);
    return { patientId, email: patient.email };
  }
}

/**
 * Archive a preliminary questionnaire
 */
export async function archivePreliminaryQuestionnaire(questionnaireId: string): Promise<void> {
  const { error } = await supabase
    .from('preliminary_questionnaires')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', questionnaireId);

  if (error) {
    throw new Error(error.message ?? 'Impossible d\'archiver le questionnaire.');
  }
}

/**
 * Link a preliminary questionnaire to an existing patient
 * Merges the questionnaire responses into the patient's anamnesis
 */
export async function linkQuestionnaireToExistingPatient(
  questionnaireId: string,
  patientId: string
): Promise<void> {
  console.log('═══════════════════════════════════════');
  console.log('🔗 LIAISON QUESTIONNAIRE → PATIENT');
  console.log('Questionnaire ID:', questionnaireId);
  console.log('Patient ID:', patientId);

  // 1. Récupérer les données du questionnaire
  const { data: questionnaire, error: qError } = await supabase
    .from('preliminary_questionnaires')
    .select('responses, status')
    .eq('id', questionnaireId)
    .single();

  if (qError || !questionnaire) {
    console.error('❌ Questionnaire non trouvé:', qError);
    throw new Error('Questionnaire non trouvé.');
  }

  if (questionnaire.status !== 'pending') {
    throw new Error('Ce questionnaire est déjà associé à un patient.');
  }

  // 2. Récupérer l'anamnèse du patient (si elle existe)
  const { data: anamnesis, error: aError } = await supabase
    .from('patient_anamnesis')
    .select('answers, version')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (aError) {
    console.error('❌ Erreur récupération anamnèse:', aError);
    throw new Error('Impossible de récupérer l\'anamnèse du patient.');
  }

  // 3. Fusionner les réponses (les données du questionnaire complètent l'anamnèse)
  const existingAnswers = anamnesis?.answers || {};
  const questionnaireResponses = questionnaire.responses || {};

  // Convertir les réponses du questionnaire au format anamnèse si nécessaire
  const mergedAnswers = {
    ...existingAnswers,
    // Les réponses du questionnaire préliminaire remplacent les valeurs vides
    ...Object.fromEntries(
      Object.entries(questionnaireResponses).map(([section, values]) => {
        const existingSection = (existingAnswers as Record<string, unknown>)[section] || {};
        return [section, { ...existingSection, ...(values as Record<string, unknown>) }];
      })
    )
  };

  console.log('📝 Fusion des réponses...');

  // 4. Mettre à jour ou créer l'anamnèse
  const newVersion = (anamnesis?.version || 0) + 1;

  const { error: upsertError } = await supabase
    .from('patient_anamnesis')
    .upsert({
      patient_id: patientId,
      answers: mergedAnswers,
      version: newVersion,
      status: 'COMPLETED',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'patient_id'
    });

  if (upsertError) {
    console.error('❌ Erreur mise à jour anamnèse:', upsertError);
    throw new Error('Impossible de mettre à jour l\'anamnèse.');
  }

  console.log('✅ Anamnèse mise à jour (version', newVersion, ')');

  // 5. Marquer le questionnaire comme lié
  const { error: linkError } = await supabase
    .from('preliminary_questionnaires')
    .update({
      status: 'linked_to_patient',
      linked_patient_id: patientId,
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', questionnaireId);

  if (linkError) {
    console.error('❌ Erreur liaison questionnaire:', linkError);
    throw new Error('Impossible de lier le questionnaire.');
  }

  console.log('✅ Questionnaire lié au patient');
  console.log('═══════════════════════════════════════');
}

/**
 * Get count of pending preliminary questionnaires
 */
export async function getPendingQuestionnaireCount(): Promise<number> {
  const { count, error } = await supabase
    .from('preliminary_questionnaires')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending count:', error);
    return 0;
  }

  return count ?? 0;
}

// ============================================
// Anamnesis History Functions
// ============================================

/**
 * Get anamnesis modification history for a patient
 */
export async function getAnamnesisHistory(params: {
  patientId: string;
  section?: string;
  limit?: number;
}): Promise<AnamnesisHistory[]> {
  const { data, error } = await supabase.rpc('get_anamnesis_history', {
    p_patient_id: params.patientId,
    p_section: params.section ?? null,
    p_limit: params.limit ?? 50
  });

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger l\'historique.');
  }

  return (data ?? []) as AnamnesisHistory[];
}

/**
 * Get the latest version number for a patient's anamnesis
 */
export async function getAnamnesisVersion(patientId: string): Promise<number> {
  const { data, error } = await supabase
    .from('patient_anamnesis')
    .select('version')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching anamnesis version:', error);
    return 0;
  }

  return data?.version ?? 0;
}
