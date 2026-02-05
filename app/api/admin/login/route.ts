import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail, setAdminCookie } from '@/lib/server/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email manquant.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allowed = await isAdminEmail(normalizedEmail);

    if (!allowed) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const requiredPassword = process.env.ADMIN_PASSWORD;
    if (requiredPassword && password !== requiredPassword) {
      return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    setAdminCookie(response, normalizedEmail);
    return response;
  } catch (error) {
    console.error('[admin] login error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
