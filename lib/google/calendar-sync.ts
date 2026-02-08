/**
 * Google Calendar Sync — AFEIA → Google (unidirectional)
 * Creates, updates, and cancels events in the practitioner's dedicated Google Calendar
 */

import { getSupabaseAdmin } from '../supabase-admin';
import { getValidAccessToken, getGoogleConnection } from './auth';
import type { Appointment, ConsultationType } from '../types';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Map consultation type colors to Google Calendar color IDs (1-11)
const COLOR_MAP: Record<string, string> = {
  '#4CAF50': '2',   // Sage / green
  '#2196F3': '9',   // Blueberry / blue
  '#9C27B0': '3',   // Grape / purple
  '#FF9800': '6',   // Tangerine / orange
  '#F44336': '11',  // Tomato / red
  '#00BCD4': '7',   // Peacock / cyan
  '#795548': '5',   // Banana / brown-ish
  '#607D8B': '8',   // Graphite / gray-blue
  '#E91E63': '4',   // Flamingo / pink
  '#CDDC39': '2',   // Sage / lime
  '#FF5722': '6',   // Tangerine / deep orange
};

function getGoogleColorId(hexColor: string | undefined): string | undefined {
  if (!hexColor) return undefined;
  return COLOR_MAP[hexColor.toUpperCase()] || COLOR_MAP[hexColor] || '9';
}

interface AppointmentWithRelations extends Appointment {
  patient?: {
    id: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    is_premium?: boolean;
  };
  consultation_type?: ConsultationType;
}

function buildGoogleEvent(appointment: AppointmentWithRelations) {
  const consultantName =
    appointment.patient?.name ||
    [appointment.patient?.first_name, appointment.patient?.last_name].filter(Boolean).join(' ') ||
    appointment.booking_name ||
    'Consultant';

  const typeName = appointment.consultation_type?.name || 'Seance';

  const summary = `Seance \u2014 ${consultantName} \u2014 ${typeName}`;

  const descriptionParts: string[] = [];
  descriptionParts.push(`Type : ${typeName}`);
  if (appointment.consultation_type?.duration_minutes) {
    descriptionParts.push(`Duree : ${appointment.consultation_type.duration_minutes} min`);
  }
  if (appointment.notes_public) {
    descriptionParts.push(`\nNotes :\n${appointment.notes_public}`);
  }

  let location = '';
  if (appointment.location_type === 'video') {
    location = appointment.video_link || 'Consultation visio';
  } else if (appointment.location_type === 'phone') {
    location = 'Consultation telephonique';
  } else if (appointment.location_type === 'home_visit') {
    location = 'Visite a domicile';
  }
  // For in_person, we'd need practitioner address — omit if not available

  const event: Record<string, unknown> = {
    summary,
    description: descriptionParts.join('\n'),
    start: { dateTime: appointment.starts_at, timeZone: 'Europe/Paris' },
    end: { dateTime: appointment.ends_at, timeZone: 'Europe/Paris' },
    reminders: { useDefault: false, overrides: [] },
    extendedProperties: {
      private: { afeia_appointment_id: appointment.id },
    },
    status: 'confirmed',
  };

  if (location) {
    event.location = location;
  }

  const colorId = getGoogleColorId(appointment.consultation_type?.color);
  if (colorId) {
    event.colorId = colorId;
  }

  return event;
}

/**
 * Create a Google Calendar event for an appointment
 * Returns the Google event ID or null on failure
 */
