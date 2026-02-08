import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { createPaymentLink } from '@/lib/invoicing/stripe';
import type { ConsultationInvoice } from '@/lib/invoicing/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const supabase = createSupabaseAdminClient();

    // Recuperer la facture
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('consultation_invoices')
      .select('*')
      .eq('id', id)
      .eq('practitioner_id', userId)
      .single();

    if (invoiceError || !invoiceData) {
      return NextResponse.json({ message: 'Facture introuvable' }, { status: 404 });
    }

    const invoice = invoiceData as ConsultationInvoice;

    if (invoice.status === 'paid') {
      return NextResponse.json({ message: 'Facture deja payee' }, { status: 400 });
    }

    // Recuperer le compte Stripe du praticien
    const { data: settings } = await supabase
      .from('practitioner_billing_settings')
      .select('stripe_account_id, stripe_charges_enabled')
      .eq('practitioner_id', userId)
      .single();

    if (!settings?.stripe_account_id || !settings.stripe_charges_enabled) {
      return NextResponse.json(
        { message: 'Stripe Connect non configure ou incomplet' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Creer le Payment Link
    const paymentLink = await createPaymentLink({
      stripeAccountId: settings.stripe_account_id,
      description: invoice.description,
      practitionerName: `${invoice.practitioner_snapshot.prenom} ${invoice.practitioner_snapshot.nom}`,
      invoiceNumero: invoice.numero || '',
      amountCents: Math.round(Number(invoice.montant) * 100),
      invoiceId: id,
      practitionerId: userId,
      consultantId: invoice.consultant_id,
      successUrl: `${appUrl}/paiement/succes?invoice_id=${id}`,
    });

    // Sauvegarder le lien dans la facture (expire dans 7 jours, comme defini dans createPaymentLink)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('consultation_invoices')
      .update({
        stripe_payment_link_url: paymentLink.url,
        stripe_payment_link_expires_at: expiresAt,
      })
      .eq('id', id);

    // Logger l'action
    await supabase.from('invoice_history').insert({
      invoice_id: id,
      action: 'payment_link_created',
      user_id: userId,
      metadata: { payment_link_id: paymentLink.id },
    });

    return NextResponse.json({
      payment_link_url: paymentLink.url,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('Erreur creation Payment Link:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la creation du lien de paiement' },
      { status: 500 }
    );
  }
}
