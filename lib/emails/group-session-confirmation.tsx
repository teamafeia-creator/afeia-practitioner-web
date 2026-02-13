/**
 * Email templates for group session registration confirmation and notification
 */

interface GroupSessionConfirmationData {
  participantName: string;
  sessionTitle: string;
  dateFormatted: string;
  timeFormatted: string;
  location: string;
  practitionerName: string;
}

export function buildGroupSessionConfirmationEmail(data: GroupSessionConfirmationData) {
  const subject = `Confirmation de votre inscription - ${data.sessionTitle}`;

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
      <h1 style="text-align:center;font-size:20px;color:#1a1a1a;margin:0 0 8px;">Inscription confirmee !</h1>
      <p style="text-align:center;color:#666;font-size:14px;margin:0 0 24px;">Bonjour ${escapeHtml(data.participantName)},</p>

      <div style="background:#f0f7f6;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:4px 0;">&#128218; <strong>${escapeHtml(data.sessionTitle)}</strong></p>
        <p style="margin:4px 0;">&#128197; ${escapeHtml(data.dateFormatted)}</p>
        <p style="margin:4px 0;">&#128336; ${escapeHtml(data.timeFormatted)}</p>
        <p style="margin:4px 0;">&#128205; ${escapeHtml(data.location)}</p>
        <p style="margin:4px 0;">&#128100; ${escapeHtml(data.practitionerName)}</p>
      </div>

      <p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">A bientot !</p>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:16px;">Envoye via AFEIA</p>
  </div>
</body>
</html>`;

  const text = `Inscription confirmee !

Bonjour ${data.participantName},

Votre inscription est confirmee :
- ${data.sessionTitle}
- ${data.dateFormatted}
- ${data.timeFormatted}
- ${data.location}
- Avec ${data.practitionerName}

A bientot !

--
Envoye via AFEIA`;

  return { subject, html, text };
}

interface GroupSessionPractitionerNotificationData {
  participantName: string;
  participantEmail: string;
  sessionTitle: string;
  dateFormatted: string;
  timeFormatted: string;
  currentCount: number;
  maxParticipants: number;
}

export function buildGroupSessionPractitionerNotificationEmail(data: GroupSessionPractitionerNotificationData) {
  const subject = `Nouvelle inscription - ${data.sessionTitle} (${data.currentCount}/${data.maxParticipants})`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7f4;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Nouvelle inscription en ligne</h1>

      <div style="background:#f0f7f6;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:4px 0;">&#128218; <strong>${escapeHtml(data.sessionTitle)}</strong></p>
        <p style="margin:4px 0;">&#128197; ${escapeHtml(data.dateFormatted)} a ${escapeHtml(data.timeFormatted)}</p>
        <p style="margin:4px 0;">&#128100; <strong>${escapeHtml(data.participantName)}</strong></p>
        <p style="margin:4px 0;">&#128231; ${escapeHtml(data.participantEmail)}</p>
      </div>

      <div style="margin-top:16px;padding:12px;background:#f8f7f4;border-radius:6px;">
        <p style="margin:0;font-size:14px;">
          <strong>${data.currentCount}</strong> / ${data.maxParticipants} inscrits
          ${data.currentCount >= data.maxParticipants ? ' — <span style="color:#ef4444;">Complet</span>' : ''}
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:16px;">AFEIA</p>
  </div>
</body>
</html>`;

  const text = `Nouvelle inscription en ligne

${data.sessionTitle}
${data.dateFormatted} a ${data.timeFormatted}

Participant : ${data.participantName} (${data.participantEmail})
Inscrits : ${data.currentCount} / ${data.maxParticipants}${data.currentCount >= data.maxParticipants ? ' — Complet' : ''}

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
