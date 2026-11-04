import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { InvoicePDFDocument } from '@/lib/invoicing/pdf-generator';
import { fillReminder, reminderSubject } from '@/lib/invoicing/manual-reminder';
import type { ConsultationInvoice, InvoiceDocumentType } from '@/lib/invoicing/types';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * POST /api/invoicing/reminders/send
 * Relance manuelle des factures impayées, avec le texte validé par le praticien dans l'aperçu.
 * Body : { invoice_ids: string[], text: string, attach_pdf?: boolean, save_template?: boolean }
 * Chaque envoi est consigné dans l'historique de la facture (action « reminder_sent »).
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    const { data: authData, error: authError } = await createSupabaseAuthClient().auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
    const userId = authData.user.id;

    const body = (await request.json()) as { invoice_ids?: string[]; text?: string; attach_pdf?: boolean; save_template?: boolean };
    const ids = Array.isArray(body.invoice_ids) ? body.invoice_ids.filter((x) => typeof x === 'string').slice(0, 100) : [];
    const template = (body.text ?? '').trim();
    if (!ids.length) return NextResponse.json({ message: 'Aucune facture à relancer.' }, { status: 400 });
    if (!template) return NextResponse.json({ message: 'Le message est vide.' }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: rows, error } = await supabase
      .from('consultation_invoices')
      .select('*')
      .in('id', ids)
      .eq('practitioner_id', userId)
      .eq('status', 'issued');
    if (error) throw error;
    const invoices = (rows ?? []) as ConsultationInvoice[];
    if (!invoices.length) return NextResponse.json({ message: 'Aucune facture en attente parmi celles cochées.' }, { status: 400 });

    const { data: settings } = await supabase
      .from('practitioner_billing_settings')
      .select('libelle_document, email_copie_praticien')
      .eq('practitioner_id', userId)
      .maybeSingle();
    const documentType = (settings?.libelle_document || 'facture') as InvoiceDocumentType;

    if (body.save_template) {
      await supabase.from('practitioner_billing_settings').update({ relance_manuelle_template: template }).eq('practitioner_id', userId);
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';
    const sent: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const inv of invoices) {
      const to = inv.consultant_snapshot?.email;
      if (!to) {
        failed.push({ id: inv.id, reason: 'Pas d’adresse e-mail' });
        continue;
      }
      const text = fillReminder(template, inv);
      const payload: Record<string, unknown> = {
        from,
        to,
        subject: reminderSubject(inv),
        text,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`,
      };
      try {
        if (body.attach_pdf) {
          const pdf = await renderToBuffer(React.createElement(InvoicePDFDocument, { invoice: inv, documentType }) as Parameters<typeof renderToBuffer>[0]);
          payload.attachments = [{ filename: `${documentType}_${inv.numero || 'facture'}.pdf`, content: Buffer.from(pdf).toString('base64') }];
        }
        if (apiKey) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`Email provider error (${res.status})`);
        } else {
          console.info('RESEND_API_KEY not configured. Reminder payload:', { to, subject: payload.subject });
        }
        await supabase.from('invoice_history').insert({ invoice_id: inv.id, action: 'reminder_sent', user_id: userId, metadata: { email: to, manual: true } });
        sent.push(inv.id);
      } catch (e) {
        console.error('Relance impayé :', e);
        failed.push({ id: inv.id, reason: 'Envoi impossible' });
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (err) {
    console.error('Exception reminders/send:', err);
    return NextResponse.json({ message: 'Erreur lors de l’envoi des relances' }, { status: 500 });
  }
}
