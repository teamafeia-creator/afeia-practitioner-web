/**
 * GET /api/mobile/journal/today
 * Get today's journal entry
 *
 * Now reads from `journal_entries` (unified table) instead of `daily_journals`.
 * Returns legacy-compatible camelCase fields + new v2 fields when present.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: entry, error } = await getSupabaseAdmin()
      .from('journal_entries')
      .select('*')
      .eq('consultant_id', consultantId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!entry) {
      return NextResponse.json({ entry: null });
    }

    // Extract legacy fields from custom_indicators if present
    const customIndicators = (entry.custom_indicators as Record<string, any>) || {};

    return NextResponse.json({
      entry: {
        id: entry.id,
        date: entry.date,
        mood: entry.mood,
        text: entry.text,
        sleepQuality: entry.sleep_quality,
        energyLevel: entry.energy_level,
        stressLevel: entry.stress_level,
        alimentationQuality: customIndicators.alimentation_quality || null,
        complementsTaken: customIndicators.complements_taken || [],
        problemesParticuliers: entry.text,
        bristolType: entry.bristol_type,
        bristolFrequency: entry.bristol_frequency,
        transitNotes: entry.transit_notes,
        hydrationLiters: entry.hydration_liters,
        hydrationType: entry.hydration_type,
        exerciseType: entry.exercise_type,
        exerciseDurationMinutes: entry.exercise_duration_minutes,
        exerciseIntensity: entry.exercise_intensity,
        customIndicators: entry.custom_indicators,
        source: entry.source,
        createdAt: entry.created_at,
      },
    });
  } catch (error) {
    console.error('Error getting today journal:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération du journal' },
      { status: 500 }
    );
  }
}
