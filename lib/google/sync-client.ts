/**
 * Client-side helper to trigger Google Calendar sync after appointment CRUD.
 * Calls the sync API endpoint in the background — never blocks the UI.
 */

export function syncAppointmentToGoogle(
  appointmentId: string,
  action: 'create' | 'update' | 'cancel'
): void {
  // Fire and forget — don't await
  fetch('/api/integrations/google/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId, action }),
  }).catch((err) => {
    console.warn('[Google Sync] Background sync failed:', err);
  });
}
