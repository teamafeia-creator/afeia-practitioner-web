import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import {
  getQuestionnaireAccessTokenTtlMinutes,
  isQuestionnaireCodeMatch
} from '@/lib/server/questionnaireCodes';
import { signQuestionnaireToken } from '@/lib/server/questionnaireTokens';

const GENERIC_ERROR = 'Code invalide ou expiré.';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; code?: string; patientId?: string }
    | null;

  const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const rawPatientId = typeof body?.patientId === 'string' ? body.patientId.trim() : '';
  const rawCode = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';

  if (!rawCode) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (!rawEmail && !rawPatientId) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const patientQuery = supabase.from('patients').select('id, email');
  const patientResult = rawPatientId
    ? await patientQuery.eq('id', rawPatientId).maybeSingle()
    : await patientQuery.eq('email', rawEmail).maybeSingle();

  if (patientResult.error || !patientResult.data) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const patient = patientResult.data;
  const nowIso = new Date().toISOString();

  const { data: codeRecord, error: codeError } = await supabase
    .from('patient_questionnaire_codes')
    .select('id, code_hash, attempts')
    .eq('patient_id', patient.id)
    .is('used_at', null)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError || !codeRecord) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const isValid = isQuestionnaireCodeMatch(rawCode, codeRecord.code_hash);
  if (!isValid) {
    await supabase
      .from('patient_questionnaire_codes')
      .update({ attempts: (codeRecord.attempts ?? 0) + 1 })
      .eq('id', codeRecord.id);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const usedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('patient_questionnaire_codes')
    .update({ used_at: usedAt })
    .eq('id', codeRecord.id);

  if (updateError) {
    console.error('Failed to mark questionnaire code used', updateError);
    return NextResponse.json({ error: 'Impossible de valider le code.' }, { status: 500 });
  }

  const accessTtl = getQuestionnaireAccessTokenTtlMinutes();
  const accessToken = await signQuestionnaireToken({ patientId: patient.id, scope: 'questionnaire' }, accessTtl);
  const expiresAt = new Date(Date.now() + accessTtl * 60 * 1000).toISOString();

  return NextResponse.json({ ok: true, accessToken, expiresAt });
}
