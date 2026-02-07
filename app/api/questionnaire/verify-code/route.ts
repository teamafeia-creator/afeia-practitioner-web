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
    | { email?: string; code?: string; consultantId?: string }
    | null;

  const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const rawConsultantId = typeof body?.consultantId === 'string' ? body.consultantId.trim() : '';
  const rawCode = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';

  if (!rawCode) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (!rawEmail && !rawConsultantId) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const consultantQuery = supabase.from('consultants').select('id, email').is('deleted_at', null);
  const consultantResult = rawConsultantId
    ? await consultantQuery.eq('id', rawConsultantId).maybeSingle()
    : await consultantQuery.eq('email', rawEmail).maybeSingle();

  if (consultantResult.error || !consultantResult.data) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const consultant = consultantResult.data;
  const nowIso = new Date().toISOString();

  const { data: codeRecord, error: codeError } = await supabase
    .from('consultant_questionnaire_codes')
    .select('id, code_hash, attempts')
    .eq('consultant_id', consultant.id)
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
      .from('consultant_questionnaire_codes')
      .update({ attempts: (codeRecord.attempts ?? 0) + 1 })
      .eq('id', codeRecord.id);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const usedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('consultant_questionnaire_codes')
    .update({ used_at: usedAt })
    .eq('id', codeRecord.id);

  if (updateError) {
    console.error('Failed to mark questionnaire code used', updateError);
    return NextResponse.json({ error: 'Impossible de valider le code.' }, { status: 500 });
  }

  const accessTtl = getQuestionnaireAccessTokenTtlMinutes();
  const accessToken = await signQuestionnaireToken({ consultantId: consultant.id, scope: 'questionnaire' }, accessTtl);
  const expiresAt = new Date(Date.now() + accessTtl * 60 * 1000).toISOString();

  return NextResponse.json({ ok: true, accessToken, expiresAt });
}
