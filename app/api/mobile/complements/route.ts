/**
 * GET /api/mobile/complements
 * Get patient's prescribed complements
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

export async function GET(request: NextRequest) {
  try {
    const patientId = await getPatientFromToken(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Get case file
    const { data: caseFile } = await supabase
      .from('case_files')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (!caseFile) {
      return NextResponse.json({ complements: [] });
    }

    // Get complements
    const { data: complements, error } = await supabase
      .from('complements')
      .select('*')
      .eq('case_file_id', caseFile.id)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get today's tracking
    const today = new Date().toISOString().split('T')[0];
    const { data: tracking } = await supabase
      .from('complement_tracking')
      .select('complement_id, taken')
      .eq('patient_id', patientId)
      .eq('date', today);

    const trackingMap = new Map(
      tracking?.map((t) => [t.complement_id, t.taken]) || []
    );

    const formattedComplements = complements?.map((c) => ({
      id: c.id,
      name: c.name,
      dosage: c.dosage,
      frequency: c.frequency,
      durationDays: c.duration_days,
      startDate: c.start_date,
      endDate: c.end_date,
      instructions: c.instructions,
      active: c.active,
      takenToday: trackingMap.get(c.id) || false,
    })) || [];

    return NextResponse.json({ complements: formattedComplements });
  } catch (error) {
    console.error('Error getting complements:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des compléments' },
      { status: 500 }
    );
  }
}
