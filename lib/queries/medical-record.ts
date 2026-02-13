import { supabase } from '../supabase';
import type {
  MedicalHistoryEntry,
  AllergyEntry,
  CurrentTreatmentEntry,
  ConsultantRelationship,
} from '../types';

// ============================================
// MEDICAL HISTORY
// ============================================

export async function getMedicalHistory(consultantId: string): Promise<MedicalHistoryEntry[]> {
  const { data, error } = await supabase
    .from('medical_history')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching medical history:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as MedicalHistoryEntry[];
}

export async function createMedicalHistoryEntry(
  entry: Omit<MedicalHistoryEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<MedicalHistoryEntry> {
  const { data, error } = await supabase
    .from('medical_history')
    .insert(entry)
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating medical history entry:', error);
    throw new Error(error?.message ?? 'Impossible de créer l\'antécédent.');
  }
  return data as MedicalHistoryEntry;
}

export async function updateMedicalHistoryEntry(
  id: string,
  updates: Partial<Omit<MedicalHistoryEntry, 'id' | 'consultant_id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
): Promise<MedicalHistoryEntry> {
  const { data, error } = await supabase
    .from('medical_history')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating medical history entry:', error);
    throw new Error(error?.message ?? 'Impossible de modifier l\'antécédent.');
  }
  return data as MedicalHistoryEntry;
}

export async function deleteMedicalHistoryEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('medical_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting medical history entry:', error);
    throw new Error(error.message);
  }
}

// ============================================
// ALLERGIES
// ============================================

export async function getAllergies(consultantId: string): Promise<AllergyEntry[]> {
  const { data, error } = await supabase
    .from('allergies')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching allergies:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as AllergyEntry[];
}

export async function createAllergy(
  entry: Omit<AllergyEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<AllergyEntry> {
  const { data, error } = await supabase
    .from('allergies')
    .insert(entry)
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating allergy:', error);
    throw new Error(error?.message ?? 'Impossible de créer l\'allergie.');
  }
  return data as AllergyEntry;
}

export async function updateAllergy(
  id: string,
  updates: Partial<Omit<AllergyEntry, 'id' | 'consultant_id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
): Promise<AllergyEntry> {
  const { data, error } = await supabase
    .from('allergies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating allergy:', error);
    throw new Error(error?.message ?? 'Impossible de modifier l\'allergie.');
  }
  return data as AllergyEntry;
}

export async function deleteAllergy(id: string): Promise<void> {
  const { error } = await supabase
    .from('allergies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting allergy:', error);
    throw new Error(error.message);
  }
}

// ============================================
// CURRENT TREATMENTS
// ============================================

export async function getCurrentTreatments(consultantId: string): Promise<CurrentTreatmentEntry[]> {
  const { data, error } = await supabase
    .from('current_treatments')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching treatments:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as CurrentTreatmentEntry[];
}

export async function createTreatment(
  entry: Omit<CurrentTreatmentEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<CurrentTreatmentEntry> {
  const { data, error } = await supabase
    .from('current_treatments')
    .insert(entry)
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating treatment:', error);
    throw new Error(error?.message ?? 'Impossible de créer le traitement.');
  }
  return data as CurrentTreatmentEntry;
}

export async function updateTreatment(
  id: string,
  updates: Partial<Omit<CurrentTreatmentEntry, 'id' | 'consultant_id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
): Promise<CurrentTreatmentEntry> {
  const { data, error } = await supabase
    .from('current_treatments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating treatment:', error);
    throw new Error(error?.message ?? 'Impossible de modifier le traitement.');
  }
  return data as CurrentTreatmentEntry;
}

export async function deleteTreatment(id: string): Promise<void> {
  const { error } = await supabase
    .from('current_treatments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting treatment:', error);
    throw new Error(error.message);
  }
}

// ============================================
// CONSULTANT RELATIONSHIPS
// ============================================

export async function getConsultantRelationships(consultantId: string): Promise<ConsultantRelationship[]> {
  const { data, error } = await supabase
    .from('consultant_relationships')
    .select(`
      *,
      related_consultant:consultants!consultant_relationships_related_consultant_id_fkey(id, name, first_name, last_name)
    `)
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching relationships:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as ConsultantRelationship[];
}

const INVERSE_RELATIONSHIP: Record<string, string> = {
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  sibling: 'sibling',
  other: 'other',
};

export async function createRelationship(data: {
  consultant_id: string;
  related_consultant_id: string;
  relationship_type: 'parent' | 'child' | 'spouse' | 'sibling' | 'other';
  label?: string | null;
}): Promise<ConsultantRelationship> {
  // Insert direct link
  const { data: direct, error: directError } = await supabase
    .from('consultant_relationships')
    .insert({
      consultant_id: data.consultant_id,
      related_consultant_id: data.related_consultant_id,
      relationship_type: data.relationship_type,
      label: data.label || null,
    })
    .select()
    .single();

  if (directError || !direct) {
    console.error('Error creating relationship:', directError);
    throw new Error(directError?.message ?? 'Impossible de créer le lien.');
  }

  // Insert inverse link (ignore error if already exists)
  const inverseType = INVERSE_RELATIONSHIP[data.relationship_type] || 'other';
  await supabase
    .from('consultant_relationships')
    .insert({
      consultant_id: data.related_consultant_id,
      related_consultant_id: data.consultant_id,
      relationship_type: inverseType,
      label: null,
    })
    .select()
    .maybeSingle();

  return direct as ConsultantRelationship;
}

export async function deleteRelationship(id: string, consultantId: string): Promise<void> {
  // First get the relationship to find the inverse
  const { data: rel } = await supabase
    .from('consultant_relationships')
    .select('consultant_id, related_consultant_id')
    .eq('id', id)
    .single();

  if (rel) {
    // Delete the inverse relationship
    await supabase
      .from('consultant_relationships')
      .delete()
      .eq('consultant_id', rel.related_consultant_id)
      .eq('related_consultant_id', rel.consultant_id);
  }

  // Delete the direct relationship
  const { error } = await supabase
    .from('consultant_relationships')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting relationship:', error);
    throw new Error(error.message);
  }
}

// ============================================
// SEARCH CONSULTANTS
// ============================================

export async function searchConsultants(
  practitionerId: string,
  query: string
): Promise<{ id: string; name: string; first_name?: string; last_name?: string }[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from('consultants')
    .select('id, name, first_name, last_name')
    .eq('practitioner_id', practitionerId)
    .is('deleted_at', null)
    .or(`name.ilike.%${trimmed}%,first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`)
    .limit(10);

  if (error) {
    console.error('Error searching consultants:', error);
    return [];
  }
  return data ?? [];
}
