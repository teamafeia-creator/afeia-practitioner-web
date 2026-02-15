/**
 * GET /api/mobile/cycle/today
 * Return today's cycle entry + computed phase + next period prediction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveConsultantId } from '@/lib/mobile-auth';
import { identifyCycleStarts, getCycleContext } from '@/lib/cycle-utils';
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

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);

    // Parallel fetches: today's entry, cycle profile, recent entries (180 days)
    const [entryResult, profileResult, entriesResult] = await Promise.all([
      supabase
        .from('cycle_entries')
        .select('*')
        .eq('consultant_id', consultantId)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('cycle_profiles')
        .select('*')
        .eq('consultant_id', consultantId)
        .maybeSingle(),
      supabase
        .from('cycle_entries')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('date', { ascending: false })
        .limit(180),
    ]);

    const profile = profileResult.data;
    const entries = (entriesResult.data ?? []) as CycleEntry[];

    // Compute cycle context
    let cycleInfo = null;
    if (profile?.is_tracking) {
      const ctx = getCycleContext(
        entries,
        profile.average_cycle_length,
        profile.average_period_length
      );
      if (ctx) {
        cycleInfo = {
          phase: ctx.phase,
          cycleDay: ctx.cycleDay,
          cycleStart: ctx.cycleStart.toISOString().slice(0, 10),
          nextPeriod: ctx.nextPeriod.toISOString().slice(0, 10),
          daysUntilNextPeriod: Math.max(
            0,
            Math.round((ctx.nextPeriod.getTime() - Date.now()) / 86_400_000)
          ),
        };
      }
    }

    return NextResponse.json({
      entry: entryResult.data ?? null,
      cycle: cycleInfo,
      isTracking: profile?.is_tracking ?? false,
    });
  } catch (error) {
    console.error('Error fetching cycle today:', error);
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
