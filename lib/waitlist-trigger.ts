import { supabase } from './supabase';

/**
 * Fire-and-forget: trigger waitlist notification for a freed appointment slot.
 * Called from the client after a cancel or reschedule.
 * Errors are silently logged — this should never block the main flow.
 */
export function triggerWaitlistNotification(appointmentId: string): void {
  (async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      await fetch('/api/waitlist/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });
    } catch (err) {
      console.error('[waitlist] Failed to trigger notification:', err);
    }
  })();
}
