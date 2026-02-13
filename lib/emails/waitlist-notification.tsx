/**
 * Email template for waitlist slot notification
 */

interface WaitlistNotificationData {
  firstName: string;
  practitionerName: string;
  practitionerSlug: string;
  dateFormatted: string;
  timeFormatted: string;
  consultationTypeName: string;
  consultationTypeId: string;
  durationMinutes: number;
  slotDate: string;   // YYYY-MM-DD
  slotTime: string;   // HH:mm
  practitionerAddress: string | null;
  practitionerPhone: string | null;
}

export function buildWaitlistNotificationEmail(data: WaitlistNotificationData) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.afeia.fr';
  const bookingUrl = `${baseUrl}/rdv/${data.practitionerSlug}?date=${data.slotDate}&time=${data.slotTime}&consultation_type_id=${data.consultationTypeId}`;

  const locationLine = data.practitionerAddress
    ? `<p style="margin:4px 0;font-size:14px;">&#128205; ${escapeHtml(data.practitionerAddress)}</p>`
    : '';

  const phoneLine = data.practitionerPhone
    ? `<p style="margin:4px 0;font-size:14px;">&#128222; ${escapeHtml(data.practitionerPhone)}</p>`
    : '';

  const subject = `Un creneau vient de se liberer chez ${data.practitionerName}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7f4;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:48px;height:48px;background:#2B5651;border-radius:50%;line-height:48px;color:white;font-size:20px;">&#128276;</div>
      </div>
      <h1 style="text-align:center;font-size:20px;color:#1a1a1a;margin:0 0 8px;">Un creneau vient de se liberer !</h1>
      <p style="text-align:center;color:#666;font-size:14px;margin:0 0 24px;">Bonjour ${escapeHtml(data.firstName)},</p>

      <p style="color:#444;font-size:14px;margin:0 0 16px;">
        Bonne nouvelle ! Un creneau correspondant a vos preferences vient de se liberer chez <strong>${escapeHtml(data.practitionerName)}</strong>.
      </p>

      <div style="background:#f0f7f6;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;">&#128197; <strong>${escapeHtml(data.dateFormatted)} a ${escapeHtml(data.timeFormatted)}</strong></p>
        <p style="margin:4px 0;font-size:14px;">&#128336; ${escapeHtml(data.consultationTypeName)} (${data.durationMinutes} min)</p>
        <p style="margin:4px 0;font-size:14px;">&#128100; ${escapeHtml(data.practitionerName)}</p>
        ${locationLine}
        ${phoneLine}
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(bookingUrl)}" style="display:inline-block;background:#2B5651;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Reserver ce creneau</a>
      </div>

      <div style="background:#fff8f0;border-radius:6px;padding:12px;margin-top:16px;">
        <p style="margin:0;font-size:13px;color:#996633;text-align:center;">
          Ce creneau est propose a plusieurs personnes, premier arrive premier servi.
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:16px;">Envoye via AFEIA</p>
  </div>
</body>
</html>`;

  const text = `Un creneau vient de se liberer !

Bonjour ${data.firstName},

Bonne nouvelle ! Un creneau correspondant a vos preferences vient de se liberer chez ${data.practitionerName}.

- ${data.dateFormatted} a ${data.timeFormatted}
- ${data.consultationTypeName} (${data.durationMinutes} min)
- Avec ${data.practitionerName}
${data.practitionerAddress ? `- ${data.practitionerAddress}` : ''}
${data.practitionerPhone ? `- Tel: ${data.practitionerPhone}` : ''}

Reservez vite : ${bookingUrl}

Ce creneau est propose a plusieurs personnes, premier arrive premier servi.

--
Envoye via AFEIA`;

  return { subject, html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
