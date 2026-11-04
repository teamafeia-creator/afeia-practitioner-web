import { supabase } from '../supabase';
import type { AnamnesisNote, ConsultantGoal } from '../types';

async function practitionerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Veuillez vous reconnecter.');
  return data.user.id;
}

// ─── Objectifs fixés avec le consultant ─────────────────────────────

export async function getConsultantGoals(consultantId: string): Promise<ConsultantGoal[]> {
  const { data, error } = await supabase
    .from('consultant_goals')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
  return (data ?? []) as ConsultantGoal[];
}

export async function createConsultantGoal(
  consultantId: string,
  input: { label: string; baseline?: string | null; progress?: string | null; set_on?: string; position?: number }
): Promise<ConsultantGoal> {
  const { data, error } = await supabase
    .from('consultant_goals')
    .insert({
      consultant_id: consultantId,
      practitioner_id: await practitionerId(),
      label: input.label,
      baseline: input.baseline ?? null,
      progress: input.progress ?? null,
      ...(input.set_on ? { set_on: input.set_on } : {}),
      position: input.position ?? 0,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Impossible d’ajouter l’objectif.');
  return data as ConsultantGoal;
}

export async function updateConsultantGoal(
  id: string,
  updates: Partial<Pick<ConsultantGoal, 'label' | 'baseline' | 'progress' | 'status'>>
): Promise<ConsultantGoal> {
  const { data, error } = await supabase
    .from('consultant_goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Impossible de modifier l’objectif.');
  return data as ConsultantGoal;
}

export async function deleteConsultantGoal(id: string): Promise<void> {
  const { error } = await supabase.from('consultant_goals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Notes du praticien sur l'anamnèse ──────────────────────────────

export const FIRST_NOTE_SECTION = 'first_note';

export async function getAnamnesisNotes(consultantId: string): Promise<AnamnesisNote[]> {
  const { data, error } = await supabase
    .from('anamnesis_notes')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching anamnesis notes:', error);
    return [];
  }
  return (data ?? []) as AnamnesisNote[];
}

export async function addAnamnesisNote(consultantId: string, sectionId: string, content: string): Promise<AnamnesisNote> {
  const { data, error } = await supabase
    .from('anamnesis_notes')
    .insert({ consultant_id: consultantId, practitioner_id: await practitionerId(), section_id: sectionId, content })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Impossible d’enregistrer la note.');
  return data as AnamnesisNote;
}

/** « Ma première note » : une seule par dossier, créée ou remplacée. */
export async function saveFirstNote(consultantId: string, content: string, existingId?: string | null): Promise<AnamnesisNote> {
  if (existingId) {
    const { data, error } = await supabase
      .from('anamnesis_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Impossible d’enregistrer la note.');
    return data as AnamnesisNote;
  }
  return addAnamnesisNote(consultantId, FIRST_NOTE_SECTION, content);
}
