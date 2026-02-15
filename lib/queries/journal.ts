import { supabase } from '../supabase';
import { normalizeMood } from '../journal-constants';
import type { JournalEntry, JournalIndicator, IndicatorCategory, IndicatorValueType } from '../types';

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function describeError(error: SupabaseErrorLike | null | undefined) {
  if (!error) return 'Erreur inconnue.';
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.filter(Boolean).join(' | ');
}

export async function upsertJournalEntryV2(
  consultantId: string,
  practitionerId: string | null,
  entry: Partial<JournalEntry> & { date: string }
): Promise<JournalEntry | null> {
  // Normalize mood if it's a legacy value
  const mood = entry.mood ? normalizeMood(entry.mood) : null;

  const payload = {
    consultant_id: consultantId,
    practitioner_id: practitionerId ?? undefined,
    date: entry.date,
    mood: mood ?? entry.mood ?? null,
    energy: entry.energy ?? null,
    text: entry.text ?? null,
    adherence_hydratation: entry.adherence_hydratation ?? false,
    adherence_respiration: entry.adherence_respiration ?? false,
    adherence_mouvement: entry.adherence_mouvement ?? false,
    adherence_plantes: entry.adherence_plantes ?? false,
    sleep_quality: entry.sleep_quality ?? null,
    stress_level: entry.stress_level ?? null,
    energy_level: entry.energy_level ?? null,
    bristol_type: entry.bristol_type ?? null,
    bristol_frequency: entry.bristol_frequency ?? null,
    transit_notes: entry.transit_notes ?? null,
    hydration_liters: entry.hydration_liters ?? null,
    hydration_type: entry.hydration_type ?? null,
    hydration_notes: entry.hydration_notes ?? null,
    exercise_type: entry.exercise_type ?? null,
    exercise_duration_minutes: entry.exercise_duration_minutes ?? null,
    exercise_intensity: entry.exercise_intensity ?? null,
    exercise_notes: entry.exercise_notes ?? null,
    custom_indicators: entry.custom_indicators ?? [],
    source: entry.source ?? 'consultant',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(payload, { onConflict: 'consultant_id,date' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting journal entry v2:', error);
    return null;
  }
  return data;
}

export async function getJournalEntries(
  consultantId: string,
  options?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
): Promise<JournalEntry[]> {
  let query = supabase
    .from('journal_entries')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('date', { ascending: false });

  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching journal entries:', error);
    return [];
  }
  return data || [];
}

export async function getJournalEntryByDate(
  consultantId: string,
  date: string
): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('consultant_id', consultantId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    console.error('Error fetching journal entry by date:', error);
    return null;
  }
  return data;
}

export async function getTransitHistory(
  consultantId: string,
  days: number
): Promise<Array<{ date: string; bristol_type: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('journal_entries')
    .select('date, bristol_type')
    .eq('consultant_id', consultantId)
    .not('bristol_type', 'is', null)
    .gte('date', startDate.toISOString().slice(0, 10))
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching transit history:', error);
    return [];
  }
  return (data || []).map((d) => ({ date: d.date, bristol_type: d.bristol_type as number }));
}

// ─── Journal Indicators ─────────────────────────────

export async function getJournalIndicators(
  consultantId: string,
  activeOnly = true
): Promise<JournalIndicator[]> {
  let query = supabase
    .from('consultant_journal_indicators')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('sort_order');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching journal indicators:', error);
    return [];
  }
  return data || [];
}

export async function createJournalIndicator(
  indicator: Omit<JournalIndicator, 'id' | 'created_at'>
): Promise<JournalIndicator | null> {
  const { data, error } = await supabase
    .from('consultant_journal_indicators')
    .insert(indicator)
    .select()
    .single();

  if (error) {
    console.error('Error creating journal indicator:', error);
    throw new Error(describeError(error));
  }
  return data;
}

export async function updateJournalIndicator(
  id: string,
  updates: Partial<JournalIndicator>
): Promise<JournalIndicator | null> {
  const { data, error } = await supabase
    .from('consultant_journal_indicators')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating journal indicator:', error);
    throw new Error(describeError(error));
  }
  return data;
}

export async function deleteJournalIndicator(id: string): Promise<void> {
  const { error } = await supabase
    .from('consultant_journal_indicators')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting journal indicator:', error);
    throw new Error(describeError(error));
  }
}

export async function bulkCreateIndicatorsFromPlan(
  consultantId: string,
  practitionerId: string,
  planId: string,
  indicators: Array<{ label: string; category: IndicatorCategory; value_type: IndicatorValueType }>
): Promise<JournalIndicator[]> {
  const rows = indicators.map((ind, i) => ({
    consultant_id: consultantId,
    practitioner_id: practitionerId,
    label: ind.label,
    category: ind.category,
    value_type: ind.value_type,
    source_plan_id: planId,
    sort_order: i,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from('consultant_journal_indicators')
    .insert(rows)
    .select();

  if (error) {
    console.error('Error bulk creating indicators:', error);
    throw new Error(describeError(error));
  }
  return data || [];
}
