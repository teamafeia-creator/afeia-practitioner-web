import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { UNDO_WINDOW_MS, VERIFICATION_BUCKET, type VerificationRow } from '@/lib/server/verification';

type Ctx = { params: { practitionerId: string } };

/** Détail d'une demande, avec liens signés (5 min) vers les documents. */
export async function GET(request: NextRequest, { params }: Ctx) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  const supabase = createAdminClient();
  const [{ data: p }, { data: v }] = await Promise.all([
    supabase.from('practitioners').select('id, email, full_name, first_name, last_name, account_status').eq('id', params.practitionerId).maybeSingle(),
    supabase.from('practitioner_verifications').select('*').eq('practitioner_id', params.practitionerId).maybeSingle(),
  ]);
  if (!p || !v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const row = v as VerificationRow;

  const sign = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from(VERIFICATION_BUCKET).createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  };
  const [trainingUrl, idUrl] = await Promise.all([sign(row.training_doc_path), sign(row.id_doc_path)]);
  const canUndo =
    !!row.decided_at && p.account_status !== 'pending_validation' && Date.now() - new Date(row.decided_at).getTime() < UNDO_WINDOW_MS;

  return NextResponse.json({
    id: p.id,
    name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' '),
    firstName: p.first_name || (p.full_name ?? '').split(' ')[0],
    email: p.email,
    status: p.account_status,
    city: row.city,
    school: row.school,
    year: row.training_year,
    siret: row.siret,
    charterAcceptedAt: row.charter_accepted_at,
    createdAt: row.created_at,
    reply: row.practitioner_reply,
    repliedAt: row.replied_at,
    pappers: row.pappers,
    pappersCheckedAt: row.pappers_checked_at,
    concordance: row.concordance,
    checks: row.checks ?? {},
    training: { name: row.training_doc_name, url: trainingUrl },
    identity: { name: row.id_doc_name, url: idUrl, deletedAt: row.id_doc_deleted_at },
    decision: row.decided_at ? { status: row.decision_status, motive: row.decision_motive, at: row.decided_at, by: row.decided_by } : null,
    canUndo,
  });
}

/** Coche ou décoche un contrôle manuel. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  const body = (await request.json().catch(() => ({}))) as { checks?: Record<string, unknown> };
  const checks: Record<string, boolean> = {};
  for (const k of ['id', 'siret', 'doc']) if (typeof body.checks?.[k] === 'boolean') checks[k] = body.checks[k] as boolean;
  const supabase = createAdminClient();
  const { data: v } = await supabase.from('practitioner_verifications').select('checks').eq('practitioner_id', params.practitionerId).maybeSingle();
  if (!v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const next = { ...(v.checks ?? {}), ...checks };
  await supabase
    .from('practitioner_verifications')
    .update({ checks: next, updated_at: new Date().toISOString() })
    .eq('practitioner_id', params.practitionerId);
  return NextResponse.json({ checks: next });
}