export async function createGoogleEvent(
  practitionerId: string,
  appointment: AppointmentWithRelations
): Promise<string | null> {
  const accessToken = await getValidAccessToken(practitionerId);
  if (!accessToken) return null;

  const connection = await getGoogleConnection(practitionerId);
  if (!connection?.calendar_id) return null;

  const event = buildGoogleEvent(appointment);

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(connection.calendar_id)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Google Sync] Create event failed:', errorBody);
      await updateSyncError(practitionerId, `Creation evenement echouee: ${response.status}`);
      return null;
    }

    const createdEvent = await response.json();
    const googleEventId = createdEvent.id;

    // Store the google_event_id on the appointment
    const supabase = getSupabaseAdmin();
    await supabase
      .from('appointments')
      .update({ google_event_id: googleEventId, updated_at: new Date().toISOString() })
      .eq('id', appointment.id);

    await updateLastSync(practitionerId);
    return googleEventId;
  } catch (err) {
    console.error('[Google Sync] Create event error:', err);
    await updateSyncError(
      practitionerId,
      `Erreur creation: ${err instanceof Error ? err.message : 'Erreur inconnue'}`
    );
    return null;
  }
}

/**
 * Update a Google Calendar event for an appointment
 */
export async function updateGoogleEvent(
  practitionerId: string,
  appointment: AppointmentWithRelations
): Promise<boolean> {
  if (!appointment.google_event_id) return false;

  const accessToken = await getValidAccessToken(practitionerId);
  if (!accessToken) return false;

  const connection = await getGoogleConnection(practitionerId);
  if (!connection?.calendar_id) return false;

  const event = buildGoogleEvent(appointment);

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(connection.calendar_id)}/events/${encodeURIComponent(appointment.google_event_id)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Google Sync] Update event failed:', errorBody);
      await updateSyncError(practitionerId, `Mise a jour evenement echouee: ${response.status}`);
      return false;
    }

    await updateLastSync(practitionerId);
    return true;
  } catch (err) {
    console.error('[Google Sync] Update event error:', err);
    await updateSyncError(
      practitionerId,
      `Erreur mise a jour: ${err instanceof Error ? err.message : 'Erreur inconnue'}`
    );
    return false;
  }
}

/**
 * Cancel/delete a Google Calendar event
 */
export async function cancelGoogleEvent(
  practitionerId: string,
  googleEventId: string
): Promise<boolean> {
  const accessToken = await getValidAccessToken(practitionerId);
  if (!accessToken) return false;

  const connection = await getGoogleConnection(practitionerId);
  if (!connection?.calendar_id) return false;

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(connection.calendar_id)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // 204 = deleted, 410 = already gone — both are fine
    if (!response.ok && response.status !== 410) {
      const errorBody = await response.text();
      console.error('[Google Sync] Delete event failed:', errorBody);
      return false;
    }

    await updateLastSync(practitionerId);
    return true;
  } catch (err) {
    console.error('[Google Sync] Delete event error:', err);
    return false;
  }
}

/**
 * Sync all future unsynchronized appointments to Google Calendar (bulk initial sync)
 */
export async function syncAllFutureAppointments(practitionerId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:consultants(id, name, first_name, last_name, email, is_premium),
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
    `)
    .eq('practitioner_id', practitionerId)
    .is('google_event_id', null)
    .not('status', 'in', '("cancelled","rescheduled")')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error || !appointments) {
    console.error('[Google Sync] Failed to fetch appointments for bulk sync:', error);
    return 0;
  }

  let synced = 0;
  for (const apt of appointments) {
    const eventId = await createGoogleEvent(practitionerId, apt as AppointmentWithRelations);
    if (eventId) synced++;
  }

  await updateLastSync(practitionerId);
  return synced;
}

/**
 * Count future unsynchronized appointments
 */
export async function countUnsyncedAppointments(practitionerId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('practitioner_id', practitionerId)
    .is('google_event_id', null)
    .not('status', 'in', '("cancelled","rescheduled")')
    .gte('starts_at', new Date().toISOString());

  if (error) return 0;
  return count || 0;
}

// --- Internal helpers ---

async function updateLastSync(practitionerId: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('google_calendar_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('practitioner_id', practitionerId);
}

async function updateSyncError(practitionerId: string, error: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('google_calendar_connections')
    .update({
      last_sync_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq('practitioner_id', practitionerId);
}
