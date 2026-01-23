import { supabase } from '../lib/supabase';

export type AnamneseAnswers = Record<string, string>;

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
    throw new Error(error.message ?? 'Impossible de créer l\'anamnèse.');
  }
}

export async function submitAnamnese(patientId: string, answers: AnamneseAnswers) {
  const { error } = await supabase
    .from('anamnese_instances')
    .update({
      status: 'COMPLETED',
      answers
    })
    .eq('patient_id', patientId);

  if (error) {
    throw new Error(error.message ?? 'Impossible d\'enregistrer l\'anamnèse.');
  }

  const { error: patientAnamnesisError } = await supabase
    .from('patient_anamnesis')
    .upsert(
      {
        patient_id: patientId,
        answers,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'patient_id' }
    );

  if (patientAnamnesisError) {
    throw new Error(patientAnamnesisError.message ?? 'Impossible d\'enregistrer l\'anamnèse.');
  }
}

export async function fetchAnamneseStatus(patientId: string) {
  const { data, error } = await supabase
    .from('anamnese_instances')
    .select('status')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger l\'anamnèse.');
  }

  return data?.status ?? null;
}
