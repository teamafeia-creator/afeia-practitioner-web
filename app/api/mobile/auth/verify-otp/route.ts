/**
 * POST /api/mobile/auth/verify-otp
 * Verify OTP code for patient onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { hashQuestionnaireCode } from '@/lib/server/questionnaireCodes';

// Get JWT secret with dev fallback
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'development' ? 'dev-jwt-secret-change-in-production' : '');
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { otp } = body;

    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
      return NextResponse.json(
        { message: 'Code OTP invalide' },
        { status: 400 }
      );
    }

    // Hash the code and look it up (use same hash function as send-code)
    const codeHash = hashQuestionnaireCode(otp);

    const { data: otpRecord, error } = await getSupabaseAdmin()
      .from('patient_questionnaire_codes')
      .select('id, patient_id, expires_at, used_at, revoked_at')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (error || !otpRecord) {
      return NextResponse.json(
        { valid: false, message: 'Code invalide' },
        { status: 200 }
      );
    }

    // Check if code has been used or revoked
    if (otpRecord.used_at || otpRecord.revoked_at) {
      return NextResponse.json(
        { valid: false, message: 'Ce code a déjà été utilisé' },
        { status: 200 }
      );
    }

    // Check if code has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, message: 'Ce code a expiré' },
        { status: 200 }
      );
    }

    // Get patient info
    const { data: patient } = await getSupabaseAdmin()
      .from('patients')
      .select('id, name, email')
      .eq('id', otpRecord.patient_id)
      .single();

    if (!patient) {
      return NextResponse.json(
        { valid: false, message: 'Patient non trouvé' },
        { status: 200 }
      );
    }

    // Check if patient already has a user account
    const { data: membership } = await getSupabaseAdmin()
      .from('patient_memberships')
      .select('patient_user_id')
      .eq('patient_id', patient.id)
      .maybeSingle();

    if (membership) {
      return NextResponse.json(
        { valid: false, message: 'Ce patient a déjà un compte. Veuillez vous connecter.' },
        { status: 200 }
      );
    }

    // Generate a temporary token for registration
    const tempToken = await new SignJWT({
      patientId: patient.id,
      otpId: otpRecord.id,
      purpose: 'registration',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30m')
      .sign(getJwtSecret());

    return NextResponse.json({
      valid: true,
      patientId: patient.id,
      patientEmail: patient.email,
      patientName: patient.name,
      tempToken,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la vérification du code' },
      { status: 500 }
    );
  }
}
