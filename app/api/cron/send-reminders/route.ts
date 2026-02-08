import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { sendReminderEmail } from '../../../../lib/emails/send-reminder';
import { build24hReminderEmail } from '../../../../lib/emails/templates/reminder-24h';
import { build2hReminderEmail } from '../../../../lib/emails/templates/reminder-2h';
import { buildPostReminderEmail } from '../../../../lib/emails/templates/reminder-post';
import { formatDateFR, formatTimeFR } from '../../../../lib/emails/template-utils';
import { buildUnsubscribeUrl } from '../../../../lib/utils/unsubscribe-token';
import type { TemplateVariables } from '../../../../lib/emails/template-utils';

/**
 * Cron job that runs every 5 minutes to send due reminders.
 * Secured by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Fetch pending reminders that are due
  const { data: reminders, error: fetchError } = await supabase
    .from('appointment_reminders')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(50)
    .order('scheduled_for', { ascending: true });

  if (fetchError || !reminders || reminders.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    try {
      // Check if email is unsubscribed
      const { data: unsubscribed } = await supabase
        .from('reminder_unsubscribes')
        .select('id')
        .eq('email', reminder.recipient_email)
        .single();

      // Get the appointment to check it's still active
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:consultants(id, name, first_name, last_name, email),
          consultation_type:consultation_types(id, name, duration_minutes, color)
        `)
        .eq('id', reminder.appointment_id)
        .single();

      if (aptError || !appointment) {
        // Appointment no longer exists
        await markReminder(supabase, reminder.id, 'cancelled', 'Seance supprimee');
        skipped++;
        continue;
      }

      // Skip if appointment was cancelled/rescheduled
      if (['cancelled', 'rescheduled'].includes(appointment.status)) {
        await markReminder(supabase, reminder.id, 'cancelled', 'Seance annulee ou reportee');
        skipped++;
        continue;
      }

      // For pre-session reminders, check if appointment hasn't passed
      if (reminder.trigger_type !== 'post_session') {
        if (new Date(appointment.starts_at) < new Date()) {
          await markReminder(supabase, reminder.id, 'cancelled', 'Seance deja passee');
          skipped++;
          continue;
        }
      }

      // Skip if unsubscribed (check by practitioner)
      if (unsubscribed) {
        await markReminder(supabase, reminder.id, 'cancelled', 'Email desinscrit');
        skipped++;
        continue;
      }

      // Get practitioner data
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('full_name, booking_address, cancellation_policy_hours, reminder_24h_template, reminder_2h_template, reminder_post_template')
        .eq('id', appointment.practitioner_id)
        .single();

      if (!practitioner) {
        await markReminder(supabase, reminder.id, 'failed', 'Praticien introuvable');
        failed++;
        continue;
      }

      // Build template variables
      const startsAt = new Date(appointment.starts_at);
      const consultantName =
        appointment.patient?.name ||
        [appointment.patient?.first_name, appointment.patient?.last_name].filter(Boolean).join(' ') ||
        appointment.booking_name ||
        'Consultant';

      const firstName =
        appointment.patient?.first_name ||
        appointment.booking_name?.split(' ')[0] ||
        consultantName;

      const lastName =
        appointment.patient?.last_name ||
        appointment.booking_name?.split(' ').slice(1).join(' ') ||
        '';

      const templateData: TemplateVariables = {
        prenom: firstName,
        nom: lastName,
        date: formatDateFR(startsAt),
        heure: formatTimeFR(startsAt),
        type: appointment.consultation_type?.name || 'Seance',
        duree: String(appointment.consultation_type?.duration_minutes || 60),
        praticien: practitioner.full_name,
        adresse: practitioner.booking_address || '',
        lien_visio: appointment.location_type === 'video' ? appointment.video_link || '' : '',
        delai_annulation: practitioner.cancellation_policy_hours
          ? String(practitioner.cancellation_policy_hours)
          : undefined,
      };

      // Generate unsubscribe URL
      const unsubscribeUrl = await buildUnsubscribeUrl(
        reminder.recipient_email,
        appointment.practitioner_id
      );

      // Build email based on trigger type
      let email: { subject: string; html: string; text: string };

      switch (reminder.trigger_type) {
        case 'before_24h':
          email = build24hReminderEmail(
            templateData,
            practitioner.reminder_24h_template || null,
            unsubscribeUrl
          );
          break;
        case 'before_2h':
          email = build2hReminderEmail(
            templateData,
            practitioner.reminder_2h_template || null,
            unsubscribeUrl
          );
          break;
        case 'post_session':
          email = buildPostReminderEmail(
            templateData,
            practitioner.reminder_post_template || null,
            unsubscribeUrl
          );
          break;
        default:
          await markReminder(supabase, reminder.id, 'failed', `Type inconnu: ${reminder.trigger_type}`);
          failed++;
          continue;
      }

      // Send the email
      const success = await sendReminderEmail(
        reminder.recipient_email,
        email.subject,
        email.html,
        email.text
      );

      if (success) {
        await markReminder(supabase, reminder.id, 'sent');
        sent++;
      } else {
        await markReminder(supabase, reminder.id, 'failed', 'Echec envoi email');
        failed++;
      }
    } catch (err) {
      console.error('[Cron Reminders] Error processing reminder:', reminder.id, err);
      await markReminder(
        supabase,
        reminder.id,
        'failed',
        err instanceof Error ? err.message : 'Erreur inconnue'
      );
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, skipped });
}

async function markReminder(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  id: string,
  status: string,
  errorMessage?: string
) {
  const update: Record<string, unknown> = { status };
  if (status === 'sent') {
    update.sent_at = new Date().toISOString();
  }
  if (errorMessage) {
    update.error_message = errorMessage;
  }

  await supabase.from('appointment_reminders').update(update).eq('id', id);
}
