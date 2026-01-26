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
  { params }: { params: { patientId: string } }
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

  const patientId = params.patientId;
  if (!patientId) {
    return NextResponse.json({ error: 'Patient invalide.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, email, name, practitioner_id')
    .eq('id', patientId)
    .is('deleted_at', null)
    .single();

  if (patientError || !patient) {
    return NextResponse.json({ error: 'Patient introuvable.' }, { status: 404 });
  }

  if (patient.practitioner_id !== authData.user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  if (!patient.email) {
    return NextResponse.json({ error: 'Email requis pour envoyer le questionnaire.' }, { status: 400 });
  }

  const { data: latestCode, error: latestCodeError } = await supabase
    .from('patient_questionnaire_codes')
    .select('id, created_at')
    .eq('patient_id', patientId)
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
        { error: 'Veuillez patienter quelques instants avant de renvoyer un code.' },
        { status: 429 }
      );
    }
  }

  const now = new Date();
  const ttlMinutes = getQuestionnaireCodeTtlMinutes();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  const isDev = process.env.NODE_ENV === 'development';
  // Use 6-digit numeric OTP for mobile app compatibility
  const code = isDev ? '123456' : generateNumericOTP();
  const codeHash = hashQuestionnaireCode(code);

  const { error: revokeError } = await supabase
    .from('patient_questionnaire_codes')
    .update({ revoked_at: now.toISOString() })
    .eq('patient_id', patientId)
    .is('used_at', null)
    .is('revoked_at', null);

  if (revokeError) {
    console.error('Failed to revoke questionnaire codes', revokeError);
    return NextResponse.json({ error: 'Impossible de générer le code.' }, { status: 500 });
  }

  const { error: insertError } = await supabase.from('patient_questionnaire_codes').insert({
    patient_id: patientId,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
    sent_to_email: patient.email,
    created_by_user_id: authData.user.id
  });

  if (insertError) {
    console.error('Failed to create questionnaire code', insertError);
    return NextResponse.json({ error: 'Impossible de générer le code.' }, { status: 500 });
  }

  const emailPayload = buildQuestionnaireCodeEmail({
    to: patient.email,
    patientName: patient.name,
    code,
    expiresInMinutes: ttlMinutes
  });

  try {
    await sendEmail(emailPayload);
    console.log(`✅ Email envoyé à ${patient.email}, code: ${code}`);
  } catch (error) {
    console.error('Failed to send questionnaire email', error);
    return NextResponse.json({ error: 'Impossible d\'envoyer l\'email.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString(), sentToEmail: patient.email });
}
