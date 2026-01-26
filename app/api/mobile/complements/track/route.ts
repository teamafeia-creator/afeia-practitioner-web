/**
 * POST /api/mobile/complements/track
 * Track complement intake
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
    const { complementId, date, taken } = body;

    if (!complementId || !date || taken === undefined) {
      return NextResponse.json(
        { message: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Check if tracking exists for this date
    const { data: existing } = await getSupabaseAdmin()
      .from('complement_tracking')
      .select('id')
      .eq('complement_id', complementId)
      .eq('patient_id', patientId)
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      // Update existing
      await getSupabaseAdmin()
        .from('complement_tracking')
        .update({
          taken,
          time_taken: taken ? new Date().toISOString() : null,
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await getSupabaseAdmin()
        .from('complement_tracking')
        .insert({
          complement_id: complementId,
          patient_id: patientId,
          date,
          taken,
          time_taken: taken ? new Date().toISOString() : null,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking complement:', error);
    return NextResponse.json(
      { message: 'Erreur lors du suivi du complément' },
      { status: 500 }
    );
  }
}
