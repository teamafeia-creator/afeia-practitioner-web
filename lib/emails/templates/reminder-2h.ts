/**
 * Template for 2h before appointment reminder email
 */

import { escapeHtml, type TemplateVariables } from '../template-utils';

export const DEFAULT_2H_SUBJECT = 'Votre RDV dans 2 heures avec {praticien}';

export const DEFAULT_2H_BODY = `Bonjour {prenom},

Votre rendez-vous est dans 2 heures :

- Aujourd'hui a {heure}
- {praticien}
- {adresse}

A tres vite !`;

export function build2hReminderEmail(
  data: TemplateVariables,
  customBody: string | null,
  unsubscribeUrl: string
) {
  const subject = DEFAULT_2H_SUBJECT
    .replace(/\{praticien\}/g, data.praticien);

  const visioLine = data.lien_visio
    ? `<p style="margin:4px 0;">&#128187; <a href="${escapeHtml(data.lien_visio)}" style="color:#2B5651;">Rejoindre la consultation</a></p>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7f4;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Votre rendez-vous approche</h1>
      <p style="color:#333;font-size:14px;line-height:1.6;">Bonjour ${escapeHtml(data.prenom)},</p>
      <p style="color:#333;font-size:14px;line-height:1.6;">Votre rendez-vous est dans 2 heures :</p>

      <div style="background:#f0f7f6;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:4px 0;">&#128197; <strong>Aujourd'hui a ${escapeHtml(data.heure)}</strong></p>
        <p style="margin:4px 0;">&#128100; ${escapeHtml(data.praticien)}</p>
        ${data.adresse ? `<p style="margin:4px 0;">&#128205; ${escapeHtml(data.adresse)}</p>` : ''}
        ${visioLine}
      </div>

      <p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">A tres vite !</p>
    </div>
    <div style="text-align:center;margin-top:16px;">
      <p style="color:#999;font-size:11px;">Envoye via AFEIA</p>
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#999;font-size:11px;text-decoration:underline;">Se desinscrire des rappels</a>
    </div>
  </div>
</body>
</html>`;

  const body = customBody || DEFAULT_2H_BODY;
  const textBody = body
    .replace(/\{prenom\}/g, data.prenom)
    .replace(/\{nom\}/g, data.nom)
    .replace(/\{date\}/g, data.date)
    .replace(/\{heure\}/g, data.heure)
    .replace(/\{type\}/g, data.type)
    .replace(/\{duree\}/g, data.duree)
    .replace(/\{praticien\}/g, data.praticien)
    .replace(/\{adresse\}/g, data.adresse)
    .replace(/\{lien_visio\}/g, data.lien_visio || '');

  const text = `${textBody}

--
Envoye via AFEIA
Se desinscrire des rappels : ${unsubscribeUrl}`;

  return { subject, html, text };
}
