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
 */
export async function createPatientFromQuestionnaire(questionnaireId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_patient_from_questionnaire', {
    p_questionnaire_id: questionnaireId
  });

  if (error) {
    if (error.message.includes('not found or already linked')) {
      throw new Error('Questionnaire non trouvé ou déjà associé à un patient.');
    }
    throw new Error(error.message ?? 'Erreur lors de la création du patient.');
  }

  return data as string;
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
