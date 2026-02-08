import { supabase } from '../lib/supabase';
import type {
  PreliminaryQuestionnaire,
  PreliminaryQuestionnaireWithConsultant,
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
  status?: 'pending' | 'linked_to_consultant' | 'archived';
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
): Promise<PreliminaryQuestionnaireWithConsultant | null> {
  const { data, error } = await supabase
    .from('preliminary_questionnaires')
    .select(
      `
      *,
      linked_consultant:consultants(*)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger le questionnaire.');
  }

  return data as PreliminaryQuestionnaireWithConsultant | null;
}

/**
 * Create a consultant from a preliminary questionnaire
 * Returns { consultantId, code } - code is the OTP sent to the consultant
 */
export async function createConsultantFromQuestionnaire(questionnaireId: string): Promise<{
  consultantId: string;
  code?: string;
  email?: string;
}> {
  // 1. Créer le consultant depuis le questionnaire (RPC existant)
  const { data, error } = await supabase.rpc('create_consultant_from_questionnaire', {
    p_questionnaire_id: questionnaireId
  });

  if (error) {
    if (error.message.includes('not found or already linked')) {
      throw new Error('Questionnaire non trouvé ou déjà associé à un consultant.');
    }
    throw new Error(error.message ?? 'Erreur lors de la création du consultant.');
  }

  const consultantId = data as string;

  // 2. Récupérer les infos du consultant créé
  const { data: consultant, error: consultantError } = await supabase
    .from('consultants')
    .select('email, full_name, first_name, last_name')
    .eq('id', consultantId)
    .single();

  if (consultantError || !consultant) {
    console.error('[questionnaire] Erreur recuperation consultant apres creation:', consultantError);
    return { consultantId };
  }

  // 3. Récupérer le token de session pour l'API
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    console.error('[questionnaire] Pas de token de session pour envoyer le code d\'activation');
    return { consultantId, email: consultant.email };
  }

  // 4. Envoyer le code d'activation via l'API route
  const consultantName = consultant.full_name ||
    [consultant.first_name, consultant.last_name].filter(Boolean).join(' ') ||
    'Consultant';

  try {
    const response = await fetch('/api/consultants/send-activation-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        email: consultant.email,
        name: consultantName,
        consultantId: consultantId
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('[questionnaire] Code d\'activation envoye pour consultant cree depuis questionnaire');
      console.log('[questionnaire] Email:', consultant.email);
      console.log('[questionnaire] Code:', result.code);
      return {
        consultantId,
        code: result.code,
        email: consultant.email
      };
    } else {
      console.error('[questionnaire] Erreur envoi code activation:', result.error);
      return { consultantId, email: consultant.email };
    }
  } catch (err) {
    console.error('[questionnaire] Exception envoi code activation:', err);
    return { consultantId, email: consultant.email };
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
 * Link a preliminary questionnaire to an existing consultant
 * Merges the questionnaire responses into the consultant's anamnesis
 */
export async function linkQuestionnaireToExistingConsultant(
  questionnaireId: string,
  consultantId: string
): Promise<void> {
  console.log('[questionnaire] LIAISON QUESTIONNAIRE -> CONSULTANT');
  console.log('Questionnaire ID:', questionnaireId);
  console.log('Consultant ID:', consultantId);

  // 1. Récupérer les données du questionnaire
  const { data: questionnaire, error: qError } = await supabase
    .from('preliminary_questionnaires')
    .select('responses, status')
    .eq('id', questionnaireId)
    .single();

  if (qError || !questionnaire) {
    console.error('[questionnaire] Questionnaire non trouve:', qError);
    throw new Error('Questionnaire non trouvé.');
  }

  if (questionnaire.status !== 'pending') {
    throw new Error('Ce questionnaire est déjà associé à un consultant.');
  }

  // 2. Récupérer l'anamnèse du consultant (si elle existe)
  const { data: anamnesis, error: aError } = await supabase
    .from('consultant_anamnesis')
    .select('answers, version')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (aError) {
    console.error('[questionnaire] Erreur recuperation anamnese:', aError);
    throw new Error('Impossible de récupérer l\'anamnèse du consultant.');
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

  console.log('[questionnaire] Fusion des reponses...');

  // 4. Mettre à jour ou créer l'anamnèse
  const newVersion = (anamnesis?.version || 0) + 1;

  const { error: upsertError } = await supabase
    .from('consultant_anamnesis')
    .upsert({
      consultant_id: consultantId,
      answers: mergedAnswers,
      version: newVersion,
      status: 'COMPLETED',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'consultant_id'
    });

  if (upsertError) {
    console.error('[questionnaire] Erreur mise a jour anamnese:', upsertError);
    throw new Error('Impossible de mettre à jour l\'anamnèse.');
  }

  console.log('[questionnaire] Anamnese mise a jour (version', newVersion, ')');

  // 5. Marquer le questionnaire comme lié
  const { error: linkError } = await supabase
    .from('preliminary_questionnaires')
    .update({
      status: 'linked_to_consultant',
      linked_consultant_id: consultantId,
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', questionnaireId);

  if (linkError) {
    console.error('[questionnaire] Erreur liaison questionnaire:', linkError);
    throw new Error('Impossible de lier le questionnaire.');
  }

  console.log('[questionnaire] Questionnaire lie au consultant');
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
 * Get anamnesis modification history for a consultant
 */
export async function getAnamnesisHistory(params: {
  consultantId: string;
  section?: string;
  limit?: number;
}): Promise<AnamnesisHistory[]> {
  const { data, error } = await supabase.rpc('get_anamnesis_history', {
    p_consultant_id: params.consultantId,
    p_section: params.section ?? null,
    p_limit: params.limit ?? 50
  });

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger l\'historique.');
  }

  return (data ?? []) as AnamnesisHistory[];
}

/**
 * Get the latest version number for a consultant's anamnesis
 */
export async function getAnamnesisVersion(consultantId: string): Promise<number> {
  const { data, error } = await supabase
    .from('consultant_anamnesis')
    .select('version')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching anamnesis version:', error);
    return 0;
  }

  return data?.version ?? 0;
}
