import { supabase } from '../supabase';
import type { ObservanceItem, ObservanceLog, ObservanceSummary, ObservanceCategoryRate, ObservanceCategory } from '../types';

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

export async function getObservanceItems(
  consultantId: string,
  planId?: string,
  activeOnly = true
): Promise<ObservanceItem[]> {
  let query = supabase
    .from('plan_observance_items')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('category')
    .order('sort_order');

  if (planId) {
    query = query.eq('consultant_plan_id', planId);
  }
  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching observance items:', error);
    return [];
  }
  return data || [];
}

export async function createObservanceItem(
  item: Omit<ObservanceItem, 'id' | 'created_at'>
): Promise<ObservanceItem | null> {
  const { data, error } = await supabase
    .from('plan_observance_items')
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error('Error creating observance item:', error);
    throw new Error(describeError(error));
  }
  return data;
}

export async function bulkCreateObservanceItems(
  items: Array<Omit<ObservanceItem, 'id' | 'created_at'>>
): Promise<ObservanceItem[]> {
  if (items.length === 0) return [];

  const { data, error } = await supabase
    .from('plan_observance_items')
    .insert(items)
    .select();

  if (error) {
    console.error('Error bulk creating observance items:', error);
    throw new Error(describeError(error));
  }
  return data || [];
}

export async function updateObservanceItem(
  id: string,
  updates: Partial<ObservanceItem>
): Promise<ObservanceItem | null> {
  const { data, error } = await supabase
    .from('plan_observance_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating observance item:', error);
    throw new Error(describeError(error));
  }
  return data;
}

export async function deleteObservanceItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('plan_observance_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting observance item:', error);
    throw new Error(describeError(error));
  }
}

export async function toggleObservanceLog(
  itemId: string,
  consultantId: string,
  date: string,
  done: boolean,
  notes?: string
): Promise<ObservanceLog | null> {
  const { data, error } = await supabase
    .from('plan_observance_logs')
    .upsert(
      {
        observance_item_id: itemId,
        consultant_id: consultantId,
        date,
        done,
        notes: notes ?? null,
      },
      { onConflict: 'observance_item_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error toggling observance log:', error);
    throw new Error(describeError(error));
  }
  return data;
}

export async function getObservanceLogs(
  consultantId: string,
  options: { startDate: string; endDate: string }
): Promise<ObservanceLog[]> {
  const { data, error } = await supabase
    .from('plan_observance_logs')
    .select(`
      *,
      plan_observance_items!inner(label, category, frequency)
    `)
    .eq('consultant_id', consultantId)
    .gte('date', options.startDate)
    .lte('date', options.endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching observance logs:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const item = row.plan_observance_items as Record<string, unknown> | undefined;
    return {
      id: row.id as string,
      observance_item_id: row.observance_item_id as string,
      consultant_id: row.consultant_id as string,
      date: row.date as string,
      done: row.done as boolean,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      label: item?.label as string | undefined,
      category: item?.category as ObservanceCategory | undefined,
      frequency: item?.frequency as ObservanceFrequency | undefined,
    };
  });
}

export async function getObservanceLogsToday(
  consultantId: string
): Promise<Array<ObservanceItem & { done: boolean; log_notes?: string | null }>> {
  const today = new Date().toISOString().slice(0, 10);

  // Get active items
  const { data: items, error: itemsError } = await supabase
    .from('plan_observance_items')
    .select('*')
    .eq('consultant_id', consultantId)
    .eq('is_active', true)
    .order('category')
    .order('sort_order');

  if (itemsError || !items || items.length === 0) {
    return [];
  }

  const itemIds = items.map((i: { id: string }) => i.id);

  // Get today's logs
  const { data: logs } = await supabase
    .from('plan_observance_logs')
    .select('observance_item_id, done, notes')
    .in('observance_item_id', itemIds)
    .eq('date', today);

  const logMap = new Map<string, { observance_item_id: string; done: boolean; notes: string | null }>(
    (logs || []).map((l: { observance_item_id: string; done: boolean; notes: string | null }) => [
      l.observance_item_id,
      l,
    ])
  );

  return items.map((item: ObservanceItem) => ({
    ...item,
    done: logMap.get(item.id)?.done ?? false,
    log_notes: logMap.get(item.id)?.notes ?? null,
  }));
}

