/**
 * GET /api/mobile/cycle/history?months=3
 * Return cycle entries, identified starts, phases, and statistics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';
import {
  identifyCycleStarts,
  calculateAverageCycleLength,
  getCyclePhaseForDate,
} from '@/lib/cycle-utils';
import type { CycleEntry } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const consultantId = await resolveConsultantId(request);

    if (!consultantId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const months = parseInt(
      request.nextUrl.searchParams.get('months') || '3',
      10
    );
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startStr = startDate.toISOString().slice(0, 10);

    const supabase = getSupabaseAdmin();

    const [entriesResult, profileResult] = await Promise.all([
      supabase
        .from('cycle_entries')
        .select('*')
        .eq('consultant_id', consultantId)
        .gte('date', startStr)
        .order('date', { ascending: false }),
      supabase
        .from('cycle_profiles')
        .select('*')
        .eq('consultant_id', consultantId)
        .maybeSingle(),
    ]);

    const entries = (entriesResult.data ?? []) as CycleEntry[];
    const profile = profileResult.data;

    const cycleLength = profile?.average_cycle_length ?? 28;
    const periodLength = profile?.average_period_length ?? 5;

    const cycleStarts = identifyCycleStarts(entries);
    const averageCycleLength = calculateAverageCycleLength(cycleStarts);

    // Compute phases for each entry
    const entriesWithPhases = entries.map((entry) => {
      let phase: string | null = null;
      let cycleDay: number | null = null;

      for (let i = cycleStarts.length - 1; i >= 0; i--) {
        const csStr = cycleStarts[i].toISOString().slice(0, 10);
        if (entry.date >= csStr) {
          phase = getCyclePhaseForDate(entry.date, cycleStarts[i], cycleLength, periodLength);
          const diff = Math.round(
            (new Date(entry.date).getTime() - cycleStarts[i].getTime()) / 86_400_000
          );
          cycleDay = diff + 1;
          break;
        }
      }

      return { ...entry, phase, cycleDay };
    });

    return NextResponse.json({
      entries: entriesWithPhases,
      cycleStarts: cycleStarts.map((d) => d.toISOString().slice(0, 10)),
      stats: {
        averageCycleLength,
        cycleCount: cycleStarts.length,
        regularity: profile?.cycle_regularity ?? 'regular',
      },
    });
  } catch (error) {
    console.error('Error fetching cycle history:', error);
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
