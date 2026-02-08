import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { verifyUnsubscribeToken } from '../../../../lib/utils/unsubscribe-token';

/**
 * Process a reminder unsubscribe request.
 * Verifies the JWT token and adds the email to the unsubscribe list.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    // Verify the token
    const payload = await verifyUnsubscribeToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Le lien de desinscription est invalide ou a expire.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Add to unsubscribe list (upsert to avoid duplicates)
    const { error: upsertError } = await supabase
      .from('reminder_unsubscribes')
      .upsert(
        {
          practitioner_id: payload.practitioner_id,
          email: payload.email,
        },
        { onConflict: 'practitioner_id,email' }
      );

    if (upsertError) {
      console.error('[Unsubscribe] DB error:', upsertError);
      return NextResponse.json(
        { error: 'Erreur lors de la desinscription' },
        { status: 500 }
      );
    }

    // Cancel all pending reminders for this email and practitioner
    const { data: pendingReminders } = await supabase
      .from('appointment_reminders')
      .select('id, appointment_id')
      .eq('recipient_email', payload.email)
      .eq('status', 'pending');

    if (pendingReminders && pendingReminders.length > 0) {
      // Get appointment IDs for this practitioner
      const appointmentIds = pendingReminders.map(r => r.appointment_id);

      const { data: practitionerAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('practitioner_id', payload.practitioner_id)
        .in('id', appointmentIds);

      if (practitionerAppointments) {
        const aptIds = practitionerAppointments.map(a => a.id);
        const reminderIds = pendingReminders
          .filter(r => aptIds.includes(r.appointment_id))
          .map(r => r.id);

        if (reminderIds.length > 0) {
          await supabase
            .from('appointment_reminders')
            .update({ status: 'cancelled', error_message: 'Email desinscrit' })
            .in('id', reminderIds);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Unsubscribe] Error:', err);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
