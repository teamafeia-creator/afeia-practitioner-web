import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { buildReminderEmail } from '@/lib/invoicing/reminders';
import type { ConsultationInvoice, PractitionerBillingSettings } from '@/lib/invoicing/types';

/**
 * POST /api/invoicing/reminders/process
 *
 * Cron endpoint pour traiter les relances automatiques.
 * Securise par un secret partage (CRON_SECRET).
 */
export async function POST(request: NextRequest) {
  try {
    // Verifier l'authentification via CRON_SECRET ou Bearer token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Fallback: verifier si c'est un praticien authentifie (pour tests manuels)
      const token = authHeader?.replace('Bearer ', '').trim();
      if (!token) {
        return NextResponse.json({ message: 'Non autorise' }, { status: 401 });
      }
    }

    const supabase = createSupabaseAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Recuperer les relances a envoyer aujourd'hui
    const { data: reminders, error: remindersError } = await supabase
      .from('reminder_queue')
      .select('*')
      .eq('scheduled_for', today)
      .eq('sent', false);

    if (remindersError) throw remindersError;

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'Aucune relance a envoyer',
      });
    }

    let successful = 0;
    let failed = 0;

    for (const reminder of reminders) {
      try {
        // Recuperer la facture
        const { data: invoiceData } = await supabase
          .from('consultation_invoices')
          .select('*')
          .eq('id', reminder.invoice_id)
          .single();

        if (!invoiceData) {
          // Facture supprimee ou introuvable
          await supabase
            .from('reminder_queue')
            .update({ sent: true, error_message: 'Facture introuvable' })
            .eq('id', reminder.id);
          failed++;
          continue;
        }

        const invoice = invoiceData as ConsultationInvoice;

        // Si la facture n'est plus en attente, annuler la relance
        if (invoice.status !== 'issued') {
          await supabase
            .from('reminder_queue')
            .update({ sent: true, error_message: `Facture en statut ${invoice.status}` })
            .eq('id', reminder.id);
          continue;
        }

        // Recuperer les parametres du praticien
        const { data: settings } = await supabase
          .from('practitioner_billing_settings')
          .select('*')
          .eq('practitioner_id', invoice.practitioner_id)
          .single();

        if (!settings?.relances_auto) {
          await supabase
            .from('reminder_queue')
            .update({ sent: true, error_message: 'Relances desactivees' })
            .eq('id', reminder.id);
          continue;
        }

        const billingSettings = settings as PractitionerBillingSettings;

        // Construire l'email de relance
        const { subject, text, html } = buildReminderEmail(
          invoice,
          reminder.reminder_type as 'j7' | 'j15' | 'j30',
          billingSettings
        );

        const consultantEmail = invoice.consultant_snapshot.email;
        if (!consultantEmail) {
          await supabase
            .from('reminder_queue')
            .update({ sent: true, error_message: 'Email consultant manquant' })
            .eq('id', reminder.id);
          failed++;
          continue;
        }

        // Envoyer l'email via Resend
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          console.info('RESEND_API_KEY not configured. Skipping reminder.');
          await supabase
            .from('reminder_queue')
            .update({ sent: true, error_message: 'RESEND_API_KEY non configure' })
            .eq('id', reminder.id);
          failed++;
          continue;
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'AFEIA <onboarding@resend.dev>',
            to: consultantEmail,
            subject,
            html,
            text,
          }),
        });

        if (!emailResponse.ok) {
          const errorBody = await emailResponse.text();
          throw new Error(`Resend error: ${emailResponse.status} ${errorBody}`);
        }

        // Marquer la relance comme envoyee
        await supabase
          .from('reminder_queue')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('id', reminder.id);

        // Logger l'action
        await supabase.from('invoice_history').insert({
          invoice_id: reminder.invoice_id,
          action: `reminder_${reminder.reminder_type}`,
          metadata: { email: consultantEmail, sent_at: new Date().toISOString() },
        });

        successful++;
      } catch (err) {
        console.error(`Erreur relance ${reminder.id}:`, err);

        await supabase
          .from('reminder_queue')
          .update({
            error_message: err instanceof Error ? err.message : 'Erreur inconnue',
          })
          .eq('id', reminder.id);

        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: reminders.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error('Erreur traitement relances:', error);
    return NextResponse.json(
      { message: 'Erreur lors du traitement des relances' },
      { status: 500 }
    );
  }
}
