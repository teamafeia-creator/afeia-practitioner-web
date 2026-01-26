/**
 * POST /api/mobile/auth/register
 * Register a new patient account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { patientId, email, password, tempToken } = body;

    if (!patientId || !email || !password || !tempToken) {
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

    if (tokenPayload.patientId !== patientId || tokenPayload.purpose !== 'registration') {
      return NextResponse.json(
        { message: 'Token invalide' },
        { status: 401 }
      );
    }

    // Check if email is already in use
    const { data: existingUser } = await supabase
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

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'PATIENT',
        status: 'ACTIVE',
      });

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { message: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    // Create patient membership
    const { error: membershipError } = await supabase
      .from('patient_memberships')
      .insert({
        patient_id: patientId,
        patient_user_id: userId,
      });

    if (membershipError) {
      // Rollback user creation
      await supabase.from('users').delete().eq('id', userId);
      console.error('Error creating membership:', membershipError);
      return NextResponse.json(
        { message: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    // Mark OTP as used
    await supabase
      .from('patient_questionnaire_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenPayload.otpId);

    // Get patient info
    const { data: patient } = await supabase
      .from('patients')
      .select('id, name, email, phone, status, is_premium, practitioner_id')
      .eq('id', patientId)
      .single();

    // Check if anamnese exists
    const { data: anamnese } = await supabase
      .from('anamneses')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();

    // Generate tokens
    const accessToken = await new SignJWT({
      sub: userId,
      email: email.toLowerCase(),
      role: 'PATIENT',
      patientId,
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

    const nameParts = patient?.name?.split(' ') || ['', ''];

    return NextResponse.json({
      accessToken,
      refreshToken,
      patient: {
        id: patient?.id,
        email: email.toLowerCase(),
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        phone: patient?.phone,
        isPremium: patient?.is_premium || false,
      },
      needsAnamnese: !anamnese,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la création du compte' },
      { status: 500 }
    );
  }
}
