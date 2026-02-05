/**
 * GET/POST /api/mobile/journal
 * Get or create journal entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolvePatientId } from '@/lib/mobile-auth';

export async function POST(request: NextRequest) {
  try {
    const patientId = await resolvePatientId(request);

    if (!patientId) {
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
      noteNaturopathe,
    } = body;

    if (!date || !mood || !alimentationQuality || !sleepQuality || !energyLevel) {
      return NextResponse.json(
        { message: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Get case file
    const { data: caseFile } = await getSupabaseAdmin()
      .from('case_files')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    // Check if entry exists for this date
    const { data: existing } = await getSupabaseAdmin()
      .from('daily_journals')
      .select('id')
      .eq('patient_id', patientId)
      .eq('date', date)
      .maybeSingle();

    const entryData = {
      patient_id: patientId,
      case_file_id: caseFile?.id,
      date,
      mood,
      alimentation_quality: alimentationQuality,
      sleep_quality: sleepQuality,
      energy_level: energyLevel,
      complements_taken: complementsTaken || [],
      problemes_particuliers: problemesParticuliers || null,
      note_naturopathe: noteNaturopathe || null,
    };

    let journalId;

    if (existing) {
      // Update existing
      const { data, error } = await getSupabaseAdmin()
        .from('daily_journals')
        .update({
          ...entryData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) throw error;
      journalId = data.id;
    } else {
      // Create new
      const { data, error } = await getSupabaseAdmin()
        .from('daily_journals')
        .insert(entryData)
        .select('id')
        .single();

      if (error) throw error;
      journalId = data.id;
    }

    return NextResponse.json({ journalId });
  } catch (error) {
    console.error('Error saving journal entry:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la sauvegarde du journal' },
      { status: 500 }
    );
  }
}
