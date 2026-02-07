type QuestionnaireEmailParams = {
  to: string;
  consultantName?: string | null;
  code: string;
  expiresInMinutes: number;
};

type QuestionnaireEmailContent = {
  subject: string;
  from: string;
  to: string;
  html: string;
  text: string;
};

const ANDROID_LINK = 'https://afeia.app/android';
const IOS_LINK = 'https://afeia.app/ios';

export function buildQuestionnaireCodeEmail({
  to,
  consultantName,
  code,
  expiresInMinutes
}: QuestionnaireEmailParams): QuestionnaireEmailContent {
  const greetingName = consultantName?.trim() ? `Bonjour ${consultantName.trim()},` : 'Bonjour,';
  const subject = 'Bienvenue chez AFEIA - Votre code d\'accès';
  // Use resend.dev domain for testing, or configure your verified domain
  const from = process.env.RESEND_FROM_EMAIL || 'AFEIA <onboarding@resend.dev>';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background-color: #2A8080; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Bienvenue chez AFEIA</h1>
        </div>
        <div style="background-color: #F5EFE7; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6;">${greetingName}</p>
          <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6;">
            Votre naturopathe vous a créé un compte AFEIA pour suivre votre accompagnement naturopathique.
          </p>
          <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6; margin-bottom: 8px;">
            <strong>Votre code d'accès à 6 chiffres :</strong>
          </p>
          <div style="background-color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; margin: 16px 0; border: 2px dashed #2A8080; border-radius: 8px; color: #2A8080; font-family: 'Courier New', monospace;">
            ${code}
          </div>
          <p style="color: #6B7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
            <strong>Valable ${expiresInMinutes} minutes</strong> - Utilisable une seule fois
          </p>
          <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6;"><strong>Prochaines étapes :</strong></p>
          <ol style="padding-left: 20px; color: #3D3D3D; font-size: 16px; line-height: 1.8;">
            <li>Téléchargez l'application AFEIA sur votre téléphone</li>
            <li>Entrez ce code à 6 chiffres</li>
            <li>Créez votre mot de passe sécurisé</li>
            <li>Commencez votre questionnaire de santé</li>
          </ol>
          <p style="text-align: center; margin-top: 24px;">
            <a href="${ANDROID_LINK}" style="color: #2A8080; text-decoration: none; margin-right: 16px;">Télécharger pour Android</a>
            <a href="${IOS_LINK}" style="color: #2A8080; text-decoration: none;">Télécharger pour iOS</a>
          </p>
          <p style="color: #3D3D3D; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            À très bientôt,<br /><strong>L'équipe AFEIA</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <p style="font-size: 12px; color: #6B7280;">
            AFEIA - Votre accompagnement naturopathique personnalisé<br />
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Bienvenue chez AFEIA

${greetingName}

Votre naturopathe vous a créé un compte AFEIA pour suivre votre accompagnement naturopathique.

Votre code d'accès à 6 chiffres :

    ${code}

Valable ${expiresInMinutes} minutes - Utilisable une seule fois.

Prochaines étapes :
1) Téléchargez l'application AFEIA sur votre téléphone
2) Entrez ce code à 6 chiffres
3) Créez votre mot de passe sécurisé
4) Commencez votre questionnaire de santé

Android : ${ANDROID_LINK}
iOS : ${IOS_LINK}

À très bientôt,
L'équipe AFEIA

---
AFEIA - Votre accompagnement naturopathique personnalisé
Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`;

  return { subject, from, to, html, text };
}
