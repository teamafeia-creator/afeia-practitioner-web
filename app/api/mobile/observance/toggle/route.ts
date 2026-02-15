import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { item_id, date, done, notes } = body;

    if (!item_id || !date || typeof done !== 'boolean') {
      return NextResponse.json({ message: 'Champs requis: item_id, date, done' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('plan_observance_logs')
      .upsert(
        {
          observance_item_id: item_id,
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
      console.error('[mobile/observance/toggle] error:', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ log: data });
  } catch (err) {
    console.error('[mobile/observance/toggle] error:', err);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
