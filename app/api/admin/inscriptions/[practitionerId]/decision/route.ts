import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { UNDO_WINDOW_MS, notifyPractitionerOfDecision, type VerificationRow } from '@/lib/server/verification';
import type { AccountStatus } from '@/lib/verification/types';

type Ctx = { params: { practitionerId: string } };
const DECISIONS: AccountStatus[] = ['validated', 'info_requested', 'rejected'];

/** Valide, demande un complément ou refuse. Le motif est obligatoire hors validation. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  const body = (await request.json().catch(() => ({}))) as { decision?: AccountStatus; motive?: string };
  const decision = body.decision;
  const motive = (body.motive ?? '').trim().slice(0, 2000);
  if (!decision || !DECISIONS.includes(decision)) return NextResponse.json({ error: 'Décision invalide.' }, { status: 400 });
  if (decision !== 'validated' && !motive) return NextResponse.json({ error: 'Le motif est obligatoire.' }, { status: 400 });

  const supabase = createAdminClient();
  const [{ data: p }, { data: v }] = await Promise.all([
    supabase.from('practitioners').select('account_status').eq('id', params.practitionerId).maybeSingle(),
    supabase.from('practitioner_verifications').select('checks, pappers, concordance').eq('practitioner_id', params.practitionerId).maybeSingle(),
  ]);
  if (!p || !v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (p.account_status !== 'pending_validation') return NextResponse.json({ error: 'Cette demande a déjà été traitée.' }, { status: 409 });

  if (decision === 'validated') {
    const row = v as Pick<VerificationRow, 'checks' | 'pappers' | 'concordance'>;
    const c = row.checks ?? {};
    const idOk = c.id || row.concordance?.status === 'ok';
    const siretOk = c.siret || row.pappers?.status === 'ok';
    if (!idOk || !siretOk || !c.doc) return NextResponse.json({ error: 'Cochez les trois contrôles pour valider.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  await supabase
    .from('practitioner_verifications')
    .update({ decision_status: decision, decision_motive: motive || null, decided_at: now, decided_by: guard.user.email, updated_at: now })
    .eq('practitioner_id', params.practitionerId);
  const { error } = await supabase.from('practitioners').update({ account_status: decision }).eq('id', params.practitionerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyPractitionerOfDecision(params.practitionerId, decision, motive || null);
  return NextResponse.json({ ok: true, status: decision });
}

/** Annule la décision (dans les 10 minutes) : la demande revient « À valider ». */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  const supabase = createAdminClient();
  const { data: v } = await supabase.from('practitioner_verifications').select('decided_at, id_doc_path').eq('practitioner_id', params.practitionerId).maybeSingle();
  if (!v?.decided_at) return NextResponse.json({ error: 'Aucune décision à annuler.' }, { status: 409 });
  if (Date.now() - new Date(v.decided_at).getTime() > UNDO_WINDOW_MS) {
    return NextResponse.json({ error: 'La décision date de plus de 10 minutes et ne peut plus être annulée.' }, { status: 409 });
  }
  await supabase
    .from('practitioner_verifications')
    .update({ decision_status: null, decision_motive: null, decided_at: null, decided_by: null, updated_at: new Date().toISOString() })
    .eq('practitioner_id', params.practitionerId);
  await supabase.from('practitioners').update({ account_status: 'pending_validation' }).eq('id', params.practitionerId);
  return NextResponse.json({ ok: true });
}
