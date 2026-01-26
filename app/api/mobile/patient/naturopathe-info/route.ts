/**
 * GET /api/mobile/patient/naturopathe-info
 * Get naturopathe info and consultation dates
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

    // Get patient with practitioner
    const { data: patient, error } = await getSupabaseAdmin()
      .from('patients')
      .select(`
        practitioner_id,
        practitioners:practitioner_id (
          id, full_name, email, phone, avatar_url, specializations
        )
      `)
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { message: 'Patient non trouvé' },
        { status: 404 }
      );
    }

    // Get case file for consultation dates
    const { data: caseFile } = await getSupabaseAdmin()
      .from('case_files')
      .select('last_consultation_date, next_consultation_date')
      .eq('patient_id', patientId)
      .maybeSingle();

    // Get last completed appointment
    const { data: lastAppointment } = await getSupabaseAdmin()
      .from('appointments')
      .select('starts_at')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get next scheduled appointment
    const { data: nextAppointment } = await getSupabaseAdmin()
      .from('appointments')
      .select('starts_at')
      .eq('patient_id', patientId)
      .eq('status', 'scheduled')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const practitioner = patient.practitioners as any;

    return NextResponse.json({
      naturopathe: practitioner ? {
        id: practitioner.id,
        fullName: practitioner.full_name,
        email: practitioner.email,
        phone: practitioner.phone,
        avatarUrl: practitioner.avatar_url,
        specializations: practitioner.specializations || [],
      } : null,
      lastConsultation: lastAppointment?.starts_at || caseFile?.last_consultation_date || null,
      nextConsultation: nextAppointment?.starts_at || caseFile?.next_consultation_date || null,
    });
  } catch (error) {
    console.error('Error getting naturopathe info:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération des informations' },
      { status: 500 }
    );
  }
}
