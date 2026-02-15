/**
 * POST /api/mobile/journal
 * Create or update a journal entry
 *
 * Now writes to `journal_entries` (unified table) instead of `daily_journals`.
 * Maps legacy fields: alimentationQuality → custom_indicators, problemesParticuliers → text.
 * Sets source='mobile' on every write.
 *
 * For the full-featured journal API, prefer /api/mobile/journal/v2.
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
    const {
      date,
      mood,
      alimentationQuality,
      sleepQuality,
      energyLevel,
      complementsTaken,
      problemesParticuliers,
    } = body;

    if (!date || !mood || !alimentationQuality || !sleepQuality || !energyLevel) {
      return NextResponse.json(
        { message: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Build custom_indicators with legacy alimentation_quality + complements
    const customIndicators: Record<string, any> = {};
    if (alimentationQuality) {
      customIndicators.alimentation_quality = alimentationQuality;
    }
    if (complementsTaken && Array.isArray(complementsTaken) && complementsTaken.length > 0) {
      customIndicators.complements_taken = complementsTaken;
    }

    const payload = {
      consultant_id: consultantId,
      date,
      mood,
      sleep_quality: sleepQuality,
      energy_level: energyLevel,
      text: problemesParticuliers || null,
      custom_indicators: Object.keys(customIndicators).length > 0 ? customIndicators : null,
      source: 'mobile' as const,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await getSupabaseAdmin()
      .from('journal_entries')
      .upsert(payload, { onConflict: 'consultant_id,date' })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ journalId: data.id });
  } catch (error) {
    console.error('Error saving journal entry:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde du journal' },
      { status: 500 }
    );
  }
}
