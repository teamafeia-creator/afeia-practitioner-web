/**
 * POST /api/mobile/auth/refresh-token
 * Refresh access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh token requis' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let payload;
    try {
      const result = await jwtVerify(
        refreshToken,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );
      payload = result.payload;
    } catch {
      return NextResponse.json(
        { message: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    if (payload.type !== 'refresh') {
      return NextResponse.json(
        { message: 'Token invalide' },
        { status: 401 }
      );
    }

    // Get user
    const { data: user, error } = await getSupabaseAdmin()
      .from('users')
      .select('id, email, role, status')
      .eq('id', payload.sub)
      .single();

    if (error || !user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Utilisateur non trouvé ou désactivé' },
        { status: 401 }
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

    // Generate new access token
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

    return NextResponse.json({
      accessToken,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { message: 'Erreur lors du rafraîchissement du token' },
      { status: 500 }
    );
  }
}
