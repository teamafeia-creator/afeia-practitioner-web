/**
 * Email templates for online booking confirmation and notification
 */

interface BookingEmailData {
  consultantFirstName: string;
  consultantName: string;
  consultantEmail: string;
  practitionerName: string;
  practitionerAddress: string | null;
  dateFormatted: string;
  timeFormatted: string;
  consultationTypeName: string;
  durationMinutes: number;
  cancellationPolicyHours: number | null;
  cancellationPolicyText: string | null;
  reason: string | null;
}

export function buildConfirmationEmail(data: BookingEmailData) {
  const locationLine = data.practitionerAddress
    ? `<p style="margin:4px 0;">&#128205; ${escapeHtml(data.practitionerAddress)}</p>`
    : '';

  const cancellationLine =
    data.cancellationPolicyHours || data.cancellationPolicyText
      ? `<div style="margin-top:16px;padding:12px;background:#f8f7f4;border-radius:6px;">
           <p style="margin:0;font-weight:600;font-size:14px;">Politique d'annulation</p>
           ${data.cancellationPolicyText ? `<p style="margin:4px 0;font-size:13px;">${escapeHtml(data.cancellationPolicyText)}</p>` : ''}
           ${data.cancellationPolicyHours ? `<p style="margin:4px 0;font-size:13px;">Merci de prevenir au minimum ${data.cancellationPolicyHours}h a l'avance.</p>` : ''}
         </div>`
      : '';

  const subject = `Confirmation de votre rendez-vous avec ${data.practitionerName}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7f4;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:48px;height:48px;background:#2B5651;border-radius:50%;line-height:48px;color:white;font-size:20px;">&#10003;</div>
      </div>
      <h1 style="text-align:center;font-size:20px;color:#1a1a1a;margin:0 0 8px;">Rendez-vous confirme !</h1>
      <p style="text-align:center;color:#666;font-size:14px;margin:0 0 24px;">Bonjour ${escapeHtml(data.consultantFirstName)},</p>

      <div style="background:#f0f7f6;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:4px 0;">&#128197; <strong>${escapeHtml(data.dateFormatted)} a ${escapeHtml(data.timeFormatted)}</strong></p>
        <p style="margin:4px 0;">&#128336; ${escapeHtml(data.consultationTypeName)} (${data.durationMinutes} min)</p>
        <p style="margin:4px 0;">&#128100; ${escapeHtml(data.practitionerName)}</p>
        ${locationLine}
      </div>

      ${cancellationLine}

      <p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">A bientot !</p>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:16px;">Envoye via AFEIA</p>
  </div>
</body>
</html>`;

  const text = `Rendez-vous confirme !

Bonjour ${data.consultantFirstName},

Votre rendez-vous est confirme :
- ${data.dateFormatted} a ${data.timeFormatted}
- ${data.consultationTypeName} (${data.durationMinutes} min)
- Avec ${data.practitionerName}
${data.practitionerAddress ? `- ${data.practitionerAddress}` : ''}
${data.cancellationPolicyText ? `\nPolitique d'annulation : ${data.cancellationPolicyText}` : ''}

A bientot !

--
Envoye via AFEIA`;

  return { subject, html, text };
}

export function buildPractitionerNotificationEmail(data: BookingEmailData & {
  consultantPhone: string;
  agendaUrl: string;
  isNewConsultant: boolean;
}) {
  const subject = `Nouveau RDV - ${data.consultantName} le ${data.dateFormatted} a ${data.timeFormatted}`;

  const consultantStatus = data.isNewConsultant
    ? '<p style="margin:4px 0;">&#127381; <strong>Nouveau consultant</strong> — un dossier a ete cree automatiquement.</p>'
    : '<p style="margin:4px 0;">&#9989; Consultant existant dans votre base.</p>';

  const reasonLine = data.reason
    ? `<p style="margin:4px 0;">&#128172; Motif : ${escapeHtml(data.reason)}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7f4;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Nouveau rendez-vous en ligne</h1>

      <div style="background:#f0f7f6;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:4px 0;">&#128100; <strong>${escapeHtml(data.consultantName)}</strong></p>
        <p style="margin:4px 0;">&#128231; ${escapeHtml(data.consultantEmail)}</p>
        <p style="margin:4px 0;">&#128222; ${escapeHtml(data.consultantPhone)}</p>
        <p style="margin:4px 0;">&#128197; ${escapeHtml(data.dateFormatted)} a ${escapeHtml(data.timeFormatted)}</p>
        <p style="margin:4px 0;">&#128336; ${escapeHtml(data.consultationTypeName)}</p>
        ${reasonLine}
      </div>

      ${consultantStatus}

      <div style="text-align:center;margin-top:20px;">
        <a href="${escapeHtml(data.agendaUrl)}" style="display:inline-block;background:#2B5651;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Voir dans l'agenda</a>
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:16px;">AFEIA</p>
  </div>
</body>
</html>`;

  const text = `Nouveau rendez-vous en ligne

${data.consultantName} (${data.consultantEmail}, ${data.consultantPhone})
${data.dateFormatted} a ${data.timeFormatted}
${data.consultationTypeName}
${data.reason ? `Motif : ${data.reason}` : ''}
${data.isNewConsultant ? 'Nouveau consultant — dossier cree automatiquement.' : 'Consultant existant.'}

Voir dans l'agenda : ${data.agendaUrl}

--
AFEIA`;

  return { subject, html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
