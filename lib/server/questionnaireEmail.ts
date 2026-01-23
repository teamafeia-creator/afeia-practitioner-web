type QuestionnaireEmailParams = {
  to: string;
  patientName?: string | null;
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
  patientName,
  code,
  expiresInMinutes
}: QuestionnaireEmailParams): QuestionnaireEmailContent {
  const greetingName = patientName?.trim() ? `Bonjour ${patientName.trim()},` : 'Bonjour,';
  const subject = 'Votre code d’accès au questionnaire AFEIA';
  const from = 'Team AFEIA <team.afeia@gmail.com>';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1F2A37; line-height: 1.5;">
      <p>${greetingName}</p>
      <p>Voici votre code à usage unique pour accéder à votre questionnaire de suivi AFEIA :</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 20px 0; font-family: 'Courier New', monospace;">
        ${code}
      </div>
      <p><strong>Valable ${expiresInMinutes} minutes, utilisable une seule fois.</strong></p>
      <ol style="padding-left: 18px;">
        <li>Téléchargez l’app AFEIA</li>
        <li>Ouvrez l’app, allez sur « Questionnaire »</li>
        <li>Saisissez votre code</li>
      </ol>
      <p>
        <a href="${ANDROID_LINK}" style="color:#0F766E;">Télécharger pour Android</a><br />
        <a href="${IOS_LINK}" style="color:#0F766E;">Télécharger pour iOS</a>
      </p>
      <p>À très vite,<br />La Team AFEIA</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6B7280;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
    </div>
  `;

  const text = `${greetingName}

Voici votre code à usage unique pour accéder à votre questionnaire de suivi AFEIA :

${code}

Valable ${expiresInMinutes} minutes, utilisable une seule fois.

1) Téléchargez l’app AFEIA
2) Ouvrez l’app, allez sur "Questionnaire"
3) Saisissez votre code

Android : ${ANDROID_LINK}
iOS : ${IOS_LINK}

À très vite,
La Team AFEIA

Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.`;

  return { subject, from, to, html, text };
}
