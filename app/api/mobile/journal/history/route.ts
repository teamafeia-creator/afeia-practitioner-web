/**
 * GET /api/mobile/journal/history
 * Get journal history
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getBearerToken } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

export async function GET(request: NextRequest) {
  try {
    const patientId = await getPatientFromToken(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = getSupabaseAdmin()
      .from('daily_journals')
      .select('*')
      .eq('patient_id', patientId)
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

    const formattedEntries = entries?.map((entry) => ({
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
    })) || [];

    return NextResponse.json({ entries: formattedEntries });
  } catch (error) {
    console.error('Error getting journal history:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    );
  }
}
