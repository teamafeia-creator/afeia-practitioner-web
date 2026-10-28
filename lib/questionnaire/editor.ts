// Modèle d'édition du questionnaire préliminaire (admin) et conversions.
import { PUBLIC_SECTIONS, type PublicSection } from './sections';

export type AnswerType = 'text' | 'choice' | 'multi';

export type EditorQuestion = {
  key: string;
  label: string;
  type: AnswerType;
  options: string[];
  placeholder: string;
  help: string;
  required: boolean;
  warn: boolean;
};

export type EditorSection = {
  key: string;
  title: string;
  desc: string;
  visible: boolean;
  questions: EditorQuestion[];
};

export function fromPublic(sections: PublicSection[] = PUBLIC_SECTIONS): EditorSection[] {
  return sections.map((s) => ({
    key: s.id,
    title: s.title,
    desc: s.desc,
    visible: true,
    questions: s.questions.map((q) => ({
      key: q.key,
      label: q.label,
      type: q.options?.length ? (q.multi ? 'multi' : 'choice') : 'text',
      options: q.options ?? [],
      placeholder: q.placeholder ?? '',
      help: q.help ?? '',
      required: !!q.required,
      warn: !!q.warn,
    })),
  }));
}

/** Sections visibles, au format lu par le questionnaire public. */
export function toPublic(sections: EditorSection[]): PublicSection[] {
  return sections
    .filter((s) => s.visible && s.questions.length)
    .map((s) => ({
      id: s.key,
      title: s.title,
      desc: s.desc,
      questions: s.questions.map((q) => ({
        key: q.key,
        label: q.label,
        help: q.help,
        placeholder: q.placeholder || undefined,
        options: q.type === 'text' ? undefined : q.options,
        multi: q.type === 'multi' || undefined,
        required: q.required || undefined,
        warn: q.warn || undefined,
      })),
    }));
}

/** Nombre de modifications entre deux versions (rubriques et questions ajoutées, retirées, modifiées, déplacées). */
export function countChanges(base: EditorSection[], draft: EditorSection[]): number {
  let n = 0;
  const baseKeys = base.map((s) => s.key);
  const draftKeys = draft.map((s) => s.key);
  const common = draftKeys.filter((k) => baseKeys.includes(k));
  const baseOrder = baseKeys.filter((k) => draftKeys.includes(k));
  if (common.join('|') !== baseOrder.join('|')) n += 1;
  n += draftKeys.filter((k) => !baseKeys.includes(k)).length;
  n += baseKeys.filter((k) => !draftKeys.includes(k)).length;
  for (const d of draft) {
    const b = base.find((s) => s.key === d.key);
    if (!b) continue;
    if (b.title !== d.title || b.desc !== d.desc || b.visible !== d.visible) n += 1;
    const bq = b.questions.map((q) => q.key);
    const dq = d.questions.map((q) => q.key);
    if (dq.filter((k) => bq.includes(k)).join('|') !== bq.filter((k) => dq.includes(k)).join('|')) n += 1;
    n += dq.filter((k) => !bq.includes(k)).length;
    n += bq.filter((k) => !dq.includes(k)).length;
    for (const q of d.questions) {
      const o = b.questions.find((x) => x.key === q.key);
      if (o && JSON.stringify({ ...o, key: '' }) !== JSON.stringify({ ...q, key: '' })) n += 1;
    }
  }
  return n;
}

export const slugKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'rubrique';
