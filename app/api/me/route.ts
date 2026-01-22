import { NextResponse } from 'next/server';

import { findUserById } from '@/lib/api-data';
import { getBearerToken, verifyApiJwt } from '@/lib/auth';

export async function GET(request: Request) {
  const token = getBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    const payload = await verifyApiJwt(token);
    const user = findUserById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Jeton invalide.' }, { status: 401 });
  }
}
