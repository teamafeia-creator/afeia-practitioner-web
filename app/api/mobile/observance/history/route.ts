import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const days = Math.min(30, parseInt(searchParams.get('days') || '7') || 7);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = new Date().toISOString().slice(0, 10);

  try {
    // Get items
    const { data: items } = await supabase
      .from('plan_observance_items')
      .select('id, label, category')
      .eq('consultant_id', consultantId)
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (!items || items.length === 0) {
      return NextResponse.json({ days: [] });
    }

    const itemIds = items.map((i: { id: string }) => i.id);
    const itemMap = new Map(items.map((i: { id: string; label: string; category: string }) => [i.id, i]));

    // Get logs for the period
    const { data: logs, error } = await supabase
      .from('plan_observance_logs')
      .select('observance_item_id, date, done, notes')
      .in('observance_item_id', itemIds)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by date
    const byDate = new Map<string, Array<{ id: string; label: string; category: string; done: boolean; notes?: string | null }>>();

    for (const log of (logs || [])) {
      const item = itemMap.get(log.observance_item_id) as { id: string; label: string; category: string } | undefined;
      if (!item) continue;

      const existing = byDate.get(log.date) ?? [];
      existing.push({
        id: item.id,
        label: item.label,
        category: item.category,
        done: log.done as boolean,
        notes: log.notes as string | null,
      });
      byDate.set(log.date, existing);
    }

    const result = Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dateItems]) => ({ date, items: dateItems }));

    return NextResponse.json({ days: result });
  } catch (err) {
    console.error('[mobile/observance/history] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
