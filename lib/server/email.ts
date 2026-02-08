type EmailPayload = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
};

type ResendSuccessResponse = {
  id: string;
};

export async function sendEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info('RESEND_API_KEY not configured. Email payload:', {
      to: payload.to,
      subject: payload.subject
    });
    console.info(payload.text);
    return;
  }

  // ⚠️ AVERTISSEMENT: Le domaine resend.dev ne peut envoyer qu'au propriétaire du compte Resend
  if (payload.from.includes('@resend.dev')) {
    console.warn('[email] ATTENTION: Utilisation du domaine de test resend.dev');
    console.warn('[email] Les emails ne seront livres QU\'A l\'adresse du compte Resend!');
    console.warn('[email] Pour envoyer a n\'importe quelle adresse, configurez un domaine verifie.');
    console.warn('[email] Voir: https://resend.com/docs/dashboard/domains/introduction');
  }

  console.log('[email] Sending via Resend...');
  console.log('   From:', payload.from);
  console.log('   To:', payload.to);
  console.log('   Subject:', payload.subject);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: payload.to,
      from: payload.from,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    })
  });

  const responseBody = await response.text();

  if (!response.ok) {
    console.error('❌ Resend API Error:', response.status, responseBody);
    throw new Error(`Email provider error (${response.status}): ${responseBody}`);
  }

  // Log la réponse pour le debugging
  try {
    const successData = JSON.parse(responseBody) as ResendSuccessResponse;
    console.log('✅ Email envoyé avec succès!');
    console.log('   Resend Email ID:', successData.id);
    console.log('   Destinataire:', payload.to);
  } catch {
    console.log('✅ Email envoyé (réponse brute):', responseBody);
  }
}
