/**
 * POST /api/mobile/cycle/entry
 * Upsert a cycle entry for a given date.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function POST(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json(
        { message: 'Date requise' },
        { status: 400 }
      );
    }

    const entryData: Record<string, unknown> = {
      consultant_id: consultantId,
      date,
      is_period: body.isPeriod ?? false,
      flow_intensity: body.flowIntensity ?? null,
      period_pain: body.periodPain ?? null,
      symptom_cramps: body.symptoms?.cramps ?? false,
      symptom_bloating: body.symptoms?.bloating ?? false,
      symptom_headache: body.symptoms?.headache ?? false,
      symptom_breast_tenderness: body.symptoms?.breast_tenderness ?? false,
      symptom_mood_swings: body.symptoms?.mood_swings ?? false,
      symptom_fatigue: body.symptoms?.fatigue ?? false,
      symptom_acne: body.symptoms?.acne ?? false,
      symptom_cravings: body.symptoms?.cravings ?? false,
      symptom_insomnia: body.symptoms?.insomnia ?? false,
      symptom_water_retention: body.symptoms?.water_retention ?? false,
      symptom_back_pain: body.symptoms?.back_pain ?? false,
      symptom_nausea: body.symptoms?.nausea ?? false,
      symptom_libido_high: body.symptoms?.libido_high ?? false,
      symptom_cervical_mucus: body.cervicalMucus ?? null,
      temperature: body.temperature ?? null,
      notes: body.notes ?? null,
      source: 'consultant',
    };

    const supabase = getSupabaseAdmin();

    // Check if entry exists for this date
    const { data: existing } = await supabase
      .from('cycle_entries')
      .select('id')
      .eq('consultant_id', consultantId)
      .eq('date', date)
      .maybeSingle();

    let result;

    if (existing) {
      const { id: _id, consultant_id: _cid, ...updateData } = entryData;
      const { data, error } = await supabase
        .from('cycle_entries')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('cycle_entries')
        .insert(entryData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ entryId: result.id });
  } catch (error) {
    console.error('Error saving cycle entry:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}
