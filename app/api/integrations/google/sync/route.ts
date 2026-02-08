import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../../../lib/supabase-admin';
import { getGoogleConnection } from '../../../../../lib/google/auth';
import {
  createGoogleEvent,
  updateGoogleEvent,
  cancelGoogleEvent,
} from '../../../../../lib/google/calendar-sync';
import { scheduleReminders, cancelReminders } from '../../../../../lib/reminders/schedule-reminders';

/**
 * Sync a single appointment to Google Calendar.
 * Called after create/update/cancel in the client.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authenticated user
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore
              .getAll()
              .map((c) => `${c.name}=${c.value}`)
              .join('; '),
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const { appointment_id, action } = body as {
      appointment_id: string;
      action: 'create' | 'update' | 'cancel';
    };

    if (!appointment_id || !action) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 });
    }

    // Check if practitioner has Google connected
    const connection = await getGoogleConnection(user.id);
    if (!connection || !connection.sync_enabled) {
      return NextResponse.json({ synced: false, reason: 'not_connected' });
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (action === 'cancel') {
      // For cancel, we need the google_event_id
      const { data: apt } = await supabaseAdmin
        .from('appointments')
        .select('google_event_id')
        .eq('id', appointment_id)
        .eq('practitioner_id', user.id)
        .single();

      if (apt?.google_event_id) {
        await cancelGoogleEvent(user.id, apt.google_event_id);
      }

      // Cancel pending reminders
      await cancelReminders(appointment_id);

      return NextResponse.json({ synced: true });
    }

    // For create/update, fetch the full appointment with relations
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:consultants(id, name, first_name, last_name, email, is_premium),
        consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
      `)
      .eq('id', appointment_id)
      .eq('practitioner_id', user.id)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Seance introuvable' }, { status: 404 });
    }

    if (action === 'create' || !appointment.google_event_id) {
      const eventId = await createGoogleEvent(user.id, appointment);

      // Schedule reminders for the new appointment
      const recipientEmail = appointment.patient?.email || appointment.booking_email;
      if (recipientEmail) {
        scheduleReminders({
          appointmentId: appointment_id,
          practitionerId: user.id,
          startsAt: appointment.starts_at,
          endsAt: appointment.ends_at,
          recipientEmail,
        }).catch(err => console.error('[Sync] Reminder scheduling failed:', err));
      }

      return NextResponse.json({ synced: !!eventId, google_event_id: eventId });
    }

    if (action === 'update') {
      const success = await updateGoogleEvent(user.id, appointment);
      return NextResponse.json({ synced: success });
    }

    return NextResponse.json({ synced: false });
  } catch (err) {
    console.error('[Google Sync] Error:', err);
    return NextResponse.json({ error: 'Erreur de synchronisation' }, { status: 500 });
  }
}
