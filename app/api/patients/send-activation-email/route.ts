import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { sendEmail } from '@/lib/server/email';

/**
 * API Route pour envoyer un email d'activation avec un code existant
 * (ne genere pas de nouveau code, utilise celui fourni)
 *
 * POST /api/patients/send-activation-email
 * Body: { email, name, code, patientId? }
 */

function buildActivationEmail(params: {
  to: string;
  patientName: string;
  code: string;
  expiresInDays: number;
}): {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
} {
  const { to, patientName, code, expiresInDays } = params;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'AFEIA <contact@afeia.fr>';

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
          Votre naturopathe vous invite a rejoindre AFEIA. Voici votre code d'activation :
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #2B5651; background: #E8F5F3; padding: 16px 32px; border-radius: 8px; display: inline-block;">
            ${code}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">
          Ce code expire dans ${expiresInDays} jours.
        </p>
        <p style="color: #666; font-size: 14px;">
          Telechargez l'application AFEIA et utilisez ce code pour activer votre compte.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          AFEIA - Votre assistant sante personnalise
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Bienvenue ${patientName}

Votre naturopathe vous invite a rejoindre AFEIA. Voici votre code d'activation : ${code}

Ce code expire dans ${expiresInDays} jours.

Telechargez l'application AFEIA et utilisez ce code pour activer votre compte.

AFEIA - Votre assistant sante personnalise
  `.trim();

  return {
    to,
    from: fromEmail,
    subject: "Bienvenue chez AFEIA - Votre code d'activation",
    html: htmlContent,
    text: textContent
  };
}

export async function POST(request: Request) {
  try {
    // 1. Verifier l'authentification
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    // 2. Parser le body
    const body = await request.json();
    const { email, name, code, patientId } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'Email et code requis.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const patientName = name || 'Patient';

    console.log('ENVOI EMAIL ACTIVATION (code existant)');
    console.log('Email:', normalizedEmail);
    console.log('Code:', code);
    console.log('Patient ID:', patientId);

    // 3. Envoyer l'email
    const emailPayload = buildActivationEmail({
      to: normalizedEmail,
      patientName: patientName,
      code: code,
      expiresInDays: 7
    });

    try {
      await sendEmail(emailPayload);
      console.log('Email envoye avec succes a', normalizedEmail);

      return NextResponse.json({
        ok: true,
        message: `Email envoye avec succes a ${normalizedEmail}`,
        code: code,
        sentToEmail: normalizedEmail
      });
    } catch (emailError: unknown) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Erreur inconnue';
      console.error('Erreur envoi email:', emailError);

      return NextResponse.json({
        ok: false,
        error: `Erreur email: ${errorMessage}`,
        code: code
      }, { status: 500 });
    }
  } catch (err) {
    console.error('Exception send-activation-email:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
