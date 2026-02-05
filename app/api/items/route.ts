import { NextResponse } from 'next/server';

import { getItems } from '@/lib/api-data';
import { getBearerToken, verifyApiJwt } from '@/lib/auth';

export async function GET(request: Request) {
  const token = getBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    await verifyApiJwt(token);
    const items = await getItems();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Jeton invalide.' }, { status: 401 });
  }
}
