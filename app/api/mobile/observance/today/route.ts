import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Get active observance items
    const { data: items, error: itemsError } = await supabase
      .from('plan_observance_items')
      .select('id, label, category, frequency')
      .eq('consultant_id', consultantId)
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get today's logs
    const itemIds = items.map((i) => i.id);
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

    const result = items.map((item: { id: string; label: string; category: string; frequency: string }) => ({
      id: item.id,
      label: item.label,
      category: item.category,
      frequency: item.frequency,
      done: logMap.get(item.id)?.done ?? false,
      notes: logMap.get(item.id)?.notes ?? null,
    }));

    return NextResponse.json({ items: result });
  } catch (err) {
    console.error('[mobile/observance/today] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
