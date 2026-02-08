import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

export async function POST(
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

    const supabase = createSupabaseAdminClient();

    // Verifier que la facture existe et appartient au praticien
    const { data: invoice, error: fetchError } = await supabase
      .from('consultation_invoices')
      .select('*')
      .eq('id', id)
      .eq('practitioner_id', userId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ message: 'Facture introuvable' }, { status: 404 });
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json({ message: 'Facture deja annulee' }, { status: 400 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { message: 'Une facture payee ne peut pas etre annulee en V1' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('consultation_invoices')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('invoice_history').insert({
      invoice_id: id,
      action: 'cancelled',
      user_id: userId,
      metadata: { previous_status: invoice.status },
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error('Erreur annulation facture:', error);
    return NextResponse.json(
      { message: 'Erreur lors de l\'annulation de la facture' },
      { status: 500 }
    );
  }
}
