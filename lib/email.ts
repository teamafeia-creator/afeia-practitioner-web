/**
 * Email utility for sending OTP codes to patients
 * Uses the Resend API directly via fetch
 */

type SendOTPEmailOptions = {
  email: string;
  otpCode: string;
  patientName: string;
};

export async function sendOTPEmail({ email, otpCode, patientName }: SendOTPEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

  if (!apiKey) {
    console.info('[EMAIL] RESEND_API_KEY not configured. OTP email would be sent to:', email);
    console.info(`[EMAIL] OTP Code: ${otpCode} for ${patientName}`);
    return { success: true, simulated: true };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #2B5651; margin-bottom: 24px;">Bienvenue ${patientName}</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Votre code d'accès à l'application AFEIA :
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #2B5651; background: #E8F5F3; padding: 16px 32px; border-radius: 8px; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">
          Ce code expire dans 24 heures.
        </p>
        <p style="color: #666; font-size: 14px;">
          Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          AFEIA - Votre assistant santé personnalisé
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Bienvenue ${patientName}

Votre code d'accès à l'application AFEIA : ${otpCode}

Ce code expire dans 24 heures.

Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.

AFEIA - Votre assistant santé personnalisé
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: "Bienvenue chez AFEIA - Votre code d'accès",
        html: htmlContent,
        text: textContent
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Resend error:', errorBody);
      throw new Error(`Email provider error: ${errorBody}`);
    }

    const data = await response.json();
    console.log('✅ Email envoyé:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Email failed:', err);
    throw err;
  }
}
