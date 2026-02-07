import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import { InvoicePDFDocument } from '@/lib/invoicing/pdf-generator';
import type { ConsultationInvoice, InvoiceDocumentType } from '@/lib/invoicing/types';
import React from 'react';

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const payload = await verifyApiJwt(token);
    const userId = payload.sub;

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

    // Recuperer le type de document prefere
    const { data: settings } = await supabase
      .from('practitioner_billing_settings')
      .select('libelle_document')
      .eq('practitioner_id', userId)
      .single();

    const documentType = (settings?.libelle_document || 'facture') as InvoiceDocumentType;

    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDFDocument, {
        invoice: invoice as ConsultationInvoice,
        documentType,
      })
    );

    const filename = `${documentType}_${invoice.numero || 'brouillon'}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Erreur generation PDF:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la generation du PDF' },
      { status: 500 }
    );
  }
}
