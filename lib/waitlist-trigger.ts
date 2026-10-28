import { supabase } from './supabase';

/**
 * Fire-and-forget: trigger waitlist notification for a freed appointment slot.
 * Called from the client after a cancel or reschedule.
 * Errors are silently logged — this should never block the main flow.
 *
 * Séance déplacée : freedStartsAt donne le début de l'ancien créneau.
 * token / keepalive : envoi possible pendant la fermeture de la page.
 */
export function triggerWaitlistNotification(
  appointmentId: string,
  opts: { freedStartsAt?: string; token?: string; keepalive?: boolean } = {}
): void {
  (async () => {
    try {
      let token = opts.token;
      if (!token) {
        const { data: session } = await supabase.auth.getSession();
        token = session?.session?.access_token;
      }
      if (!token) return;

      await fetch('/api/waitlist/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId, freedStartsAt: opts.freedStartsAt }),
        keepalive: opts.keepalive,
      });
    } catch (err) {
      console.error('[waitlist] Failed to trigger notification:', err);
    }
  })();
}
