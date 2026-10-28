'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toaster';
import { slugKey, type AnswerType, type EditorQuestion, type EditorSection } from '@/lib/questionnaire/editor';

type Payload = {
  version: number;
  publishedAt: string | null;
  sections: EditorSection[];
  base: EditorSection[];
  changes: number;
  counts: Record<string, number>;
};

const TYPES: [AnswerType, string][] = [
  ['text', 'Texte libre'],
  ['choice', 'Choix unique'],
  ['multi', 'Choix multiples'],
];

const field = 'rounded-[10px] border border-divider bg-cream px-3 text-charcoal outline-none focus:border-sage';
const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function AdminQuestionnairePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [changes, setChanges] = useState(0);
  const [sel, setSel] = useState(0);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [newOpt, setNewOpt] = useState('');
  const [modal, setModal] = useState<null | { kind: 'publish' } | { kind: 'removeQ'; qi: number; label: string; answers: number }>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<EditorSection[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/questionnaire', { credentials: 'include' });
    if (!res.ok) {
      showToast.error('Impossible de charger le questionnaire.');
      return;
    }
    const p = (await res.json()) as Payload;
    setData(p);
    setSections(p.sections);
    setChanges(p.changes);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flush = useCallback(async () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setSaving(true);
    const res = await fetch('/api/admin/questionnaire', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: next }),
    });
    setSaving(false);
    const body = (await res.json().catch(() => ({}))) as { changes?: number; error?: string };
    if (!res.ok) {
      showToast.error(body.error ?? 'Le brouillon n’a pas été enregistré.');
      return;
    }
    setChanges(body.changes ?? 0);
  }, []);

  // Enregistrement automatique du brouillon.
  const edit = (fn: (s: EditorSection[]) => EditorSection[]) => {
    setSections((cur) => {
      const next = fn(cur);
      pending.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void flush(), 700);
      return next;
    });
  };

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void flush();
    },
    [flush]
  );

  const cur = sections[Math.min(sel, sections.length - 1)];
  const curIndex = Math.min(sel, sections.length - 1);
  const visibleCount = sections.filter((s) => s.visible).length;
  const counts = data?.counts ?? {};
  const baseKeys = useMemo(() => new Set((data?.base ?? []).flatMap((s) => s.questions.map((q) => q.key))), [data]);

  const setSection = (patch: Partial<EditorSection>) => edit((all) => all.map((s, i) => (i === curIndex ? { ...s, ...patch } : s)));
  const setQuestion = (qi: number, patch: Partial<EditorQuestion>) =>
    edit((all) => all.map((s, i) => (i === curIndex ? { ...s, questions: s.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) } : s)));

  function addRubric() {
    const used = new Set(sections.map((s) => s.key));
    let key = 'nouvelle_rubrique';
    for (let n = 2; used.has(key); n++) key = `nouvelle_rubrique_${n}`;
    edit((all) => [...all, { key, title: 'Nouvelle rubrique', desc: 'Une phrase pour introduire la rubrique.', visible: true, questions: [] }]);
    setSel(sections.length);
    setOpenQ(null);
  }

  function addQuestion() {
    if (!cur) return;
    const used = new Set(sections.flatMap((s) => s.questions.map((q) => q.key)));
    const prefix = slugKey(cur.key);
    let key = `${prefix}_q1`;
    for (let n = 2; used.has(key); n++) key = `${prefix}_q${n}`;
    edit((all) =>
      all.map((s, i) =>
        i === curIndex
          ? { ...s, questions: [...s.questions, { key, label: 'Nouvelle question', type: 'text', options: [], placeholder: '', help: '', required: false, warn: false }] }
          : s
      )
    );
    setOpenQ(key);
  }

  async function discard() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pending.current = null;
    await fetch('/api/admin/questionnaire', { method: 'DELETE', credentials: 'include' });
    await load();
    setSel(0);
    setOpenQ(null);
    showToast.success(`Modifications annulées. Le brouillon reprend la version ${data?.version || 'd’origine'}.`);
  }

  async function confirmModal() {
    if (!modal || !cur) return;
    if (modal.kind === 'removeQ') {
      edit((all) => all.map((s, i) => (i === curIndex ? { ...s, questions: s.questions.filter((_, j) => j !== modal.qi) } : s)));
      setModal(null);
      setOpenQ(null);
      showToast.success('Question retirée du brouillon.');
      return;
    }
    setBusy(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await flush();
    const res = await fetch('/api/admin/questionnaire', { method: 'POST', credentials: 'include' });
    setBusy(false);
    setModal(null);
    const body = (await res.json().catch(() => ({}))) as { version?: number; error?: string };
    if (!res.ok) {
      showToast.error(body.error ?? 'La publication a échoué.');
      return;
    }
    showToast.success(`Version ${body.version} publiée. Les nouveaux questionnaires l’utilisent dès maintenant.`);
    await load();
  }

  if (!data || !cur) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const nextVersion = data.version + 1;
  const dirty = changes > 0;
  const changesLabel = `${changes} modification${changes > 1 ? 's non publiées' : ' non publiée'}`;

  return (
    <div className="flex max-w-[1280px] flex-col gap-5 text-charcoal">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex flex-[1_1_360px] flex-col gap-2">
          <h1 className="font-serif text-[32px] font-medium">Questionnaire préliminaire</h1>
          <p className="max-w-[64ch] text-[15px] leading-normal text-stone">
            Le même questionnaire pour tous les praticiens. Les réponses préremplissent l&apos;anamnèse du dossier consultant.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-sage-light px-3 text-[13px] text-[#A8E6CF]">
              ● {data.version ? `Version ${data.version} en ligne · publiée le ${fmtDate(data.publishedAt)}` : 'Version d’origine en ligne'}
            </span>
            {dirty ? (
              <span className="inline-flex h-7 items-center rounded-full bg-terracotta-light px-3 text-[13px] text-terracotta">
                Brouillon · {changesLabel}
                {saving ? ' · enregistrement…' : ''}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {dirty ? (
            <button type="button" onClick={discard} className="h-11 rounded-[10px] px-3.5 text-sm text-stone hover:text-charcoal">
              Annuler les modifications
            </button>
          ) : null}
          <Link
            href="/admin/questionnaire/apercu"
            target="_blank"
            className="inline-flex h-11 items-center rounded-[10px] border border-divider px-4 text-sm text-charcoal hover:border-sage"
          >
            Tester comme un consultant ↗
          </Link>
          <button
            type="button"
            aria-disabled={!dirty}
            onClick={() => dirty && setModal({ kind: 'publish' })}
            className="h-11 rounded-[10px] px-[18px] text-sm font-semibold"
            style={{ background: dirty ? '#6DD4B8' : '#2A3140', color: dirty ? '#0A0E14' : '#8B95A5', cursor: dirty ? 'pointer' : 'not-allowed' }}
          >
            Publier la version {nextVersion}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        {/* Rubriques */}
        <section aria-label="Rubriques" className="flex min-w-0 max-w-[290px] flex-[1_1_250px] flex-col gap-1.5">
          <div className="flex items-baseline justify-between px-1 pb-1">
            <h2 className="text-[15px] font-semibold">Rubriques</h2>
            <span className="text-xs text-stone">
              {visibleCount} affichées sur {sections.length}
            </span>
          </div>
          {sections.map((s, i) => {
            const on = i === curIndex;
            return (
              <div
                key={s.key}
                className="flex items-center gap-1 rounded-xl border py-1 pr-1"
                style={{ borderColor: on ? '#6DD4B8' : 'transparent', background: on ? '#1C2230' : 'transparent' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSel(i);
                    setOpenQ(null);
                    setNewOpt('');
                  }}
                  aria-current={on ? 'true' : undefined}
                  className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 pl-3 text-left"
                  style={{ color: s.visible ? '#E8EDF4' : '#5C6573' }}
                >
                  <span className="w-[22px] flex-none text-xs tabular-nums text-mist">{i + 1}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-sm font-medium" style={{ textDecoration: s.visible ? 'none' : 'line-through' }}>
                      {s.title}
                    </span>
                    <span className="text-xs text-stone">
                      {s.questions.length} question{s.questions.length > 1 ? 's' : ''}
                      {s.visible ? '' : ' · masquée'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Monter ${s.title}`}
                  onClick={() => {
                    edit((all) => move(all, i, -1));
                    if (on && i > 0) setSel(i - 1);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-stone hover:text-charcoal"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Descendre ${s.title}`}
                  onClick={() => {
                    edit((all) => move(all, i, 1));
                    if (on && i < sections.length - 1) setSel(i + 1);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-stone hover:text-charcoal"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={addRubric} className="mt-1 h-11 rounded-xl border border-dashed border-divider text-sm font-medium text-sage hover:border-sage">
            ＋ Ajouter une rubrique
          </button>
        </section>

        {/* Éditeur */}
        <section aria-label="Rubrique sélectionnée" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
          <div className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-stone">Rubrique {curIndex + 1}</span>
              <span className="flex-1" />
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#B8C1CF]">
                <input type="checkbox" checked={cur.visible} onChange={() => setSection({ visible: !cur.visible })} className="h-[18px] w-[18px] accent-[#6DD4B8]" />
                Affichée aux consultants
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] text-stone">
              Titre
              <input value={cur.title} onChange={(e) => setSection({ title: e.target.value })} className={`${field} h-11 font-serif text-lg`} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-stone">
              Phrase d&apos;introduction
              <input value={cur.desc} onChange={(e) => setSection({ desc: e.target.value })} className={`${field} h-10 text-sm`} />
            </label>
          </div>

          <div className="flex items-baseline justify-between px-1 pt-1">
            <h2 className="text-[15px] font-semibold">Questions</h2>
            <span className="text-xs text-stone">Cliquez sur une question pour la modifier</span>
          </div>

          {cur.questions.length === 0 ? (
            <p className="rounded-[14px] border border-divider bg-surface p-4 text-sm text-stone">
              Aucune question pour l&apos;instant. Une rubrique sans question n&apos;est pas affichée.
            </p>
          ) : null}

          {cur.questions.map((q, qi) => {
            const open = openQ === q.key;
            const n = counts[q.key] ?? 0;
            const isNew = !baseKeys.has(q.key);
            return (
              <div key={q.key} className="overflow-hidden rounded-[14px] border bg-surface" style={{ borderColor: open ? '#2F5A50' : '#2A3140' }}>
                <div className="flex items-center gap-1.5 pr-2">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => {
                      setOpenQ(open ? null : q.key);
                      setNewOpt('');
                    }}
                    className="flex min-h-[52px] min-w-0 flex-1 flex-wrap items-center gap-2 py-2 pl-4 text-left"
                  >
                    <span className="flex-[1_1_220px] text-[15px] font-medium">{q.label || 'Question sans libellé'}</span>
                    <span className="inline-flex h-6 items-center rounded-full bg-[#1F2640] px-[9px] text-xs text-[#A9B8EC]">{TYPES.find((t) => t[0] === q.type)?.[1]}</span>
                    {q.required ? <span className="inline-flex h-6 items-center rounded-full bg-terracotta-light px-[9px] text-xs text-terracotta">Obligatoire</span> : null}
                    {isNew ? <span className="inline-flex h-6 items-center rounded-full bg-sage-light px-[9px] text-xs text-sage">Nouvelle</span> : null}
                    <span className="text-xs text-mist">{n ? `${n} réponse${n > 1 ? 's' : ''}` : 'aucune réponse'}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Monter la question"
                    onClick={() => edit((all) => all.map((s, i) => (i === curIndex ? { ...s, questions: move(s.questions, qi, -1) } : s)))}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-stone hover:text-charcoal"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre la question"
                    onClick={() => edit((all) => all.map((s, i) => (i === curIndex ? { ...s, questions: move(s.questions, qi, 1) } : s)))}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-stone hover:text-charcoal"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                {open ? (
                  <div className="flex flex-col gap-3.5 border-t border-divider px-4 pb-4 pt-1">
                    <label className="flex flex-col gap-1.5 pt-3 text-[13px] text-stone">
                      Libellé de la question
                      <input value={q.label} onChange={(e) => setQuestion(qi, { label: e.target.value })} className={`${field} h-[42px] text-[15px]`} />
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] text-stone">Type de réponse</span>
                      <div role="radiogroup" aria-label="Type de réponse" className="flex flex-wrap gap-1.5">
                        {TYPES.map(([k, l]) => {
                          const on = q.type === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setQuestion(qi, { type: k, options: k !== 'text' && q.options.length === 0 ? ['Oui', 'Non'] : q.options })}
                              className="h-9 rounded-full border px-3.5 text-[13px]"
                              style={{ borderColor: on ? '#6DD4B8' : '#3A4252', background: on ? '#6DD4B8' : 'transparent', color: on ? '#0A0E14' : '#E8EDF4' }}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {q.type !== 'text' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] text-stone">Réponses proposées</span>
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.map((o, oi) => (
                            <span key={`${o}-${oi}`} className="inline-flex h-[34px] items-center gap-1 rounded-full border border-divider bg-surface-raised pl-3 pr-1 text-[13px]">
                              {o}
                              <button
                                type="button"
                                aria-label={`Retirer ${o}`}
                                onClick={() => setQuestion(qi, { options: q.options.filter((_, j) => j !== oi) })}
                                className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-stone hover:text-charcoal"
                              >
                                <X className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </span>
                          ))}
                          <span className="inline-flex h-[34px] items-center gap-1 rounded-full border border-dashed border-divider pl-2.5 pr-1">
                            <input
                              value={newOpt}
                              onChange={(e) => setNewOpt(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newOpt.trim()) {
                                  e.preventDefault();
                                  setQuestion(qi, { options: [...q.options, newOpt.trim()] });
                                  setNewOpt('');
                                }
                              }}
                              placeholder="Nouvelle réponse"
                              aria-label="Nouvelle réponse"
                              className="w-[130px] bg-transparent text-[13px] text-charcoal outline-none placeholder:text-mist"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newOpt.trim()) return;
                                setQuestion(qi, { options: [...q.options, newOpt.trim()] });
                                setNewOpt('');
                              }}
                              className="h-[26px] rounded-full bg-sage-light px-2.5 text-xs font-semibold text-sage"
                            >
                              Ajouter
                            </button>
                          </span>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <label className="flex flex-[1_1_240px] flex-col gap-1.5 text-[13px] text-stone">
                        Exemple affiché dans la case
                        <input value={q.placeholder} onChange={(e) => setQuestion(qi, { placeholder: e.target.value })} placeholder="Ex. horaires, charge mentale…" className={`${field} h-10 text-sm placeholder:text-mist`} />
                      </label>
                      <label className="flex flex-[1_1_240px] flex-col gap-1.5 text-[13px] text-stone">
                        Aide sous la question
                        <input value={q.help} onChange={(e) => setQuestion(qi, { help: e.target.value })} placeholder="Reste visible pendant la saisie" className={`${field} h-10 text-sm placeholder:text-mist`} />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={q.required} onChange={() => setQuestion(qi, { required: !q.required })} className="h-[18px] w-[18px] accent-[#6DD4B8]" />
                        Réponse obligatoire
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={q.warn} onChange={() => setQuestion(qi, { warn: !q.warn })} className="h-[18px] w-[18px] accent-[#F2C94C]" />
                        Afficher l&apos;avertissement « voir avec son médecin »
                      </label>
                      <span className="flex-1" />
                      <span className="text-xs text-mist">
                        Champ de l&apos;anamnèse : <code className="text-stone">{q.key}</code>
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setModal({ kind: 'removeQ', qi, label: q.label, answers: n })}
                        className="h-9 rounded-[9px] border border-[#4A2F2F] px-3 text-[13px] text-[#E57B7B]"
                      >
                        Retirer la question
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <button type="button" onClick={addQuestion} className="h-12 rounded-[14px] border border-dashed border-divider text-sm font-medium text-sage hover:border-sage">
            ＋ Ajouter une question
          </button>
        </section>

        {/* Aperçu */}
        <aside aria-label="Aperçu consultant" className="sticky top-5 flex min-w-0 max-w-[340px] flex-[1_1_280px] flex-col gap-2.5">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-[15px] font-semibold">Aperçu</h2>
            <span className="text-xs text-stone">ce que voit le consultant</span>
          </div>
          <div className="flex flex-col gap-3.5 rounded-[18px] border border-divider bg-surface p-5" style={{ opacity: cur.visible ? 1 : 0.45 }}>
            <span className="text-[11px] font-semibold text-sage">
              Rubrique {sections.filter((s, i) => s.visible && i <= curIndex).length || curIndex + 1} sur {visibleCount}
            </span>
            <span className="font-serif text-[22px] leading-tight">{cur.title}</span>
            <span className="text-[13px] leading-normal text-[#B8C1CF]">{cur.desc}</span>
            {cur.questions.map((q) => (
              <div key={q.key} className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">
                  {q.label}
                  {q.required ? ' *' : ''}
                </span>
                {q.help ? <span className="text-xs text-stone">{q.help}</span> : null}
                {q.type !== 'text' ? (
                  <div className="flex flex-wrap gap-1">
                    {q.options.map((o, i) => (
                      <span key={`${o}-${i}`} className="inline-flex h-[26px] items-center rounded-full border border-[#3A4252] px-2.5 text-[11px]">
                        {o}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="min-h-11 rounded-[9px] border border-divider bg-cream px-2.5 py-2 text-xs text-mist">{q.placeholder || 'Votre réponse'}</span>
                )}
                {q.warn ? (
                  <span className="rounded-lg border border-[#5C4F1E] bg-[#332D17] px-2 py-1.5 text-[11px] leading-snug text-[#F5E3A8]">
                    ⚠ Vérifiez toujours avec votre médecin que les recommandations de votre praticien sont compatibles.
                  </span>
                ) : null}
              </div>
            ))}
            {!cur.visible ? <span className="text-xs text-terracotta">Rubrique masquée : les consultants ne la voient pas.</span> : null}
          </div>
          <p className="px-1 text-xs leading-normal text-mist">
            Les modifications ne sont visibles qu&apos;après publication. Un questionnaire commencé avant la publication garde sa version.
          </p>
        </aside>
      </div>

      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.kind === 'publish'
            ? `Publier la version ${nextVersion} ?`
            : modal?.kind === 'removeQ'
              ? `Retirer « ${modal.label} » ?`
              : ''
        }
        size="sm"
      >
        <div className="flex flex-col gap-3.5">
          {modal?.kind === 'publish' ? (
            <>
              <p className="text-sm leading-relaxed text-[#B8C1CF]">
                {changes} modification{changes > 1 ? 's seront mises en ligne' : ' sera mise en ligne'} pour tous les praticiens.
              </p>
              <p className="text-sm leading-relaxed text-[#B8C1CF]">
                Les questionnaires déjà envoyés ou en cours de remplissage gardent la version {data.version || 'd’origine'}. Les nouvelles questions apparaîtront aussi dans l&apos;anamnèse des dossiers.
              </p>
            </>
          ) : modal?.kind === 'removeQ' ? (
            modal.answers ? (
              <>
                <p className="text-sm leading-relaxed text-[#B8C1CF]">
                  Cette question a déjà {modal.answers} réponse{modal.answers > 1 ? 's' : ''}. Elles restent dans les dossiers des consultants et dans l&apos;anamnèse, rien n&apos;est effacé.
                </p>
                <p className="text-sm leading-relaxed text-[#B8C1CF]">La question n&apos;apparaîtra plus dans les prochains questionnaires, après publication.</p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-[#B8C1CF]">Cette question n&apos;a encore aucune réponse.</p>
            )
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="h-11 rounded-[10px] border border-divider px-4 text-sm">
              Annuler
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmModal()}
              className="h-11 rounded-[10px] px-[18px] text-sm font-semibold text-ink disabled:opacity-60"
              style={{ background: modal?.kind === 'removeQ' ? '#E57B7B' : '#6DD4B8' }}
            >
              {modal?.kind === 'removeQ' ? 'Retirer la question' : 'Publier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
