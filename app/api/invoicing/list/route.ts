import { NextRequest, NextResponse } from 'next/server';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import { listInvoices } from '@/lib/invoicing/queries';

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const payload = await verifyApiJwt(token);
    const userId = payload.sub;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const consultant_id = searchParams.get('consultant_id') || undefined;
    const annee_fiscale = searchParams.get('annee_fiscale')
      ? parseInt(searchParams.get('annee_fiscale')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    const result = await listInvoices(userId, {
      status,
      consultant_id,
      annee_fiscale,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur liste factures:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la recuperation des factures' },
      { status: 500 }
    );
  }
}
