/**
 * E-mail d'invitation à une visio immédiate (lancée depuis le tableau de bord du praticien).
 */

interface InstantVisioEmailData {
  consultantFirstName: string;
  practitionerName: string;
  joinUrl: string;
  /** Heure de fin de la séance (« 15:45 »). */
  endTimeFormatted: string;
}

export function buildInstantVisioEmail(data: InstantVisioEmailData) {
  const subject = `${data.practitionerName} vous attend en visio`;
  const greeting = data.consultantFirstName ? `Bonjour ${data.consultantFirstName},` : 'Bonjour,';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7f4;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:48px;height:48px;background:#2B5651;border-radius:50%;line-height:48px;color:white;font-size:20px;">&#128249;</div>
      </div>
      <h1 style="text-align:center;font-size:20px;color:#1a1a1a;margin:0 0 16px;">${escapeHtml(subject)}</h1>
      <p style="color:#333;font-size:14px;margin:0 0 8px;">${escapeHtml(greeting)}</p>
      <p style="color:#333;font-size:14px;margin:0 0 24px;">${escapeHtml(data.practitionerName)} vous propose de vous retrouver en visio maintenant.</p>

      <div style="text-align:center;">
        <a href="${escapeHtml(data.joinUrl)}" style="display:inline-block;background:#2B5651;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;">Rejoindre la visio</a>
      </div>

      <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#999;">Le lien reste valable jusqu'à ${escapeHtml(data.endTimeFormatted)}.</p>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:16px;">Envoyé via AFEIA</p>
  </div>
</body>
</html>`;

  const text = `${subject}

${greeting}

${data.practitionerName} vous propose de vous retrouver en visio maintenant.

Rejoindre la visio :
${data.joinUrl}

Le lien reste valable jusqu'à ${data.endTimeFormatted}.

--
Envoyé via AFEIA`;

  return { subject, html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
