/**
 * Send a reminder email using Resend
 */

export async function sendReminderEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'AFEIA <rappels@afeia.fr>';

  if (!apiKey) {
    console.info('[Reminder Email] RESEND_API_KEY not configured. Would send to:', to);
    console.info('[Reminder Email] Subject:', subject);
    return true; // Simulate success in dev
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Reminder Email] Send failed:', response.status, errorBody);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Reminder Email] Error:', err);
    return false;
  }
}
