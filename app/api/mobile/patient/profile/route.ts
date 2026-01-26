/**
 * GET/PUT /api/mobile/patient/profile
 * Get or update patient profile
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

    // Get patient with practitioner info
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        id, name, email, phone, status, is_premium,
        practitioner_id,
        practitioners:practitioner_id (
          id, full_name, email, phone, avatar_url
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

    // Get subscription info if premium
    let subscription = null;
    if (patient.is_premium) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, plan, status, current_period_end, cancel_at')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .maybeSingle();
      subscription = sub;
    }

    const nameParts = patient.name?.split(' ') || ['', ''];
    const practitioner = patient.practitioners as any;

    return NextResponse.json({
      id: patient.id,
      email: patient.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phone: patient.phone,
      isPremium: patient.is_premium || false,
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAt: subscription.cancel_at,
      } : null,
      naturopathe: practitioner ? {
        id: practitioner.id,
        fullName: practitioner.full_name,
        email: practitioner.email,
        phone: practitioner.phone,
        avatarUrl: practitioner.avatar_url,
      } : null,
    });
  } catch (error) {
    console.error('Error getting patient profile:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const patientId = await getPatientFromToken(request);

    if (!patientId) {
      return NextResponse.json(
        { message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    // Build update object
    const updates: Record<string, any> = {};
    if (firstName !== undefined || lastName !== undefined) {
      updates.name = `${firstName || ''} ${lastName || ''}`.trim();
    }
    if (phone !== undefined) {
      updates.phone = phone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const { data: patient, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .select('id, name, email, phone, is_premium')
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { message: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    const nameParts = patient.name?.split(' ') || ['', ''];

    return NextResponse.json({
      id: patient.id,
      email: patient.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phone: patient.phone,
      isPremium: patient.is_premium || false,
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}
