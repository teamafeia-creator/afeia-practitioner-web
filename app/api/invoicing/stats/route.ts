import { NextRequest, NextResponse } from 'next/server';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import { getInvoiceStats } from '@/lib/invoicing/queries';
import { getCurrentFiscalYear } from '@/lib/invoicing/utils';

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const payload = await verifyApiJwt(token);
    const userId = payload.sub;

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!)
      : getCurrentFiscalYear();

    const stats = await getInvoiceStats(userId, year);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erreur stats factures:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la recuperation des statistiques' },
      { status: 500 }
    );
  }
}
