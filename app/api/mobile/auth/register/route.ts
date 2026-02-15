/**
 * POST /api/mobile/auth/register
 * Register a new consultant account
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function hashPassword(password: string): string {
  // In production, use bcrypt. For this example, using SHA-256
  return crypto.createHash('sha256').update(password).digest('hex');
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultantId, email, password, tempToken } = body;

    if (!consultantId || !email || !password || !tempToken) {
      return NextResponse.json(
        { message: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.message },
        { status: 400 }
      );
    }

    // Verify temp token
    let tokenPayload;
    try {
      const { payload } = await jwtVerify(
        tempToken,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );
      tokenPayload = payload;
    } catch {
      return NextResponse.json(
        { message: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    if (tokenPayload.consultantId !== consultantId || tokenPayload.purpose !== 'registration') {
      return NextResponse.json(
        { message: 'Token invalide' },
        { status: 401 }
      );
    }

    // Check if email is already in use
    const { data: existingUser } = await getSupabaseAdmin()
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { message: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Create user account
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    const { error: userError } = await getSupabaseAdmin()
      .from('users')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'CONSULTANT',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });

    if (userError) {
      console.error('Error creating user:', userError.message, userError.details, userError.code);
      return NextResponse.json(
        { message: 'Erreur lors de la création du compte utilisateur: ' + userError.message },
        { status: 500 }
      );
    }

    // Create consultant membership
    const { error: membershipError } = await getSupabaseAdmin()
      .from('consultant_memberships')
      .insert({
        consultant_id: consultantId,
        consultant_user_id: userId,
      });

    if (membershipError) {
      // Rollback user creation
      await getSupabaseAdmin().from('users').delete().eq('id', userId);
      console.error('Error creating membership:', membershipError.message, membershipError.details, membershipError.code);
      return NextResponse.json(
        { message: 'Erreur lors de la liaison du compte: ' + membershipError.message },
        { status: 500 }
      );
    }

    // Mark OTP as used in both tables (only one will match)
    await getSupabaseAdmin()
      .from('consultant_questionnaire_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenPayload.otpId);

    await getSupabaseAdmin()
      .from('otp_codes')
      .update({ used: true })
      .eq('id', tokenPayload.otpId);

    // Get consultant info
    const { data: consultant } = await getSupabaseAdmin()
      .from('consultants')
      .select('id, name, email, phone, status, is_premium, practitioner_id')
      .eq('id', consultantId)
      .single();

    // Check if anamnesis exists (check both old and new tables)
    const { data: anamnesisNew } = await getSupabaseAdmin()
      .from('consultant_anamnesis')
      .select('id, answers')
      .eq('consultant_id', consultantId)
      .maybeSingle();

    const { data: anamnesisOld } = await getSupabaseAdmin()
      .from('anamneses')
      .select('id')
      .eq('consultant_id', consultantId)
      .maybeSingle();

    // Check if consultant has a linked preliminary questionnaire
    const { data: preliminaryQuestionnaire } = await getSupabaseAdmin()
      .from('preliminary_questionnaires')
      .select('id')
      .eq('linked_consultant_id', consultantId)
      .eq('status', 'linked_to_consultant')
      .maybeSingle();

    // Has anamnesis if any of these exist with actual answers
    const hasAnamnesis = Boolean(
      anamnesisOld ||
      preliminaryQuestionnaire ||
      (anamnesisNew?.answers && Object.keys(anamnesisNew.answers).length > 0)
    );

    // Generate tokens
    const accessToken = await new SignJWT({
      sub: userId,
      email: email.toLowerCase(),
      role: 'CONSULTANT',
      consultantId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('afeia-practitioner-web')
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const refreshToken = await new SignJWT({
      sub: userId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const nameParts = consultant?.name?.split(' ') || ['', ''];

    return NextResponse.json({
      accessToken,
      refreshToken,
      consultant: {
        id: consultant?.id,
        email: email.toLowerCase(),
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        phone: consultant?.phone,
        isPremium: consultant?.is_premium || false,
      },
      needsAnamnese: !hasAnamnesis,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { message: 'Erreur lors de la création du compte: ' + errMsg },
      { status: 500 }
    );
  }
}
