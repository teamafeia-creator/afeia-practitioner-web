import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { sendEmail } from '@/lib/server/email';

/**
 * API Route pour envoyer un code d'activation à un patient
 *
 * POST /api/patients/send-activation-code
 * Body: { email, name, patientId? }
 *
 * - Génère un code OTP à 6 chiffres (TOUJOURS aléatoire)
 * - Le stocke dans otp_codes (expire dans 7 jours)
 * - Envoie l'email avec le code via Resend
 * - TOUJOURS retourne le code au naturopathe pour faciliter le support
 */

const RATE_LIMIT_SECONDS = 60;

/**
 * Generate a 6-digit OTP code
 */
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Build the activation email HTML
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
          Votre naturopathe vous invite à rejoindre AFEIA. Voici votre code d'activation :
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
          Téléchargez l'application AFEIA et utilisez ce code pour activer votre compte.
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

Votre naturopathe vous invite à rejoindre AFEIA. Voici votre code d'activation : ${code}

Ce code expire dans ${expiresInDays} jours.

Téléchargez l'application AFEIA et utilisez ce code pour activer votre compte.

AFEIA - Votre assistant santé personnalisé
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
    // 1. Vérifier l'authentification
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;

    // 2. Parser le body
    const body = await request.json();
    const { email, name, patientId } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const patientName = name || 'Patient';

    console.log('═══════════════════════════════════════');
    console.log('📧 ENVOI CODE ACTIVATION');
    console.log('Email:', normalizedEmail);
    console.log('Nom:', patientName);
    console.log('Praticien ID:', practitionerId);
    console.log('═══════════════════════════════════════');

    const supabase = createSupabaseAdminClient();

    // 3. Rate limiting - vérifier si un code a été envoyé récemment
    const { data: latestCode } = await supabase
      .from('otp_codes')
      .select('id, created_at')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestCode?.created_at) {
      const createdAt = new Date(latestCode.created_at).getTime();
      if (Date.now() - createdAt < RATE_LIMIT_SECONDS * 1000) {
        return NextResponse.json(
          { error: 'Veuillez patienter quelques instants avant de renvoyer un code.' },
          { status: 429 }
        );
      }
    }

    // 4. Générer le code OTP (TOUJOURS aléatoire)
    const code = generateOTPCode();
    const expiresInDays = 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    console.log('✅ Code OTP généré:', code);
    console.log('📧 Email:', normalizedEmail);
    console.log('⏰ Expire:', expiresAt.toISOString());

    // 4b. CRITIQUE: S'assurer d'avoir le patient_id (requis pour l'app mobile)
    // Si patientId n'est pas fourni, chercher le patient par email
    let resolvedPatientId = patientId || null;
    let patientData: {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      full_name?: string | null;
      phone?: string | null;
      city?: string | null;
    } | null = null;

    // Chercher le patient par email pour ce praticien
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, first_name, last_name, full_name, phone, city')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .maybeSingle();

    if (existingPatient) {
      resolvedPatientId = existingPatient.id;
      patientData = existingPatient;
      console.log('✅ Patient trouvé par email:', resolvedPatientId);
    } else if (patientId) {
      // Si on a un patientId mais pas trouvé par email, chercher par ID
      const { data: patientById } = await supabase
        .from('patients')
        .select('id, first_name, last_name, full_name, phone, city')
        .eq('id', patientId)
        .single();

      if (patientById) {
        resolvedPatientId = patientById.id;
        patientData = patientById;
        console.log('✅ Patient trouvé par ID:', resolvedPatientId);
      }
    }

    if (!resolvedPatientId) {
      console.warn('⚠️ Aucun patient trouvé pour:', normalizedEmail);
    }

    // 5. Invalider les anciens codes non utilisés
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .eq('used', false);

    // 6. Stocker le nouveau code OTP
    const otpPayload = {
      email: normalizedEmail,
      code: code,
      type: 'activation',
      expires_at: expiresAt.toISOString(),
      used: false,
      practitioner_id: practitionerId,
      patient_id: resolvedPatientId // CRITIQUE: doit être non-null pour l'app mobile
    };

    const { error: otpInsertError } = await supabase
      .from('otp_codes')
      .insert(otpPayload);

    if (otpInsertError) {
      console.error('❌ Erreur stockage code OTP:', otpInsertError);
      return NextResponse.json(
        { error: 'Impossible de générer le code.' },
        { status: 500 }
      );
    }

    console.log('✅ Code OTP stocké dans otp_codes');

    // 6b. CRITIQUE: Stocker aussi dans patient_invitations pour la compatibilité app mobile
    // L'app mobile cherche dans les deux tables (otp_codes ET patient_invitations)
    // Sans cette entrée, l'activation échoue avec "Invitation non trouvée"

    // Vérifier si une invitation existe déjà pour cet email et ce praticien
    const { data: existingInvitation } = await supabase
      .from('patient_invitations')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('practitioner_id', practitionerId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      // Mettre à jour l'invitation existante avec le nouveau code
      const { error: updateInvitationError } = await supabase
        .from('patient_invitations')
        .update({
          invitation_code: code,
          code_expires_at: expiresAt.toISOString()
        })
        .eq('id', existingInvitation.id);

      if (updateInvitationError) {
        console.error('⚠️ Erreur mise à jour invitation:', updateInvitationError);
      } else {
        console.log('✅ Invitation mise à jour dans patient_invitations');
      }
    } else {
      // Créer une nouvelle invitation
      const invitationPayload = {
        email: normalizedEmail,
        practitioner_id: practitionerId,
        patient_id: resolvedPatientId, // CRITIQUE: utiliser resolvedPatientId
        full_name: patientData?.full_name || patientName,
        first_name: patientData?.first_name || patientName.split(' ')[0] || null,
        last_name: patientData?.last_name || patientName.split(' ').slice(1).join(' ') || null,
        phone: patientData?.phone || null,
        city: patientData?.city || null,
        invitation_code: code,
        status: 'pending',
        invited_at: new Date().toISOString(),
        code_expires_at: expiresAt.toISOString()
      };

      const { error: invitationInsertError } = await supabase
        .from('patient_invitations')
        .insert(invitationPayload);

      if (invitationInsertError) {
        console.error('⚠️ Erreur création invitation:', invitationInsertError);
        // Ne pas bloquer - continuer avec l'envoi d'email
      } else {
        console.log('✅ Invitation créée dans patient_invitations');
      }
    }

    // 7. Envoyer l'email
    const emailPayload = buildActivationEmail({
      to: normalizedEmail,
      patientName: patientName,
      code: code,
      expiresInDays: expiresInDays
    });

    try {
      await sendEmail(emailPayload);
      console.log('✅ Email envoyé avec succès à', normalizedEmail);

      // TOUJOURS retourner le code au naturopathe
      return NextResponse.json({
        ok: true,
        message: `Email envoyé avec succès à ${normalizedEmail}`,
        code: code,
        expiresAt: expiresAt.toISOString(),
        sentToEmail: normalizedEmail
      });
    } catch (emailError: unknown) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Erreur inconnue';
      console.error('❌ Erreur envoi email:', emailError);

      // Même si l'email échoue, on retourne le code pour que le naturopathe puisse le donner manuellement
      return NextResponse.json({
        ok: true,
        message: `Code généré mais erreur email: ${errorMessage}`,
        code: code,
        expiresAt: expiresAt.toISOString(),
        sentToEmail: normalizedEmail,
        emailError: errorMessage
      });
    }
  } catch (err) {
    console.error('❌ Exception send-activation-code:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
