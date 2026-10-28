import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { ACCEPTED_DOC_TYPES, MAX_DOC_BYTES } from '@/lib/verification/types';
import { VERIFICATION_BUCKET, docExtension, notifyAdminsOfSignup, runAutomaticChecks } from '@/lib/server/verification';

export const runtime = 'nodejs';

async function currentUser(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { data } = await createSupabaseAuthClient().auth.getUser(auth.slice(7));
  return data.user ?? null;
}

/** Statut de l'inscription du praticien connecté. */
export async function GET(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const [{ data: p }, { data: v }] = await Promise.all([
    supabase.from('practitioners').select('account_status, first_name, full_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('practitioner_verifications')
      .select('decision_motive, decided_at, created_at, replied_at')
      .eq('practitioner_id', user.id)
      .maybeSingle(),
  ]);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    status: p.account_status,
    firstName: p.first_name || (p.full_name ?? '').split(' ')[0] || '',
    email: user.email,
    emailConfirmed: !!user.email_confirmed_at,
    motive: p.account_status === 'info_requested' || p.account_status === 'rejected' ? v?.decision_motive ?? null : null,
    submittedAt: v?.replied_at ?? v?.created_at ?? null,
  });
}

/** Réponse à une demande de complément : message et, au besoin, nouveaux documents. */
export async function POST(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const { data: p } = await supabase.from('practitioners').select('account_status').eq('id', user.id).maybeSingle();
  if (p?.account_status !== 'info_requested') {
    return NextResponse.json({ error: 'Aucun complément n’est attendu.' }, { status: 409 });
  }

  const form = await request.formData();
  const reply = String(form.get('reply') ?? '').trim().slice(0, 2000);
  const patch: Record<string, string | null> = {};
  const stamp = Date.now();

  for (const [field, prefix, pathCol, nameCol] of [
    ['training', 'formation', 'training_doc_path', 'training_doc_name'],
    ['identity', 'identite', 'id_doc_path', 'id_doc_name'],
  ] as const) {
    const f = form.get(field);
    if (!f || typeof f === 'string' || f.size === 0) continue;
    if (f.size > MAX_DOC_BYTES) return NextResponse.json({ error: 'Fichier trop lourd (10 Mo maximum).' }, { status: 400 });
    if (f.type && !ACCEPTED_DOC_TYPES.includes(f.type)) return NextResponse.json({ error: 'Format accepté : PDF, JPG ou PNG.' }, { status: 400 });
    const path = `${user.id}/${prefix}-${stamp}.${docExtension(f)}`;
    const { error } = await supabase.storage.from(VERIFICATION_BUCKET).upload(path, f, { contentType: f.type || undefined });
    if (error) return NextResponse.json({ error: 'L’envoi du document a échoué.' }, { status: 500 });
    patch[pathCol] = path;
    patch[nameCol] = f.name;
  }

  if (!reply && !Object.keys(patch).length) {
    return NextResponse.json({ error: 'Ajoutez un message ou un document.' }, { status: 400 });
  }

  // Les anciens fichiers remplacés sont supprimés.
  const { data: before } = await supabase
    .from('practitioner_verifications')
    .select('training_doc_path, id_doc_path')
    .eq('practitioner_id', user.id)
    .maybeSingle();
  const old = [
    patch.training_doc_path && before?.training_doc_path,
    patch.id_doc_path && before?.id_doc_path,
  ].filter(Boolean) as string[];
  if (old.length) await supabase.storage.from(VERIFICATION_BUCKET).remove(old);

  await supabase
    .from('practitioner_verifications')
    .update({
      ...patch,
      practitioner_reply: reply || null,
      replied_at: new Date().toISOString(),
      decision_status: null,
      decided_at: null,
      decided_by: null,
      checks: {},
      updated_at: new Date().toISOString(),
    })
    .eq('practitioner_id', user.id);
  await supabase.from('practitioners').update({ account_status: 'pending_validation' }).eq('id', user.id);

  await runAutomaticChecks(user.id, { pappers: false, documents: true }).catch(() => undefined);
  await notifyAdminsOfSignup(user.id, 'reply').catch(() => undefined);
  return NextResponse.json({ ok: true });
}
