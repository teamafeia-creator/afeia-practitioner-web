/**
 * POST /api/mobile/auth/login
 * Login for existing patients
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Find user
    const { data: user, error } = await getSupabaseAdmin()
      .from('users')
      .select('id, email, password_hash, role, status')
      .eq('email', email.toLowerCase())
      .eq('role', 'PATIENT')
      .single();

    if (error || !user) {
      return NextResponse.json(
        { message: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return NextResponse.json(
        { message: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Votre compte a été désactivé' },
        { status: 403 }
      );
    }

    // Get patient membership
    const { data: membership } = await getSupabaseAdmin()
      .from('patient_memberships')
      .select('patient_id')
      .eq('patient_user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'Compte patient non trouvé' },
        { status: 404 }
      );
    }

    // Get patient info
    const { data: patient } = await getSupabaseAdmin()
      .from('patients')
      .select('id, name, email, phone, status, is_premium')
      .eq('id', membership.patient_id)
      .single();

    // Check if anamnese exists
    const { data: anamnese } = await getSupabaseAdmin()
      .from('anamneses')
      .select('id')
      .eq('patient_id', membership.patient_id)
      .maybeSingle();

    // Generate tokens
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: 'PATIENT',
      patientId: membership.patient_id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('afeia-practitioner-web')
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const refreshToken = await new SignJWT({
      sub: user.id,
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
        email: user.email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        phone: patient?.phone,
        isPremium: patient?.is_premium || false,
      },
      needsAnamnese: !anamnese,
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
