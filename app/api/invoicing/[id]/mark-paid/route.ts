import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { markPaidSchema } from '@/lib/invoicing/schemas';

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

    const body = await request.json();
    const validatedData = markPaidSchema.parse(body);

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

    if (invoice.status === 'paid') {
      return NextResponse.json({ message: 'Facture deja payee' }, { status: 400 });
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { message: 'Une facture annulee ne peut pas etre marquee comme payee' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('consultation_invoices')
      .update({
        status: 'paid',
        payment_method: validatedData.payment_method,
        payment_date: validatedData.payment_date || new Date().toISOString(),
        payment_notes: validatedData.payment_notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('invoice_history').insert({
      invoice_id: id,
      action: 'paid',
      user_id: userId,
      metadata: {
        payment_method: validatedData.payment_method,
        payment_date: validatedData.payment_date,
      },
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error('Erreur marquage paiement:', error);
    return NextResponse.json(
      { message: 'Erreur lors du marquage du paiement' },
      { status: 500 }
    );
  }
}