export async function calculateObservanceRates(
  consultantId: string,
  days: number
): Promise<ObservanceSummary> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  // Get active items
  const { data: items } = await supabase
    .from('plan_observance_items')
    .select('id, category, frequency, weekly_target')
    .eq('consultant_id', consultantId)
    .eq('is_active', true);

  if (!items || items.length === 0) {
    return { globalRate: 0, categories: [], period: { start: startStr, end: endStr } };
  }

  const itemIds = items.map((i: { id: string }) => i.id);

  // Get logs for the period
  const { data: logs } = await supabase
    .from('plan_observance_logs')
    .select('observance_item_id, done')
    .in('observance_item_id', itemIds)
    .gte('date', startStr)
    .lte('date', endStr)
    .eq('done', true);

  const doneCountByItem = new Map<string, number>();
  (logs || []).forEach((l: { observance_item_id: string }) => {
    doneCountByItem.set(l.observance_item_id, (doneCountByItem.get(l.observance_item_id) ?? 0) + 1);
  });

  // Calculate rates by category
  const categoryRates = new Map<string, { total: number; rates: number[] }>();

  for (const item of items) {
    const cat = item.category as string;
    const doneCount = doneCountByItem.get(item.id) ?? 0;
    let rate: number;

    if (item.frequency === 'weekly') {
      const weeks = Math.max(1, Math.ceil(days / 7));
      const target = (item.weekly_target ?? 1) * weeks;
      rate = target > 0 ? Math.min(100, (doneCount / target) * 100) : 0;
    } else if (item.frequency === 'daily') {
      rate = days > 0 ? Math.min(100, (doneCount / days) * 100) : 0;
    } else {
      // as_needed: if any done, count as 100%
      rate = doneCount > 0 ? 100 : 0;
    }

    const existing = categoryRates.get(cat) ?? { total: 0, rates: [] };
    existing.total++;
    existing.rates.push(rate);
    categoryRates.set(cat, existing);
  }

  const categories: ObservanceCategoryRate[] = [];
  let globalTotal = 0;
  let globalSum = 0;

  for (const [cat, data] of categoryRates) {
    const avgRate = data.rates.reduce((sum, r) => sum + r, 0) / data.rates.length;
    categories.push({
      category: cat as ObservanceCategory,
      rate: Math.round(avgRate),
      itemCount: data.total,
    });
    globalSum += avgRate * data.total;
    globalTotal += data.total;
  }

  const globalRate = globalTotal > 0 ? Math.round(globalSum / globalTotal) : 0;

  return {
    globalRate,
    categories: categories.sort((a, b) => b.rate - a.rate),
    period: { start: startStr, end: endStr },
  };
}

export async function getObservanceRatesForDashboard(
  practitionerId: string,
  days: number
): Promise<{ avgRate: number; consultants: Array<{ consultant_id: string; name: string; rate: number }> }> {
  // Get all consultants with observance items
  const { data: consultants } = await supabase
    .from('consultants')
    .select('id, name')
    .eq('practitioner_id', practitionerId)
    .is('deleted_at', null);

  if (!consultants || consultants.length === 0) {
    return { avgRate: 0, consultants: [] };
  }

  const results: Array<{ consultant_id: string; name: string; rate: number }> = [];

  for (const c of consultants) {
    const { data: items } = await supabase
      .from('plan_observance_items')
      .select('id')
      .eq('consultant_id', c.id)
      .eq('is_active', true)
      .limit(1);

    if (!items || items.length === 0) continue;

    const summary = await calculateObservanceRates(c.id, days);
    results.push({
      consultant_id: c.id,
      name: c.name || 'Consultant',
      rate: summary.globalRate,
    });
  }

  const avgRate = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.rate, 0) / results.length)
    : 0;

  return {
    avgRate,
    consultants: results.sort((a, b) => a.rate - b.rate),
  };
}
