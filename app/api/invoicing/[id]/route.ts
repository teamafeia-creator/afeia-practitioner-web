import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { getInvoiceById, getInvoiceHistory } from '@/lib/invoicing/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
    }
    const userId = authData.user.id;
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
