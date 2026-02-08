/**
 * Schedule email reminders when an appointment is created
 */

import { getSupabaseAdmin } from '../supabase-admin';

interface ScheduleRemindersParams {
  appointmentId: string;
  practitionerId: string;
  startsAt: string;
  endsAt: string;
  recipientEmail: string;
}

/**
 * Schedule all configured reminders for an appointment.
 * Called after appointment creation (manual or booking).
 */
export async function scheduleReminders({
  appointmentId,
  practitionerId,
  startsAt,
  endsAt,
  recipientEmail,
}: ScheduleRemindersParams): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get practitioner reminder settings
  const { data: practitioner, error: practError } = await supabase
    .from('practitioners')
    .select('reminder_24h_enabled, reminder_2h_enabled, reminder_post_enabled, reminder_post_delay_hours')
    .eq('id', practitionerId)
    .single();

  if (practError || !practitioner) {
    console.error('[Reminders] Failed to load practitioner settings:', practError);
    return;
  }

  // Check if email is unsubscribed for this practitioner
  const { data: unsubscribed } = await supabase
    .from('reminder_unsubscribes')
    .select('id')
    .eq('practitioner_id', practitionerId)
    .eq('email', recipientEmail)
    .single();

  if (unsubscribed) {
    console.info('[Reminders] Email is unsubscribed, skipping:', recipientEmail);
    return;
  }

  const reminders: Array<{
    appointment_id: string;
    type: string;
    trigger_type: string;
    recipient_email: string;
    scheduled_for: string;
    status: string;
  }> = [];

  const now = new Date();

  // Rappel 24h avant
  if (practitioner.reminder_24h_enabled) {
    const scheduledFor = new Date(startsAt);
    scheduledFor.setHours(scheduledFor.getHours() - 24);
    if (scheduledFor > now) {
      reminders.push({
        appointment_id: appointmentId,
        type: 'email',
        trigger_type: 'before_24h',
        recipient_email: recipientEmail,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      });
    }
  }

  // Rappel 2h avant
  if (practitioner.reminder_2h_enabled) {
    const scheduledFor = new Date(startsAt);
    scheduledFor.setHours(scheduledFor.getHours() - 2);
    if (scheduledFor > now) {
      reminders.push({
        appointment_id: appointmentId,
        type: 'email',
        trigger_type: 'before_2h',
        recipient_email: recipientEmail,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      });
    }
  }

  // Rappel post-seance
  if (practitioner.reminder_post_enabled) {
    const delayHours = practitioner.reminder_post_delay_hours ?? 24;
    const scheduledFor = new Date(endsAt);
    scheduledFor.setHours(scheduledFor.getHours() + delayHours);
    reminders.push({
      appointment_id: appointmentId,
      type: 'email',
      trigger_type: 'post_session',
      recipient_email: recipientEmail,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
    });
  }

  if (reminders.length > 0) {
    const { error } = await supabase.from('appointment_reminders').insert(reminders);
    if (error) {
      console.error('[Reminders] Failed to insert reminders:', error);
    }
  }
}

/**
 * Cancel all pending reminders for an appointment
 */
export async function cancelReminders(appointmentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('appointment_reminders')
    .update({ status: 'cancelled' })
    .eq('appointment_id', appointmentId)
    .eq('status', 'pending');

  if (error) {
    console.error('[Reminders] Failed to cancel reminders:', error);
  }
}
