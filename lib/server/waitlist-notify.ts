import { getMatchingWaitlistEntries, markAsNotified } from '../queries/waitlist';
import { buildWaitlistNotificationEmail } from '../emails/waitlist-notification';
import { sendEmail } from './email';
import { createSupabaseAdminClient } from './supabaseAdmin';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

/**
 * Un créneau s'est libéré : prévient les personnes compatibles de la liste d'attente.
 * Si practitionerId est fourni, vérifie que la séance lui appartient.
 * freedStartsAt : début du créneau libéré quand la séance a été déplacée (sinon son propre horaire).
 */
export async function notifyWaitlistForAppointment(appointmentId: string, practitionerId?: string, freedStartsAt?: Date): Promise<{ notified: number; forbidden?: boolean; notFound?: boolean }> {
  const supabase = createSupabaseAdminClient();

  // Fetch appointment with consultation type
  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .select(`
      id, practitioner_id, starts_at, consultation_type_id,
      consultation_type:consultation_types(id, name, duration_minutes)
    `)
    .eq('id', appointmentId)
    .single();

  if (aptError || !appointment) {
    return { notified: 0, notFound: true };
  }

  if (practitionerId && appointment.practitioner_id !== practitionerId) {
    return { notified: 0, forbidden: true };
  }

  if (!appointment.consultation_type_id || !appointment.consultation_type) {
    return { notified: 0 };
  }

  // Fetch practitioner info
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('full_name, booking_slug, booking_address, booking_phone')
    .eq('id', appointment.practitioner_id)
    .single();

  if (!practitioner?.booking_slug) {
    // No booking slug = no booking page = can't send notification link
    return { notified: 0 };
  }

  // Supabase join may return an array or single object depending on relationship
  const rawCt = appointment.consultation_type;
  const ct = (Array.isArray(rawCt) ? rawCt[0] : rawCt) as { id: string; name: string; duration_minutes: number };
  if (!ct) {
    return { notified: 0 };
  }
  const slotDate = freedStartsAt ?? new Date(appointment.starts_at);

  // Find matching waitlist entries
  const entries = await getMatchingWaitlistEntries(appointment.practitioner_id, {
    startsAt: slotDate,
    consultationTypeId: ct.id,
  });

  if (entries.length === 0) {
    return { notified: 0 };
  }

  // Format date for email
  const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(slotDate);

  const timeFormatted = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(slotDate);

  const slotDateStr = slotDate.toISOString().split('T')[0];
  const slotTimeStr = `${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`;

  // Send notifications
  let sent = 0;
  for (const entry of entries) {
    try {
      const emailContent = buildWaitlistNotificationEmail({
        firstName: entry.first_name,
        practitionerName: practitioner.full_name,
        practitionerSlug: practitioner.booking_slug,
        dateFormatted,
        timeFormatted,
        consultationTypeName: ct.name,
        consultationTypeId: ct.id,
        durationMinutes: ct.duration_minutes,
        slotDate: slotDateStr,
        slotTime: slotTimeStr,
        practitionerAddress: practitioner.booking_address,
        practitionerPhone: practitioner.booking_phone,
      });

      await sendEmail({
        to: entry.email,
        from: FROM_EMAIL,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      sent++;
    } catch (emailError) {
      console.error(`Failed to send waitlist notification to ${entry.email}:`, emailError);
    }
  }

  // Mark all as notified
  await markAsNotified(
    entries.map(e => e.id),
    slotDate
  );

  return { notified: sent };
}

/** Annulation par le consultant (lien de l'e-mail) : séance retrouvée par son jeton. */
export async function triggerWaitlistNotificationServer(cancelToken: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from('appointments').select('id').eq('cancel_token', cancelToken).maybeSingle();
  if (data?.id) await notifyWaitlistForAppointment(data.id as string);
}
