/**
 * GET /api/mobile/journal/history
 * Get journal history
 *
 * Now reads from `journal_entries` (unified table) instead of `daily_journals`.
 * Supports date range filtering via startDate/endDate query params.
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = getSupabaseAdmin()
      .from('journal_entries')
      .select('*')
      .eq('consultant_id', consultantId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: entries, error } = await query;

    if (error) {
      throw error;
    }

    const formattedEntries = entries?.map((entry) => {
      const customIndicators = (entry.custom_indicators as Record<string, any>) || {};
      return {
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
        hydrationLiters: entry.hydration_liters,
        exerciseType: entry.exercise_type,
        customIndicators: entry.custom_indicators,
        source: entry.source,
        createdAt: entry.created_at,
      };
    }) || [];

    return NextResponse.json({ entries: formattedEntries });
  } catch (error) {
    console.error('Error getting journal history:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    );
  }
}
