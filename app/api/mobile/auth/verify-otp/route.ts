/**
 * POST /api/mobile/auth/verify-otp
 * Verify OTP code for consultant onboarding
 *
 * Checks two tables:
 * 1. consultant_questionnaire_codes (hashed) — from questionnaire send-code flow
 * 2. otp_codes (plaintext) — from dashboard send-activation-code flow
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

    const supabase = getSupabaseAdmin();

    // --- Strategy 1: Check consultant_questionnaire_codes (hashed) ---
    const codeHash = hashQuestionnaireCode(otp);
    const { data: questionnaireRecord } = await supabase
      .from('consultant_questionnaire_codes')
      .select('id, consultant_id, expires_at, used_at, revoked_at')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (questionnaireRecord) {
      // Found in questionnaire codes — validate it
      if (questionnaireRecord.used_at || questionnaireRecord.revoked_at) {
        return NextResponse.json(
          { valid: false, message: 'Ce code a déjà été utilisé' },
          { status: 200 }
        );
      }

      if (new Date(questionnaireRecord.expires_at) < new Date()) {
        return NextResponse.json(
          { valid: false, message: 'Ce code a expiré' },
          { status: 200 }
        );
      }

      return await buildSuccessResponse(supabase, questionnaireRecord.consultant_id, questionnaireRecord.id);
    }

    // --- Strategy 2: Fallback to otp_codes (plaintext, from dashboard activation) ---
    const { data: otpCodesRecord } = await supabase
      .from('otp_codes')
      .select('id, consultant_id, email, expires_at, used')
      .eq('code', otp)
      .eq('type', 'activation')
      .eq('used', false)
      .maybeSingle();

    if (!otpCodesRecord) {
      return NextResponse.json(
        { valid: false, message: 'Code invalide' },
        { status: 200 }
      );
    }

    if (otpCodesRecord.used) {
      return NextResponse.json(
        { valid: false, message: 'Ce code a déjà été utilisé' },
        { status: 200 }
      );
    }

    if (new Date(otpCodesRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, message: 'Ce code a expiré' },
        { status: 200 }
      );
    }

    // Resolve consultant_id — may be null in otp_codes, try email fallback
    let consultantId = otpCodesRecord.consultant_id;
    if (!consultantId && otpCodesRecord.email) {
      const { data: consultantByEmail } = await supabase
        .from('consultants')
        .select('id')
        .eq('email', otpCodesRecord.email)
        .maybeSingle();
      if (consultantByEmail) {
        consultantId = consultantByEmail.id;
      }
    }

    if (!consultantId) {
      return NextResponse.json(
        { valid: false, message: 'Consultant non trouvé pour ce code' },
        { status: 200 }
      );
    }

    return await buildSuccessResponse(supabase, consultantId, otpCodesRecord.id);
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la vérification du code' },
      { status: 500 }
    );
  }
}

async function buildSuccessResponse(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  consultantId: string,
  otpRecordId: string,
) {
  // Get consultant info
  const { data: consultant } = await supabase
    .from('consultants')
    .select('id, name, email')
    .eq('id', consultantId)
    .single();

  if (!consultant) {
    return NextResponse.json(
      { valid: false, message: 'Consultant non trouvé' },
      { status: 200 }
    );
  }

  // Check if consultant already has a user account
  const { data: membership } = await supabase
    .from('consultant_memberships')
    .select('consultant_user_id')
    .eq('consultant_id', consultant.id)
    .maybeSingle();

  if (membership) {
    return NextResponse.json(
      { valid: false, message: 'Ce consultant a déjà un compte. Veuillez vous connecter.' },
      { status: 200 }
    );
  }

  // Generate a temporary token for registration
  const tempToken = await new SignJWT({
    consultantId: consultant.id,
    otpId: otpRecordId,
    purpose: 'registration',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(getJwtSecret());

  return NextResponse.json({
    valid: true,
    consultantId: consultant.id,
    consultantEmail: consultant.email,
    consultantName: consultant.name,
    tempToken,
  });
}
