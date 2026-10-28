'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ANAMNESIS_SECTIONS } from '@/lib/anamnesis';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

type Props = {
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

const TONE = {
  pink: { bg: '#3A2733', fg: '#F0C2D8' },
  warm: { bg: '#373131', fg: '#E8A87C' },
  blue: { bg: '#1F2640', fg: '#A9B8EC' },
  grey: { bg: '#2A3140', fg: '#C9CFDA' },
};

/** Premier membre de phrase, court, pour les points clés. */
function clip(v: string, max = 46) {
  const first = v.split(/[.;\n]|\s\(|,\s/)[0].trim();
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/** Points clés tirés de l'anamnèse (à relire : règles simples, pas d'interprétation). */
function keyPoints(a: Record<string, string>) {
  const out: { label: string; tone: keyof typeof TONE }[] = [];
  const has = (k: string) => (a[k] ?? '').trim();
  if (has('motif_principal')) out.push({ label: clip(a.motif_principal), tone: 'pink' });
  if (has('alimentation_ecarts')) out.push({ label: clip(a.alimentation_ecarts), tone: 'warm' });
  if (/insuffisante/i.test(a.alimentation_hydratation ?? '')) out.push({ label: 'Hydratation insuffisante', tone: 'warm' });
  if (has('digestion_symptomes')) out.push({ label: clip(a.digestion_symptomes), tone: 'warm' });
  if (/élevé/i.test(a.stress_niveau ?? '')) out.push({ label: 'Stress élevé', tone: 'blue' });
  else if (has('stress_gestion') && !has('stress_niveau')) out.push({ label: clip(a.stress_gestion), tone: 'blue' });
  if (has('sommeil_qualite')) out.push({ label: clip(a.sommeil_qualite), tone: 'blue' });
  if (has('general_traitements')) out.push({ label: clip(a.general_traitements), tone: 'grey' });
  return out.slice(0, 6);
}

export function AnamnesisPanel({ answers, setAnswers, editing, onEdit, onSave, onCancel, saving, dirty, collectedAt }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({ motif: true, general: true });
  const [extraLabels, setExtraLabels] = useState<Record<string, { label: string; section: string }>>({});

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
  const points = keyPoints(answers);
  const allOpen = sections.every((s) => open[s.id]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="font-serif text-[28px] font-medium">Anamnèse</h2>
          <span className="text-sm text-stone">
            {collectedAt ? `Recueillie le ${new Date(collectedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · ` : ''}
            {filledSections} rubrique{filledSections > 1 ? 's' : ''} sur {sections.length} renseignée{filledSections > 1 ? 's' : ''}
          </span>
        </div>
        {!editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                const next: Record<string, boolean> = {};
                if (!allOpen) sections.forEach((s) => (next[s.id] = true));
                setOpen(next);
              }}
              className="h-10 rounded-[10px] border border-divider px-3.5 text-sm hover:border-sage"
            >
              {allOpen ? 'Tout replier' : 'Tout déplier'}
            </button>
            <Button variant="secondary" onClick={onEdit}>
              Modifier
            </Button>
          </>
        ) : null}
      </div>

      {!editing && points.length ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-[15px] font-semibold">Points clés</h3>
            <span className="text-xs text-stone">résumé à relire, généré depuis l&apos;anamnèse</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {points.map((p) => (
              <span key={p.label} className="rounded-full px-3 py-1.5 text-[13px] font-medium" style={{ background: TONE[p.tone].bg, color: TONE[p.tone].fg }}>
                {p.label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {sections.map((section) => {
          const isOpen = editing || !!open[section.id];
          const n = filled(section.id);
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
                </dl>
              ) : null}
            </section>
          );
        })}
      </div>

      {editing ? (
        <div className="sticky bottom-4 flex flex-wrap gap-2 rounded-2xl border border-divider bg-surface-raised p-3">
          <Button variant="primary" onClick={onSave} loading={saving} disabled={!dirty || saving}>
            Enregistrer
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <span className="self-center text-sm text-stone">Pensez à enregistrer vos réponses.</span>
        </div>
      ) : null}
    </div>
  );
}
