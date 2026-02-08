import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { InvoicePDFDocument } from '@/lib/invoicing/pdf-generator';
import { buildInvoiceEmailText } from '@/lib/invoicing/email-templates';
import type { ConsultationInvoice, InvoiceDocumentType } from '@/lib/invoicing/types';
import React from 'react';

export async function POST(request: NextRequest) {
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

    const { invoice_id } = await request.json();

    const supabase = createSupabaseAdminClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from('consultation_invoices')
      .select('*')
      .eq('id', invoice_id)
      .eq('practitioner_id', userId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ message: 'Facture introuvable' }, { status: 404 });
    }

    const typedInvoice = invoice as ConsultationInvoice;

    // Recuperer les parametres
    const { data: settings } = await supabase
      .from('practitioner_billing_settings')
      .select('libelle_document, email_copie_praticien')
      .eq('practitioner_id', userId)
      .single();

    const documentType = (settings?.libelle_document || 'facture') as InvoiceDocumentType;

    // Generer le PDF
    const pdfElement = React.createElement(InvoicePDFDocument, {
      invoice: typedInvoice,
      documentType,
    });
    const pdfBuffer = await renderToBuffer(pdfElement as Parameters<typeof renderToBuffer>[0]);

    // Construire l'email
    const { subject, text, html } = buildInvoiceEmailText(typedInvoice, documentType);

    const consultantEmail = typedInvoice.consultant_snapshot.email;
    if (!consultantEmail) {
      return NextResponse.json(
        { message: 'Le consultant n\'a pas d\'adresse email' },
        { status: 400 }
      );
    }

    // Envoyer l'email via Resend API directement avec piece jointe
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.info('RESEND_API_KEY not configured. Skipping email send.');
      return NextResponse.json({ success: true, skipped: true });
    }

    const filename = `${documentType}_${typedInvoice.numero || 'brouillon'}.pdf`;

    const emailPayload: Record<string, unknown> = {
      from: 'AFEIA <onboarding@resend.dev>',
      to: consultantEmail,
      subject,
      html,
      text,
      attachments: [
        {
          filename,
          content: Buffer.from(pdfBuffer).toString('base64'),
        },
      ],
    };

    // Copie au praticien si demande
    if (settings?.email_copie_praticien) {
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('email')
        .eq('id', userId)
        .single();
      if (practitioner?.email) {
        emailPayload.cc = practitioner.email;
      }
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Resend API error:', response.status, errorBody);
      throw new Error(`Email provider error (${response.status})`);
    }

    // Logger l'action
    await supabase.from('invoice_history').insert({
      invoice_id,
      action: 'sent',
      user_id: userId,
      metadata: { email: consultantEmail },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json(
      { message: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}
