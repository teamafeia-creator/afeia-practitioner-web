import { NextResponse } from 'next/server';

import { getItemById } from '@/lib/api-data';
import { getBearerToken, verifyApiJwt } from '@/lib/auth';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, context: RouteContext) {
  const token = getBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    await verifyApiJwt(token);
    const item = getItemById(context.params.id);
    if (!item) {
      return NextResponse.json({ error: 'Élément introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: 'Jeton invalide.' }, { status: 401 });
  }
}
