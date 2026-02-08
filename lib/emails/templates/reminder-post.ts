/**
 * Template for post-session reminder email
 */

import { escapeHtml, type TemplateVariables } from '../template-utils';

export const DEFAULT_POST_SUBJECT = 'Suite a votre seance avec {praticien}';

export const DEFAULT_POST_BODY = `Bonjour {prenom},

Suite a votre seance du {date} avec {praticien}, n'hesitez pas a consulter votre conseillancier et vos recommandations dans l'application AFEIA.

Pensez egalement a tenir votre journal quotidien pour suivre vos progres.

Prenez soin de vous !`;

export function buildPostReminderEmail(
  data: TemplateVariables,
  customBody: string | null,
  unsubscribeUrl: string
) {
  const subject = DEFAULT_POST_SUBJECT
    .replace(/\{praticien\}/g, data.praticien);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7f4;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Suite a votre seance</h1>
      <p style="color:#333;font-size:14px;line-height:1.6;">Bonjour ${escapeHtml(data.prenom)},</p>
      <p style="color:#333;font-size:14px;line-height:1.6;">
        Suite a votre seance du ${escapeHtml(data.date)} avec ${escapeHtml(data.praticien)},
        n'hesitez pas a consulter votre conseillancier et vos recommandations dans l'application AFEIA.
      </p>
      <p style="color:#333;font-size:14px;line-height:1.6;">
        Pensez egalement a tenir votre journal quotidien pour suivre vos progres.
      </p>
      <p style="text-align:center;color:#666;font-size:13px;margin-top:24px;">Prenez soin de vous !</p>
    </div>
    <div style="text-align:center;margin-top:16px;">
      <p style="color:#999;font-size:11px;">Envoye via AFEIA</p>
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#999;font-size:11px;text-decoration:underline;">Se desinscrire des rappels</a>
    </div>
  </div>
</body>
</html>`;

  const body = customBody || DEFAULT_POST_BODY;
  const textBody = body
    .replace(/\{prenom\}/g, data.prenom)
    .replace(/\{nom\}/g, data.nom)
    .replace(/\{date\}/g, data.date)
    .replace(/\{heure\}/g, data.heure)
    .replace(/\{type\}/g, data.type)
    .replace(/\{duree\}/g, data.duree)
    .replace(/\{praticien\}/g, data.praticien)
    .replace(/\{adresse\}/g, data.adresse);

  const text = `${textBody}

--
Envoye via AFEIA
Se desinscrire des rappels : ${unsubscribeUrl}`;

  return { subject, html, text };
}
