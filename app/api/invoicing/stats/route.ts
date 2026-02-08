import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { getInvoiceStats } from '@/lib/invoicing/queries';
import { getCurrentFiscalYear } from '@/lib/invoicing/utils';

export async function GET(request: NextRequest) {
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
