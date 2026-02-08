import { NextRequest, NextResponse } from 'next/server';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import { getInvoiceById, getInvoiceHistory } from '@/lib/invoicing/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const payload = await verifyApiJwt(token);
    const userId = payload.sub;
    const { id } = await params;

    const invoice = await getInvoiceById(id, userId);
    if (!invoice) {
      return NextResponse.json({ message: 'Facture introuvable' }, { status: 404 });
    }

    const history = await getInvoiceHistory(id);

    return NextResponse.json({ invoice, history });
  } catch (error) {
    console.error('Erreur detail facture:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la recuperation de la facture' },
      { status: 500 }
    );
  }
}
