import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import { updateInvoiceSchema } from '@/lib/invoicing/schemas';

export async function PATCH(
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

    const body = await request.json();
    const validatedData = updateInvoiceSchema.parse(body);

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

    // Seuls les brouillons peuvent etre modifies
    if (invoice.status !== 'draft' && validatedData.status === undefined) {
      return NextResponse.json(
        { message: 'Seuls les brouillons peuvent etre modifies' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('consultation_invoices')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Logger l'action
    await supabase.from('invoice_history').insert({
      invoice_id: id,
      action: 'updated',
      user_id: userId,
      metadata: validatedData,
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error('Erreur mise a jour facture:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la mise a jour de la facture' },
      { status: 500 }
    );
  }
}
