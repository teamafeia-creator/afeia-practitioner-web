type EmailPayload = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
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

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Email provider error: ${errorBody}`);
  }
}
