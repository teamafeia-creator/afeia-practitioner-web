import { supabase } from '../lib/supabase';
import type { PatientAnamnesis } from '../lib/types';

// Structure: { "section_id": { "question_key": "answer_value" } }
export type AnamneseAnswers = Record<string, Record<string, string>>;

// Legacy flat structure for backwards compatibility
export type AnamneseAnswersFlat = Record<string, string>;

/**
 * Create a new anamnese instance (legacy support)
 * @deprecated Use patient_anamnesis directly
 */
export async function createAnamneseInstance(patientId: string) {
  const { error } = await supabase.from('anamnese_instances').upsert(
    {
      patient_id: patientId,
      status: 'PENDING',
      updated_at: new Date().toISOString()
    },
    {
      onConflict: 'patient_id'
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
  patientId: string,
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
    .eq('patient_id', patientId);

  if (error) {
    console.warn('Legacy anamnese_instances update failed:', error);
  }

  // Update new patient_anamnesis table
  const { error: patientAnamnesisError } = await supabase.from('patient_anamnesis').upsert(
    {
      patient_id: patientId,
      naturopath_id: naturopathId,
      answers,
      source: 'manual',
      updated_at: new Date().toISOString()
    },
    { onConflict: 'patient_id' }
  );

  if (patientAnamnesisError) {
    throw new Error(patientAnamnesisError.message ?? "Impossible d'enregistrer l'anamnèse.");
  }
}

/**
 * Update a specific section of the anamnesis
 */
export async function updateAnamnesisSection(
  patientId: string,
  sectionId: string,
  sectionData: Record<string, string>
): Promise<void> {
  // First get current anamnesis
  const { data: current, error: fetchError } = await supabase
    .from('patient_anamnesis')
    .select('answers')
    .eq('patient_id', patientId)
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
    .from('patient_anamnesis')
    .update({
      answers: updatedAnswers,
      updated_at: new Date().toISOString()
    })
    .eq('patient_id', patientId);

  if (updateError) {
    throw new Error(updateError.message ?? "Impossible de mettre à jour l'anamnèse.");
  }
}

/**
 * Get full anamnesis for a patient
 */
export async function getPatientAnamnesis(patientId: string): Promise<PatientAnamnesis | null> {
  const { data, error } = await supabase
    .from('patient_anamnesis')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Impossible de charger l'anamnèse.");
  }

  return data as PatientAnamnesis | null;
}

/**
 * Get a specific section of anamnesis
 */
export async function getAnamnesisSection(
  patientId: string,
  sectionId: string
): Promise<Record<string, string> | null> {
  const { data, error } = await supabase
    .from('patient_anamnesis')
    .select('answers')
    .eq('patient_id', patientId)
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
 * Check if patient has completed anamnesis
 */
export async function hasCompletedAnamnesis(patientId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('patient_anamnesis')
    .select('answers')
    .eq('patient_id', patientId)
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
 * @deprecated Use getPatientAnamnesis instead
 */
export async function fetchAnamneseStatus(patientId: string) {
  const { data, error } = await supabase
    .from('anamnese_instances')
    .select('status')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Impossible de charger l'anamnèse.");
  }

  return data?.status ?? null;
}

/**
 * Initialize empty anamnesis for a new patient
 */
export async function initializePatientAnamnesis(
  patientId: string,
  naturopathId: string,
  source: 'manual' | 'preliminary_questionnaire' | 'mobile_app' = 'manual'
): Promise<void> {
  const { error } = await supabase.from('patient_anamnesis').upsert(
    {
      patient_id: patientId,
      naturopath_id: naturopathId,
      answers: {},
      source,
      version: 1,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'patient_id', ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(error.message ?? "Impossible d'initialiser l'anamnèse.");
  }
}
