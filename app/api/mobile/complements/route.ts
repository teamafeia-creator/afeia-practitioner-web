/**
 * GET /api/mobile/complements
 * Get patient's prescribed complements
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

    // Get case file
    const { data: caseFile } = await getSupabaseAdmin()
      .from('case_files')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (!caseFile) {
      return NextResponse.json({ complements: [] });
    }

    // Get complements
    const { data: complements, error } = await getSupabaseAdmin()
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
    const { data: tracking } = await getSupabaseAdmin()
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
