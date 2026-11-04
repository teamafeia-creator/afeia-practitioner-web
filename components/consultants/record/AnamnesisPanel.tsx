'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { addAnamnesisNote, FIRST_NOTE_SECTION, getAnamnesisNotes, saveFirstNote } from '@/lib/queries/dossier';
import type { AnamnesisNote } from '@/lib/types';
import { ANAMNESIS_SECTIONS } from '@/lib/anamnesis';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

type Props = {
  consultantId: string;
  firstName: string;
  answers: Record<string, string>;
  setAnswers: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  dirty: boolean;
  collectedAt: string | null;
};


/** Premier membre de phrase, court, pour résumer une rubrique. */
function clip(v: string, max = 70) {
  const first = v.split(/[.;\n]/)[0].trim();
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function AnamnesisPanel({ consultantId, firstName, answers, setAnswers, editing, onEdit, onSave, onCancel, saving, dirty, collectedAt }: Props) {
  const [view, setView] = useState<'overview' | 'detail'>('overview');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState(0);
  const [extraLabels, setExtraLabels] = useState<Record<string, { label: string; section: string }>>({});

  // Notes du praticien
  const [notes, setNotes] = useState<AnamnesisNote[]>([]);
  const [fnEditing, setFnEditing] = useState(false);
  const [fnDraft, setFnDraft] = useState('');
  const [noteBox, setNoteBox] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAnamnesisNotes(consultantId).then((n) => alive && setNotes(n));
    return () => {
      alive = false;
    };
  }, [consultantId]);

  const knownKeys = useMemo(() => new Set(ANAMNESIS_SECTIONS.flatMap((s) => s.questions.map((q) => q.key))), []);
  const extraKeys = useMemo(() => Object.keys(answers).filter((k) => !knownKeys.has(k) && (answers[k] ?? '').trim()), [answers, knownKeys]);

  // Questions ajoutées au questionnaire par l'équipe Afeia : libellés publiés.
  useEffect(() => {
    if (!extraKeys.length) return;
    let alive = true;
    fetch('/api/questionnaire/labels')
      .then((r) => (r.ok ? r.json() : { labels: {} }))
      .then((d: { labels: Record<string, { label: string; section: string }> }) => alive && setExtraLabels(d.labels ?? {}))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [extraKeys.length]);

  // Ordre : le motif d'abord, comme dans le design.
  const sections = useMemo(() => {
    const motif = ANAMNESIS_SECTIONS.find((s) => s.id === 'motif');
    const rest = ANAMNESIS_SECTIONS.filter((s) => s.id !== 'motif');
    const list = motif ? [motif, ...rest] : rest;
    if (extraKeys.length) {
      list.push({
        id: 'autres',
        title: 'Autres réponses du questionnaire',
        questions: extraKeys.map((k) => ({ key: k, label: extraLabels[k]?.label ?? k })),
      });
    }
    return list;
  }, [extraKeys, extraLabels]);

  const filled = (id: string) => sections.find((s) => s.id === id)?.questions.filter((q) => (answers[q.key] ?? '').trim()).length ?? 0;
  const filledSections = sections.filter((s) => filled(s.id) > 0).length;
  const hasAnswers = filledSections > 0;
  // Réponses déclarées par le consultant : lecture seule. Saisie possible seulement si rien n'a encore été recueilli.
  const canEdit = !hasAnswers;
  const allOpen = sections.every((s) => open[s.id]);

  const firstNote = notes.find((n) => n.section_id === FIRST_NOTE_SECTION) ?? null;
  const cur = sections[Math.min(sel, sections.length - 1)];
  const curNotes = notes.filter((n) => n.section_id === cur?.id);
  const summaryOf = (id: string) => {
    const s = sections.find((x) => x.id === id);
    const v = s?.questions.map((q) => (answers[q.key] ?? '').trim()).find(Boolean);
    return v ? clip(v) : null;
  };

  async function withNote(fn: () => Promise<void>) {
    setNoteBusy(true);
    setNoteError(null);
    try {
      await fn();
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : 'Impossible d’enregistrer la note.');
    } finally {
      setNoteBusy(false);
    }
  }

  const saveFirst = () =>
    withNote(async () => {
      const t = fnDraft.trim();
      if (!t) return;
      const saved = await saveFirstNote(consultantId, t, firstNote?.id);
      setNotes((prev) => [...prev.filter((n) => n.id !== saved.id), saved]);
      setFnEditing(false);
    });

  const saveRubricNote = () =>
    withNote(async () => {
      const t = noteDraft.trim();
      if (!t || !cur) return;
      const saved = await addAnamnesisNote(consultantId, cur.id, t);
      setNotes((prev) => [...prev, saved]);
      setNoteBox(false);
      setNoteDraft('');
    });

  const pick = (i: number) => {
    setSel(i);
    setNoteBox(false);
  };

  const showFirstEditor = fnEditing || !firstNote;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-stone">
            {collectedAt ? `Recueillie le ${dateFmt.format(new Date(collectedAt))} · ` : ''}
            {filledSections} rubrique{filledSections > 1 ? 's' : ''} sur {sections.length} renseignée{filledSections > 1 ? 's' : ''}
          </span>
        </div>
        {!editing && hasAnswers ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-stone">
              <Lock className="h-[13px] w-[13px]" aria-hidden="true" />
              Déclaré par {firstName} · non modifiable
            </span>
            <div role="group" aria-label="Affichage" className="flex gap-1 rounded-[10px] border border-divider p-1">
              {(
                [
                  ['overview', 'Vue d’ensemble'],
                  ['detail', 'Tout le détail'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={view === k}
                  onClick={() => setView(k)}
                  className={`h-8 rounded-[7px] px-3 text-[13px] font-medium ${view === k ? 'bg-sage-light text-sage' : 'text-[#B8C1CF]'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {!editing && canEdit ? (
          <Button variant="secondary" onClick={onEdit}>
            Saisir les réponses en séance
          </Button>
        ) : null}
      </div>

      {/* Ma première note */}
      {!editing ? (
        <section aria-labelledby="fn-t" className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface px-[22px] py-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 id="fn-t" className="text-base font-semibold">
              Ma première note
            </h3>
            <span className="flex-1 text-xs text-stone">
              {firstNote
                ? `Écrite le ${dateFmt.format(new Date(firstNote.created_at))} · invisible pour ${firstName}`
                : 'Pas encore de note · écrivez ce que vous voulez'}
            </span>
            {firstNote && !fnEditing ? (
              <button
                type="button"
                onClick={() => {
                  setFnDraft(firstNote.content);
                  setFnEditing(true);
                }}
                className="text-sm text-sage hover:text-[#A8E6CF]"
              >
                Modifier
              </button>
            ) : null}
          </div>
          {showFirstEditor ? (
            <>
              <label className="flex flex-col gap-1.5 text-[13px] text-stone">
                {firstNote ? 'Modifier ma première note' : 'Écrire ma première note'}
                <Textarea
                  rows={4}
                  value={fnDraft}
                  onChange={(e) => setFnDraft(e.target.value)}
                  placeholder="Votre lecture de l’anamnèse : ce qui ressort, vos premières pistes, ce qu’il faudra creuser en séance…"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 text-xs text-mist">Visible uniquement par vous</span>
                {firstNote ? (
                  <Button variant="ghost" onClick={() => setFnEditing(false)}>
                    Annuler
                  </Button>
                ) : null}
                <Button variant="primary" loading={noteBusy} disabled={!fnDraft.trim()} onClick={() => void saveFirst()}>
                  Enregistrer
                </Button>
              </div>
            </>
          ) : (
            <p className="whitespace-pre-line border-l-[3px] border-sage pl-3.5 font-serif text-[17px] leading-relaxed">{firstNote?.content}</p>
          )}
          {noteError && !noteBox ? <p className="text-sm text-rose">{noteError}</p> : null}
        </section>
      ) : null}

      {/* Vue d'ensemble : rubriques en largeur + détail */}
      {!editing && hasAnswers && view === 'overview' && cur ? (
        <div className="flex flex-col gap-3">
          <nav aria-label="Rubriques de l’anamnèse" className="grid grid-cols-2 gap-1 rounded-[14px] border border-divider bg-surface p-1 md:grid-cols-4">
            {sections.map((s, i) => {
              const on = i === sel;
              const n = filled(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  onClick={() => pick(i)}
                  className={`flex min-h-[54px] min-w-0 items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left ${on ? 'border-[#2F5A50] bg-surface-raised' : 'border-transparent hover:bg-white/5'}`}
                >
                  <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full" style={{ background: n ? '#6DD4B8' : '#5C6573' }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className={`text-[13px] leading-tight ${on ? 'font-semibold' : 'font-medium'}`}>{s.title}</span>
                    <span className="text-[11px]" style={{ color: n ? '#6DD4B8' : '#8B95A5' }}>
                      {n ? `${n} réponse${n > 1 ? 's' : ''}` : 'À renseigner'}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <section aria-live="polite" className="flex flex-col gap-1 rounded-2xl border border-divider bg-surface p-[22px]">
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
              <h3 className="flex-1 font-serif text-[22px] font-medium">{cur.title}</h3>
              <button
                type="button"
                onClick={() => pick((sel + sections.length - 1) % sections.length)}
                aria-label="Rubrique précédente"
                className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-divider hover:border-sage"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => pick((sel + 1) % sections.length)}
                aria-label="Rubrique suivante"
                className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-divider hover:border-sage"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {summaryOf(cur.id) ? <p className="mb-1.5 text-sm text-sage">{summaryOf(cur.id)}</p> : null}
            <dl className="flex flex-col">
              {cur.questions.map((q) => {
                const v = (answers[q.key] ?? '').trim();
                return (
                  <div key={q.key} className="grid gap-x-6 gap-y-1.5 border-t border-[#1F2633] py-3.5 sm:grid-cols-[minmax(150px,220px)_minmax(0,1fr)]">
                    <dt className="text-[13px] font-semibold text-stone">{q.label}</dt>
                    <dd className={`whitespace-pre-line break-words text-[15px] leading-relaxed ${v ? '' : 'italic text-mist'}`}>{v || 'Non renseigné'}</dd>
                  </div>
                );
              })}
            </dl>

            <div className="mt-2 flex flex-col gap-2 border-t border-divider pt-3.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[13px] font-semibold text-stone">Mes notes sur cette rubrique</span>
                {!noteBox ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteBox(true);
                      setNoteDraft('');
                    }}
                    className="text-sm text-sage hover:text-[#A8E6CF]"
                  >
                    ＋ Ajouter une note
                  </button>
                ) : null}
              </div>
              {curNotes.map((n) => (
                <div key={n.id} className="flex flex-col gap-[3px] rounded-[10px] border border-[#2F5A50] bg-[#1C2E2A] px-3 py-2.5">
                  <span className="whitespace-pre-line text-sm leading-relaxed">{n.content}</span>
                  <span className="text-xs text-stone">
                    Vous · {dateFmt.format(new Date(n.created_at))} · invisible pour {firstName}
                  </span>
                </div>
              ))}
              {noteBox ? (
                <>
                  <Textarea
                    aria-label="Note sur la rubrique"
                    rows={3}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Ce que vous en retenez, ce qu’il faudra vérifier en séance…"
                  />
                  {noteError ? <p className="text-sm text-rose">{noteError}</p> : null}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setNoteBox(false)}>
                      Annuler
                    </Button>
                    <Button variant="primary" loading={noteBusy} disabled={!noteDraft.trim()} onClick={() => void saveRubricNote()}>
                      Enregistrer la note
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {/* Tout le détail (ou saisie en séance) */}
      {editing || !hasAnswers || view === 'detail' ? (
        <div className="flex flex-col gap-2.5">
          {!editing && hasAnswers ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  if (!allOpen) sections.forEach((s) => (next[s.id] = true));
                  setOpen(next);
                }}
                className="text-sm text-sage hover:text-[#A8E6CF]"
              >
                {allOpen ? 'Tout replier' : 'Tout déplier'}
              </button>
            </div>
          ) : null}
          {sections.map((section) => {
            const isOpen = editing || !!open[section.id];
            const n = filled(section.id);
            const sectionNotes = notes.filter((x) => x.section_id === section.id);
            return (
              <section key={section.id} className="overflow-hidden rounded-2xl border border-divider bg-surface">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => !editing && setOpen((o) => ({ ...o, [section.id]: !o[section.id] }))}
                  className="flex min-h-[56px] w-full items-center gap-3 px-5 text-left"
                >
                  <span className="flex-1 text-[15px] font-semibold">{section.title}</span>
                  <span className="text-xs text-stone">
                    {n} / {section.questions.length} champ{section.questions.length > 1 ? 's' : ''}
                  </span>
                  {!editing ? (
                    <ChevronDown className="h-4 w-4 text-stone transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
                  ) : null}
                </button>
                {isOpen ? (
                  <dl className="grid gap-x-6 gap-y-4 border-t border-divider px-5 py-4 md:grid-cols-2">
                    {section.questions.map((q) => {
                      const v = answers[q.key] ?? '';
                      return (
                        <div key={q.key} className="flex flex-col gap-1.5">
                          <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-stone">{q.label}</dt>
                          <dd>
                            {editing ? (
                              'type' in q && q.type === 'choice' ? (
                                <Select value={v} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}>
                                  <option value="">Sélectionner</option>
                                  {('options' in q ? q.options ?? [] : []).map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </Select>
                              ) : (
                                <Textarea
                                  value={v}
                                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                                  placeholder={('placeholder' in q && q.placeholder) || 'Votre réponse'}
                                  rows={3}
                                />
                              )
                            ) : v.trim() ? (
                              <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{v}</p>
                            ) : (
                              <p className="text-sm italic text-mist">À renseigner</p>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                    {!editing && sectionNotes.length ? (
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <span className="text-xs font-semibold text-stone">Mes notes</span>
                        {sectionNotes.map((x) => (
                          <p key={x.id} className="whitespace-pre-line rounded-[10px] border border-[#2F5A50] bg-[#1C2E2A] px-3 py-2.5 text-sm">
                            {x.content}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {editing ? (
        <div className="sticky bottom-4 flex flex-wrap gap-2 rounded-2xl border border-divider bg-surface-raised p-3">
          <Button variant="primary" onClick={onSave} loading={saving} disabled={!dirty || saving}>
            Enregistrer
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <span className="self-center text-sm text-stone">Une fois enregistrées, les réponses ne seront plus modifiables.</span>
        </div>
      ) : null}
    </div>
  );
}
