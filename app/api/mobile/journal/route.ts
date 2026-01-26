/**
 * GET/POST /api/mobile/journal
 * Get or create journal entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { getBearerToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getPatientFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = getBearerToken(authHeader);

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    return payload.patientId as string;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const patientId = await getPatientFromToken(request);

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
    const { data: caseFile } = await supabase
      .from('case_files')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    // Check if entry exists for this date
    const { data: existing } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
