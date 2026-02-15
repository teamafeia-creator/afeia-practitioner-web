import { supabase } from '../supabase';
import type { CycleProfile, CycleEntry } from '../types';

// ============================================
// CYCLE PROFILE
// ============================================

export async function getCycleProfile(
  consultantId: string
): Promise<CycleProfile | null> {
  const { data, error } = await supabase
    .from('cycle_profiles')
    .select('*')
    .eq('consultant_id', consultantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching cycle profile:', error);
    return null;
  }
  return data;
}

export async function upsertCycleProfile(
  consultantId: string,
  practitionerId: string,
  data: Partial<CycleProfile>
): Promise<CycleProfile | null> {
  const { id, created_at, updated_at, ...rest } = data as any;

  const { data: result, error } = await supabase
    .from('cycle_profiles')
    .upsert(
      {
        consultant_id: consultantId,
        practitioner_id: practitionerId,
        ...rest,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'consultant_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting cycle profile:', error);
    return null;
  }
  return result;
}

// ============================================
// CYCLE ENTRIES
// ============================================

export async function getCycleEntries(
  consultantId: string,
  startDate?: string,
  endDate?: string
): Promise<CycleEntry[]> {
  let query = supabase
    .from('cycle_entries')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('date', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching cycle entries:', error);
    return [];
  }
  return data || [];
}

export async function upsertCycleEntry(
  consultantId: string,
  entry: Partial<CycleEntry> & { date: string }
): Promise<CycleEntry | null> {
  const { id, created_at, ...rest } = entry as any;

  // Check if entry exists for this date
  const { data: existing } = await supabase
    .from('cycle_entries')
    .select('id')
    .eq('consultant_id', consultantId)
    .eq('date', entry.date)
    .maybeSingle();

  if (existing) {
    const { data: result, error } = await supabase
      .from('cycle_entries')
      .update({ ...rest })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cycle entry:', error);
      return null;
    }
    return result;
  }

  const { data: result, error } = await supabase
    .from('cycle_entries')
    .insert({
      consultant_id: consultantId,
      ...rest,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cycle entry:', error);
    return null;
  }
  return result;
}

export async function deleteCycleEntry(
  consultantId: string,
  date: string
): Promise<boolean> {
  const { error } = await supabase
    .from('cycle_entries')
    .delete()
    .eq('consultant_id', consultantId)
    .eq('date', date);

  if (error) {
    console.error('Error deleting cycle entry:', error);
    return false;
  }
  return true;
}
