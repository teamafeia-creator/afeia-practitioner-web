/**
 * POST /api/mobile/auth/login
 * Login for existing consultants
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

    // Get consultant membership
    const { data: membership } = await getSupabaseAdmin()
      .from('consultant_memberships')
      .select('consultant_id')
      .eq('consultant_user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'Compte consultant non trouvé' },
        { status: 404 }
      );
    }

    // Get consultant info
    const { data: consultant } = await getSupabaseAdmin()
      .from('consultants')
      .select('id, name, email, phone, status, is_premium')
      .eq('id', membership.consultant_id)
      .single();

    // Check if anamnese exists
    const { data: anamnese } = await getSupabaseAdmin()
      .from('anamneses')
      .select('id')
      .eq('consultant_id', membership.consultant_id)
      .maybeSingle();

    // Generate tokens
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: 'CONSULTANT',
      consultantId: membership.consultant_id,
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

    const nameParts = consultant?.name?.split(' ') || ['', ''];

    return NextResponse.json({
      accessToken,
      refreshToken,
      consultant: {
        id: consultant?.id,
        email: user.email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        phone: consultant?.phone,
        isPremium: consultant?.is_premium || false,
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
