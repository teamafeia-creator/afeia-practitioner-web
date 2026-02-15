import { NextRequest, NextResponse } from 'next/server';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { normalizeMood } from '@/lib/journal-constants';

export async function GET(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ message:'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const range = searchParams.get('range'); // 'week' or 'month'

  try {
    if (range) {
      // Return multiple entries for the period
      const startDate = new Date();
      if (range === 'week') startDate.setDate(startDate.getDate() - 7);
      else if (range === 'month') startDate.setDate(startDate.getDate() - 30);

      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('consultant_id', consultantId)
        .gte('date', startDate.toISOString().slice(0, 10))
        .order('date', { ascending: false });

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      return NextResponse.json({ entries: entries || [] });
    }

    // Single date entry + active indicators
    const [entryResult, indicatorsResult] = await Promise.all([
      supabase
        .from('journal_entries')
        .select('*')
        .eq('consultant_id', consultantId)
        .eq('date', date)
        .maybeSingle(),
      supabase
        .from('consultant_journal_indicators')
        .select('*')
        .eq('consultant_id', consultantId)
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    return NextResponse.json({
      entry: entryResult.data || null,
      indicators: indicatorsResult.data || [],
    });
  } catch (err) {
    console.error('[mobile/journal/v2] GET error:', err);
    return NextResponse.json({ message:'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const consultantId = await resolveConsultantId(request);
  if (!consultantId) {
    return NextResponse.json({ message:'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const date = body.date || new Date().toISOString().slice(0, 10);
    const mood = body.mood ? normalizeMood(body.mood) : null;

    const payload = {
      consultant_id: consultantId,
      date,
      mood,
      text: body.text ?? null,
      sleep_quality: body.sleep_quality ?? null,
      stress_level: body.stress_level ?? null,
      energy_level: body.energy_level ?? null,
      bristol_type: body.bristol_type ?? null,
      bristol_frequency: body.bristol_frequency ?? null,
      transit_notes: body.transit_notes ?? null,
      hydration_liters: body.hydration_liters ?? null,
      hydration_type: body.hydration_type ?? null,
      exercise_type: body.exercise_type ?? null,
      exercise_duration_minutes: body.exercise_duration_minutes ?? null,
      exercise_intensity: body.exercise_intensity ?? null,
      custom_indicators: body.custom_indicators ?? [],
      source: 'mobile' as const,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('journal_entries')
      .upsert(payload, { onConflict: 'consultant_id,date' })
      .select()
      .single();

    if (error) {
      console.error('[mobile/journal/v2] POST error:', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error('[mobile/journal/v2] POST error:', err);
    return NextResponse.json({ message:'Erreur serveur' }, { status: 500 });
  }
}
