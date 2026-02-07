import { supabase } from '../lib/supabase';
import type { ConsultantAnamnesis } from '../lib/types';

// Structure: { "section_id": { "question_key": "answer_value" } }
export type AnamneseAnswers = Record<string, Record<string, string>>;

// Legacy flat structure for backwards compatibility
export type AnamneseAnswersFlat = Record<string, string>;

/**
 * Create a new anamnese instance (legacy support)
 * @deprecated Use consultant_anamnesis directly
 */
export async function createAnamneseInstance(consultantId: string) {
  const { error } = await supabase.from('anamnese_instances').upsert(
    {
      consultant_id: consultantId,
      status: 'PENDING',
      updated_at: new Date().toISOString()
    },
    {
      onConflict: 'consultant_id'
    }
  );

  if (error) {
    throw new Error(error.message ?? "Impossible de créer l'anamnèse.");
  }
}

/**
 * Submit complete anamnese (legacy + new table)
 */
export async function submitAnamnese(
  consultantId: string,
  answers: AnamneseAnswers | AnamneseAnswersFlat,
  naturopathId?: string
) {
  // Update legacy table for backwards compatibility
  const { error } = await supabase
    .from('anamnese_instances')
    .update({
      status: 'COMPLETED',
      answers
    })
    .eq('consultant_id', consultantId);

  if (error) {
    console.warn('Legacy anamnese_instances update failed:', error);
  }

  // Update new consultant_anamnesis table
  const { error: consultantAnamnesisError } = await supabase.from('consultant_anamnesis').upsert(
    {
      consultant_id: consultantId,
      naturopath_id: naturopathId,
      answers,
      source: 'manual',
      updated_at: new Date().toISOString()
    },
    { onConflict: 'consultant_id' }
  );

  if (consultantAnamnesisError) {
    throw new Error(consultantAnamnesisError.message ?? "Impossible d'enregistrer l'anamnèse.");
  }
}

/**
 * Update a specific section of the anamnesis
 */
export async function updateAnamnesisSection(
  consultantId: string,
  sectionId: string,
  sectionData: Record<string, string>
): Promise<void> {
  // First get current anamnesis
  const { data: current, error: fetchError } = await supabase
    .from('consultant_anamnesis')
    .select('answers')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message ?? "Impossible de charger l'anamnèse.");
  }

  // Merge section into existing answers
  const currentAnswers = (current?.answers as AnamneseAnswers) ?? {};
  const updatedAnswers = {
    ...currentAnswers,
    [sectionId]: sectionData
  };

  // Update with merged data (trigger will handle history)
  const { error: updateError } = await supabase
    .from('consultant_anamnesis')
    .update({
      answers: updatedAnswers,
      updated_at: new Date().toISOString()
    })
    .eq('consultant_id', consultantId);

  if (updateError) {
    throw new Error(updateError.message ?? "Impossible de mettre à jour l'anamnèse.");
  }
}

/**
 * Get full anamnesis for a consultant
 */
export async function getConsultantAnamnesis(consultantId: string): Promise<ConsultantAnamnesis | null> {
  const { data, error } = await supabase
    .from('consultant_anamnesis')
    .select('*')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Impossible de charger l'anamnèse.");
  }

  return data as ConsultantAnamnesis | null;
}

/**
 * Get a specific section of anamnesis
 */
export async function getAnamnesisSection(
  consultantId: string,
  sectionId: string
): Promise<Record<string, string> | null> {
  const { data, error } = await supabase
    .from('consultant_anamnesis')
    .select('answers')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Impossible de charger l'anamnèse.");
  }

  if (!data?.answers) {
    return null;
  }

  const answers = data.answers as AnamneseAnswers;
  return answers[sectionId] ?? null;
}

/**
 * Check if consultant has completed anamnesis
 */
export async function hasCompletedAnamnesis(consultantId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('consultant_anamnesis')
    .select('answers')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  // Check if there are any answers
  const answers = data.answers as AnamneseAnswers | null;
  return answers !== null && Object.keys(answers).length > 0;
}

/**
 * Fetch anamnese status (legacy support)
 * @deprecated Use getConsultantAnamnesis instead
 */
export async function fetchAnamneseStatus(consultantId: string) {
  const { data, error } = await supabase
    .from('anamnese_instances')
    .select('status')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Impossible de charger l'anamnèse.");
  }

  return data?.status ?? null;
}

/**
 * Initialize empty anamnesis for a new consultant
 */
export async function initializeConsultantAnamnesis(
  consultantId: string,
  naturopathId: string,
  source: 'manual' | 'preliminary_questionnaire' | 'mobile_app' = 'manual'
): Promise<void> {
  const { error } = await supabase.from('consultant_anamnesis').upsert(
    {
      consultant_id: consultantId,
      naturopath_id: naturopathId,
      answers: {},
      source,
      version: 1,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'consultant_id', ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(error.message ?? "Impossible d'initialiser l'anamnèse.");
  }
}
