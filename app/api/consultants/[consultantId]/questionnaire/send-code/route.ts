import { NextResponse } from 'next/server';

import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import {
  getQuestionnaireCodeTtlMinutes,
  hashQuestionnaireCode
} from '@/lib/server/questionnaireCodes';
import crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit numeric OTP code
 */
function generateNumericOTP(): string {
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  // Generate a number between 100000 and 999999
  const code = 100000 + (randomNumber % 900000);
  return code.toString();
}
import { buildQuestionnaireCodeEmail } from '@/lib/server/questionnaireEmail';
import { sendEmail } from '@/lib/server/email';

const RATE_LIMIT_SECONDS = 60;

export async function POST(
  request: Request,
  { params }: { params: { consultantId: string } }
) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const supabaseAuth = createSupabaseAuthClient();
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  const consultantId = params.consultantId;
  if (!consultantId) {
    return NextResponse.json({ error: 'Consultant invalide.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: consultant, error: consultantError } = await supabase
    .from('consultants')
    .select('id, email, name, practitioner_id')
    .eq('id', consultantId)
    .is('deleted_at', null)
    .single();

  if (consultantError || !consultant) {
    return NextResponse.json({ error: 'Consultant introuvable.' }, { status: 404 });
  }

  if (consultant.practitioner_id !== authData.user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  if (!consultant.email) {
    return NextResponse.json({ error: 'Email requis pour envoyer le questionnaire.' }, { status: 400 });
  }

  const { data: latestCode, error: latestCodeError } = await supabase
    .from('consultant_questionnaire_codes')
    .select('id, created_at')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestCodeError) {
    console.error('Failed to read questionnaire codes', latestCodeError);
    return NextResponse.json({ error: 'Impossible de générer le code.' }, { status: 500 });
  }

  if (latestCode?.created_at) {
    const createdAt = new Date(latestCode.created_at).getTime();
    if (Date.now() - createdAt < RATE_LIMIT_SECONDS * 1000) {
      return NextResponse.json(
        { error: 'Veuillez consultanter quelques instants avant de renvoyer un code.' },
        { status: 429 }
      );
    }
  }

  const now = new Date();
  const ttlMinutes = getQuestionnaireCodeTtlMinutes();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  // Use 6-digit numeric OTP for mobile app compatibility
  // TOUJOURS générer un code aléatoire (pas de code fixe en dev)
  const code = generateNumericOTP();
  const codeHash = hashQuestionnaireCode(code);

  console.log('✅ Code OTP généré:', code);
  console.log('📧 Email:', consultant.email);

  const { error: revokeError } = await supabase
    .from('consultant_questionnaire_codes')
    .update({ revoked_at: now.toISOString() })
    .eq('consultant_id', consultantId)
    .is('used_at', null)
    .is('revoked_at', null);

  if (revokeError) {
    console.error('Failed to revoke questionnaire codes', revokeError);
    return NextResponse.json({ error: 'Impossible de générer le code.' }, { status: 500 });
  }

  const { error: insertError } = await supabase.from('consultant_questionnaire_codes').insert({
    consultant_id: consultantId,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
    sent_to_email: consultant.email,
    created_by_user_id: authData.user.id
  });

  if (insertError) {
    console.error('Failed to create questionnaire code', insertError);
    return NextResponse.json({ error: 'Impossible de générer le code.' }, { status: 500 });
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ ALSO store the code in otp_codes table for mobile app activation
  // The mobile app's consultant-auth.service.ts looks for codes in otp_codes,
  // not in consultant_questionnaire_codes. This ensures the activation flow works.
  // ═══════════════════════════════════════════════════════════════
  const { error: otpInsertError } = await supabase.from('otp_codes').insert({
    email: consultant.email.toLowerCase().trim(),
    code: code, // Plain code for mobile activation
    type: 'activation',
    expires_at: expiresAt.toISOString(),
    // ✅ CRITICAL: Include practitioner_id and consultant_id for proper linking
    practitioner_id: authData.user.id,
    consultant_id: consultantId
  });

  if (otpInsertError) {
    console.error('═══════════════════════════════════════');
    console.error('❌ ERREUR: Impossible de stocker le code dans otp_codes');
    console.error('Email:', consultant.email);
    console.error('Code:', code);
    console.error('Erreur:', otpInsertError);
    console.error('═══════════════════════════════════════');
    // Don't fail the request - continue with email sending
    // The practitioner web flow will still work via consultant_questionnaire_codes
  } else {
    console.log('═══════════════════════════════════════');
    console.log('✅ Code stocké dans otp_codes avec succès');
    console.log('📧 Email:', consultant.email.toLowerCase().trim());
    console.log('🔑 Code:', code);
    console.log('⏰ Expire:', expiresAt.toISOString());
    console.log('═══════════════════════════════════════');
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ ALSO store the code in consultant_invitations for mobile app
  // The mobile app looks in both otp_codes AND consultant_invitations
  // ═══════════════════════════════════════════════════════════════
  const normalizedEmail = consultant.email.toLowerCase().trim();

  // Check if invitation exists
  const { data: existingInvitation } = await supabase
    .from('consultant_invitations')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('practitioner_id', authData.user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvitation) {
    // Update existing invitation with new code
    await supabase
      .from('consultant_invitations')
      .update({
        invitation_code: code,
        code_expires_at: expiresAt.toISOString()
      })
      .eq('id', existingInvitation.id);
    console.log('✅ Invitation mise à jour dans consultant_invitations');
  } else {
    // Create new invitation
    const { error: invitationError } = await supabase
      .from('consultant_invitations')
      .insert({
        email: normalizedEmail,
        practitioner_id: authData.user.id,
        consultant_id: consultantId,
        full_name: consultant.name || null,
        invitation_code: code,
        status: 'pending',
        invited_at: new Date().toISOString(),
        code_expires_at: expiresAt.toISOString()
      });

    if (invitationError) {
      console.error('⚠️ Erreur création invitation:', invitationError);
    } else {
      console.log('✅ Invitation créée dans consultant_invitations');
    }
  }

  // ✅ TOUJOURS envoyer l'email (dev + prod)
  const emailPayload = buildQuestionnaireCodeEmail({
    to: consultant.email,
    consultantName: consultant.name,
    code,
    expiresInMinutes: ttlMinutes
  });

  try {
    await sendEmail(emailPayload);
    console.log(`✅✅✅ EMAIL ENVOYÉ AVEC SUCCÈS à ${consultant.email}`);
    console.log(`Code OTP: ${code}`);

    // TOUJOURS retourner le code au naturopathe pour faciliter le support
    return NextResponse.json({
      ok: true,
      message: `Email envoyé avec succès à ${consultant.email}`,
      code: code,
      expiresAt: expiresAt.toISOString(),
      sentToEmail: consultant.email
    });
  } catch (emailError: unknown) {
    const errorMessage = emailError instanceof Error ? emailError.message : 'Inconnue';
    const errorStack = emailError instanceof Error ? emailError.stack : undefined;
    console.error('❌❌❌ ERREUR ENVOI EMAIL:', emailError);
    console.error('Détails:', errorMessage, errorStack);

    return NextResponse.json({
      error: `Impossible d'envoyer l'email. Erreur: ${errorMessage}. Vérifiez la configuration Resend.`,
      details: errorMessage
    }, { status: 500 });
  }
}
