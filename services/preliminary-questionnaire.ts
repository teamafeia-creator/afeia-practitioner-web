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
    throw new Error(error.message ?? 'Impossible de charger la liste des praticiens.');
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
      throw new Error('Praticien non trouvé.');
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
    .select('email, name, first_name, last_name')
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
  const consultantName = consultant.name ||
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

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/**
 * Fusionne les réponses d'un questionnaire dans une anamnèse existante.
 * Règle : on ne complète que les champs vides ; une valeur déjà saisie n'est jamais écrasée.
 * Les réponses différentes restent consultables dans le questionnaire associé.
 */
export function mergeQuestionnaireIntoAnamnesis(
  existing: Record<string, Record<string, unknown>>,
  responses: Record<string, Record<string, string>>
): { merged: Record<string, Record<string, unknown>>; filled: number; kept: number } {
  const merged: Record<string, Record<string, unknown>> = {};
  for (const [section, values] of Object.entries(existing ?? {})) merged[section] = { ...(values ?? {}) };
  let filled = 0;
  let kept = 0;
  for (const [section, values] of Object.entries(responses ?? {})) {
    const target = (merged[section] = { ...(merged[section] ?? {}) });
    for (const [key, value] of Object.entries(values ?? {})) {
      if (isEmpty(value)) continue;
      if (isEmpty(target[key])) {
        target[key] = value;
        filled += 1;
      } else if (String(target[key]).trim() !== String(value).trim()) {
        kept += 1;
      }
    }
  }
  return { merged, filled, kept };
}

/**
 * Associe un questionnaire à un consultant existant.
 * Les réponses complètent l'anamnèse sans écraser ce qui est déjà rempli ;
 * la version précédente est conservée par l'historique de l'anamnèse (trigger).
 */
export async function linkQuestionnaireToExistingConsultant(
  questionnaireId: string,
  consultantId: string
): Promise<{ filled: number; kept: number }> {
  const { data: questionnaire, error: qError } = await supabase
    .from('preliminary_questionnaires')
    .select('responses, status')
    .eq('id', questionnaireId)
    .single();

  if (qError || !questionnaire) throw new Error('Questionnaire non trouvé.');
  if (questionnaire.status !== 'pending') throw new Error('Ce questionnaire est déjà associé à un consultant.');

  const { data: anamnesis, error: aError } = await supabase
    .from('consultant_anamnesis')
    .select('answers, version')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (aError) throw new Error('Impossible de récupérer l’anamnèse du consultant.');

  const { merged, filled, kept } = mergeQuestionnaireIntoAnamnesis(
    (anamnesis?.answers ?? {}) as Record<string, Record<string, unknown>>,
    (questionnaire.responses ?? {}) as Record<string, Record<string, string>>
  );

  if (filled > 0 || !anamnesis) {
    const { error: upsertError } = await supabase.from('consultant_anamnesis').upsert(
      {
        consultant_id: consultantId,
        answers: merged,
        version: (anamnesis?.version || 0) + 1,
        status: 'COMPLETED',
        updated_at: new Date().toISOString()
      },
      { onConflict: 'consultant_id' }
    );
    if (upsertError) throw new Error('Impossible de mettre à jour l’anamnèse.');
  }

  const { error: linkError } = await supabase
    .from('preliminary_questionnaires')
    .update({
      status: 'linked_to_consultant',
      linked_consultant_id: consultantId,
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', questionnaireId);

  if (linkError) throw new Error('Impossible de lier le questionnaire.');
  return { filled, kept };
}

/**
 * Remet un questionnaire archivé en attente.
 */
export async function restorePreliminaryQuestionnaire(questionnaireId: string): Promise<void> {
  const { error } = await supabase
    .from('preliminary_questionnaires')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', questionnaireId)
    .eq('status', 'archived');
  if (error) throw new Error(error.message ?? 'Impossible de remettre le questionnaire en attente.');
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
