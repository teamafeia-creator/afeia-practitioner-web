/**
 * GET /api/mobile/journal/today
 * Get today's journal entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolvePatientId } from '@/lib/mobile-auth';

export async function GET(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: entry, error } = await getSupabaseAdmin()
      .from('daily_journals')
      .select('*')
      .eq('patient_id', patientId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!entry) {
      return NextResponse.json({ entry: null });
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        date: entry.date,
        mood: entry.mood,
        alimentationQuality: entry.alimentation_quality,
        sleepQuality: entry.sleep_quality,
        energyLevel: entry.energy_level,
        complementsTaken: entry.complements_taken || [],
        problemesParticuliers: entry.problemes_particuliers,
        noteNaturopathe: entry.note_naturopathe,
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
