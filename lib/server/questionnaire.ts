import { createAdminClient } from '@/lib/supabase/admin';
import { PUBLIC_SECTIONS, type PublicSection } from '@/lib/questionnaire/sections';
import { fromPublic, toPublic, type AnswerType, type EditorSection } from '@/lib/questionnaire/editor';

type SectionRow = {
  id: string;
  section_key: string;
  position: number;
  title: string;
  description: string;
  visible: boolean;
  questionnaire_questions: {
    question_key: string;
    position: number;
    label: string;
    answer_type: AnswerType;
    options: string[] | null;
    placeholder: string;
    help: string;
    required: boolean;
    medical_warning: boolean;
  }[];
};

export type VersionMeta = { id: string; version: number | null; status: 'draft' | 'published'; published_at: string | null; updated_at: string };

export async function loadVersionSections(versionId: string): Promise<EditorSection[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('questionnaire_sections')
    .select('id, section_key, position, title, description, visible, questionnaire_questions(question_key, position, label, answer_type, options, placeholder, help, required, medical_warning)')
    .eq('version_id', versionId)
    .order('position');
  return ((data ?? []) as SectionRow[]).map((s) => ({
    key: s.section_key,
    title: s.title,
    desc: s.description,
    visible: s.visible,
    questions: [...(s.questionnaire_questions ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        key: q.question_key,
        label: q.label,
        type: q.answer_type,
        options: q.options ?? [],
        placeholder: q.placeholder,
        help: q.help,
        required: q.required,
        warn: q.medical_warning,
      })),
  }));
}

export async function latestPublished(): Promise<VersionMeta | null> {
  const { data } = await createAdminClient()
    .from('questionnaire_versions')
    .select('id, version, status, published_at, updated_at')
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as VersionMeta | null) ?? null;
}

export async function currentDraft(): Promise<VersionMeta | null> {
  const { data } = await createAdminClient()
    .from('questionnaire_versions')
    .select('id, version, status, published_at, updated_at')
    .eq('status', 'draft')
    .maybeSingle();
  return (data as VersionMeta | null) ?? null;
}

/** Questionnaire en ligne : dernière version publiée, sinon le contenu par défaut. */
export async function getPublishedQuestionnaire(): Promise<{ version: number; sections: PublicSection[] }> {
  try {
    const v = await latestPublished();
    if (v) {
      const sections = toPublic(await loadVersionSections(v.id));
      if (sections.length) return { version: v.version ?? 1, sections };
    }
  } catch {
    /* tables absentes : contenu par défaut */
  }
  return { version: 0, sections: PUBLIC_SECTIONS };
}

/** Contenu de référence de la version en ligne (pour l'éditeur). */
export async function publishedEditorSections(): Promise<EditorSection[]> {
  const v = await latestPublished();
  return v ? await loadVersionSections(v.id) : fromPublic();
}

export async function writeVersionSections(versionId: string, sections: EditorSection[]) {
  const supabase = createAdminClient();
  await supabase.from('questionnaire_sections').delete().eq('version_id', versionId);
  for (const [i, s] of sections.entries()) {
    const { data, error } = await supabase
      .from('questionnaire_sections')
      .insert({ version_id: versionId, section_key: s.key, position: i, title: s.title, description: s.desc, visible: s.visible })
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('section');
    if (s.questions.length) {
      const { error: qErr } = await supabase.from('questionnaire_questions').insert(
        s.questions.map((q, j) => ({
          section_id: data.id,
          question_key: q.key,
          position: j,
          label: q.label,
          answer_type: q.type,
          options: q.type === 'text' ? [] : q.options,
          placeholder: q.placeholder,
          help: q.help,
          required: q.required,
          medical_warning: q.warn,
        }))
      );
      if (qErr) throw qErr;
    }
  }
}

/** Nombre de réponses par clé de question (questionnaires reçus). */
export async function answerCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const { data } = await createAdminClient()
    .from('preliminary_questionnaires')
    .select('responses')
    .order('created_at', { ascending: false })
    .limit(5000);
  for (const row of (data ?? []) as { responses: Record<string, Record<string, unknown>> | null }[]) {
    for (const vals of Object.values(row.responses ?? {})) {
      for (const [k, v] of Object.entries(vals ?? {})) {
        if (v !== null && v !== undefined && String(v).trim()) counts[k] = (counts[k] ?? 0) + 1;
      }
    }
  }
  return counts;
}
