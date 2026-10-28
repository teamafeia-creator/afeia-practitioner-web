import { NextResponse } from 'next/server';
import { getPublishedQuestionnaire } from '@/lib/server/questionnaire';

export const dynamic = 'force-dynamic';

/** Libellés des questions du questionnaire publié (clé → libellé, rubrique). */
export async function GET() {
  const { sections } = await getPublishedQuestionnaire();
  const labels: Record<string, { label: string; section: string }> = {};
  for (const s of sections) for (const q of s.questions) labels[q.key] = { label: q.label, section: s.title };
  return NextResponse.json({ labels });
}
