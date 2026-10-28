import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { countChanges, type EditorSection } from '@/lib/questionnaire/editor';
import {
  answerCounts,
  currentDraft,
  latestPublished,
  loadVersionSections,
  publishedEditorSections,
  writeVersionSections,
} from '@/lib/server/questionnaire';

/** Brouillon en cours (ou version en ligne), version publiée et nombre de réponses par question. */
export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  const [published, draft, counts] = await Promise.all([latestPublished(), currentDraft(), answerCounts()]);
  const base = await publishedEditorSections();
  const sections = draft ? await loadVersionSections(draft.id) : base;
  return NextResponse.json({
    version: published?.version ?? 0,
    publishedAt: published?.published_at ?? null,
    sections,
    base,
    changes: draft ? countChanges(base, sections) : 0,
    counts,
  });
}

function validSections(v: unknown): v is EditorSection[] {
  if (!Array.isArray(v) || v.length > 40) return false;
  const keys = new Set<string>();
  for (const s of v as EditorSection[]) {
    if (!s || typeof s.key !== 'string' || !s.key || typeof s.title !== 'string' || !Array.isArray(s.questions)) return false;
    for (const q of s.questions) {
      if (!q || typeof q.key !== 'string' || !q.key || typeof q.label !== 'string') return false;
      if (!['text', 'choice', 'multi'].includes(q.type)) return false;
      if (keys.has(q.key)) return false;
      keys.add(q.key);
    }
  }
  return true;
}

/** Enregistre le brouillon (crée la ligne brouillon si besoin). */
export async function PUT(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  const body = (await request.json().catch(() => ({}))) as { sections?: unknown };
  if (!validSections(body.sections)) return NextResponse.json({ error: 'Questionnaire invalide (clés en double ?).' }, { status: 400 });
  const supabase = createAdminClient();
  let draftId = (await currentDraft())?.id ?? null;
  if (!draftId) {
    const { data, error } = await supabase.from('questionnaire_versions').insert({ status: 'draft' }).select('id').single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'draft' }, { status: 500 });
    draftId = data.id as string;
  }
  try {
    await writeVersionSections(draftId, body.sections);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Enregistrement impossible.' }, { status: 500 });
  }
  await supabase.from('questionnaire_versions').update({ updated_at: new Date().toISOString() }).eq('id', draftId);
  const base = await publishedEditorSections();
  return NextResponse.json({ changes: countChanges(base, body.sections) });
}

/** Abandonne le brouillon. */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  await createAdminClient().from('questionnaire_versions').delete().eq('status', 'draft');
  return NextResponse.json({ ok: true });
}

/** Publie le brouillon comme version N+1. */
export async function POST(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) return guard.response;
  const supabase = createAdminClient();
  const [draft, published] = await Promise.all([currentDraft(), latestPublished()]);
  if (!draft) return NextResponse.json({ error: 'Aucune modification à publier.' }, { status: 409 });
  const next = (published?.version ?? 0) + 1;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('questionnaire_versions')
    .update({ status: 'published', version: next, published_at: now, published_by: guard.user.email, updated_at: now })
    .eq('id', draft.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ version: next, publishedAt: now });
}
