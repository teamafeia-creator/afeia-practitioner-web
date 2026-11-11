'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Modal, ModalFooter } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { cn } from '../../lib/cn';
import { CONSEILLANCIER_SECTIONS } from '../../lib/conseillancier';
import { formatFrequency, type TrackFrequency } from '../../lib/observance-tracking';
import type { ChecklistEdit, ObservanceItemStat } from '../../lib/queries/observance';
import type { CyclePhase, JournalEntry } from '../../lib/types';
import { FrequencyPicker } from '../consultants/conseillancier/FrequencyPicker';

const DAYS = 14;

const FIELD_SECTION_TITLE: Record<string, string> = Object.fromEntries(
  CONSEILLANCIER_SECTIONS.flatMap((section) => section.fields.map((field) => [field.key, section.title]))
);

function rateColor(r: number) {
  return r >= 0.7 ? 'text-sage' : r >= 0.4 ? 'text-terracotta' : 'text-rose';
}
function rateBar(r: number) {
  return r >= 0.7 ? 'bg-sage' : r >= 0.4 ? 'bg-terracotta' : 'bg-rose';
}
function rateLabel(s: ObservanceItemStat) {
  return `${s.done} / ${s.planned} ${s.planned > 1 ? 'jours' : 'jour'}`;
}
function ratio(s: ObservanceItemStat) {
  return s.planned ? Math.min(1, s.done / s.planned) : 0;
}

type Draft = { key: string; id?: string; label: string; freq: TrackFrequency; source: string };

/**
 * Checklist d'observance du consultant, reliée au conseillancier :
 * taux de suivi sur 14 jours, modification (libellé, fréquence, ajout, retrait) et rappel personnalisé.
 */
export function ObservanceChecklistCard({
  firstName,
  stats,
  hasSharedPlan,
  daysWithoutEntry,
  onSave,
  onSendReminder,
  onOpenConseillancier,
}: {
  firstName: string;
  stats: ObservanceItemStat[];
  hasSharedPlan: boolean;
  /** Dates (AAAA-MM-JJ) sans saisie sur les 14 derniers jours. */
  daysWithoutEntry: string[];
  onSave: (edits: ChecklistEdit[]) => Promise<void>;
  onSendReminder: (text: string) => Promise<void>;
  onOpenConseillancier: () => void;
}) {
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [openFreq, setOpenFreq] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  function startEdit() {
    setDraft(
      stats.map((s) => ({
        key: s.item.id,
        id: s.item.id,
        label: s.item.label,
        freq: s.freq,
        source: s.item.source_key
          ? `Issu du conseillancier · ${FIELD_SECTION_TITLE[s.item.source_key] ?? 'conseil'}`
          : 'Ajouté depuis le journal',
      }))
    );
    setOpenFreq(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await onSave(draft.filter((d) => d.label.trim()).map((d) => ({ id: d.id, label: d.label, freq: d.freq })));
      setDraft(null);
      setOpenFreq(null);
    } finally {
      setSaving(false);
    }
  }

  const update = (key: string, patch: Partial<Draft>) =>
    setDraft((prev) => (prev ? prev.map((d) => (d.key === key ? { ...d, ...patch } : d)) : prev));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold">Checklist d&apos;observance</h3>
            <p className="text-xs text-stone">
              Issue du conseillancier · {firstName} la coche chaque jour dans l&apos;app · {DAYS} derniers jours
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {draft ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setDraft(null)} disabled={saving}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" onClick={save} loading={saving}>
                  Enregistrer
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
                  Envoyer un rappel à {firstName}
                </Button>
                <Button variant="outline" size="sm" onClick={onOpenConseillancier}>
                  Voir dans le conseillancier
                </Button>
                {hasSharedPlan ? (
                  <Button variant="secondary" size="sm" onClick={startEdit}>
                    Modifier la checklist
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {draft ? (
          <div className="flex flex-col">
            {draft.map((d) => (
              <div key={d.key} className="flex flex-col gap-2 border-t border-divider py-2.5 first:border-t-0">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    aria-label="Libellé de l'item"
                    value={d.label}
                    placeholder="Ex. Marche de 20 min après le déjeuner"
                    onChange={(e) => update(d.key, { label: e.target.value })}
                    className="h-9 min-w-0 flex-[1_1_260px] rounded-lg border border-divider bg-ink px-3 text-sm text-charcoal placeholder:text-mist"
                  />
                  <button
                    type="button"
                    aria-expanded={openFreq === d.key}
                    onClick={() => setOpenFreq(openFreq === d.key ? null : d.key)}
                    className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full border border-sage/40 bg-sage-light px-3 text-xs font-semibold text-sage"
                  >
                    {formatFrequency(d.freq)}
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Retirer ${d.label || "l'item"}`}
                    title="Retirer de la checklist"
                    onClick={() => setDraft((prev) => (prev ? prev.filter((x) => x.key !== d.key) : prev))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-divider text-rose hover:border-rose/40"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-xs text-stone">{d.source}</span>
                {openFreq === d.key ? <FrequencyPicker value={d.freq} onChange={(freq) => update(d.key, { freq })} /> : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const key = `new-${Date.now()}`;
                setDraft((prev) => [...(prev ?? []), { key, label: '', freq: { mode: 'daily' }, source: 'Nouvel item, ajouté depuis le journal' }]);
                setOpenFreq(null);
              }}
              className="mt-1.5 inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed border-sage/40 px-3 text-sm font-medium text-sage"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un item
            </button>
            <p className="mt-3 text-xs text-stone">
              Les changements sont visibles tout de suite dans l&apos;app de {firstName} et repris dans le conseillancier.
              L&apos;historique de suivi des items conservés est gardé.
            </p>
          </div>
        ) : stats.length ? (
          <div className="flex flex-col">
            {stats.map((s) => {
              const r = ratio(s);
              return (
                <div key={s.item.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-divider py-2.5 first:border-t-0">
                  <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
                    <span className="text-sm font-medium">{s.item.label}</span>
                    <span className="text-xs text-stone">
                      {s.item.source_key ? FIELD_SECTION_TITLE[s.item.source_key] ?? 'Conseillancier' : 'Ajouté depuis le journal'}
                    </span>
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-sage/40 bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage">
                    {formatFrequency(s.freq)}
                  </span>
                  <div className="flex min-w-[140px] flex-[0_1_220px] items-center gap-2.5">
                    {s.isNew ? (
                      <span className="text-xs text-stone">Pas encore de données</span>
                    ) : (
                      <>
                        <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
                          <div className={cn('h-full rounded-full', rateBar(r))} style={{ width: `${Math.round(r * 100)}%` }} />
                        </div>
                        <span className={cn('min-w-[72px] text-right text-[13px] font-semibold', rateColor(r))}>{rateLabel(s)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="mt-3 text-xs text-stone">
              Vous pouvez modifier la checklist ici ou dans le conseillancier (case « Suivre » à côté de chaque conseil) : les
              deux restent synchronisés.
            </p>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-stone">
            Aucun item suivi. Dans le conseillancier, cochez « Suivre » à côté d&apos;un conseil pour l&apos;ajouter à la
            checklist de {firstName}
            {hasSharedPlan ? ', ou ajoutez-en un avec « Modifier la checklist ».' : '.'}
          </p>
        )}
      </CardContent>

      <ReminderModal
        isOpen={reminderOpen}
        onClose={() => setReminderOpen(false)}
        firstName={firstName}
        stats={stats}
        daysWithoutEntry={daysWithoutEntry}
        onSend={async (text) => {
          await onSendReminder(text);
          setReminderOpen(false);
        }}
      />
    </Card>
  );
}

// ─── Rappel personnalisé ─────────────────────────

function ReminderModal({
  isOpen,
  onClose,
  firstName,
  stats,
  daysWithoutEntry,
  onSend,
}: {
  isOpen: boolean;
  onClose: () => void;
  firstName: string;
  stats: ObservanceItemStat[];
  daysWithoutEntry: string[];
  onSend: (text: string) => Promise<void>;
}) {
  const options = useMemo(
    () => [
      {
        id: 'journal',
        label: `Remplir le journal${daysWithoutEntry.length ? ` (${daysWithoutEntry.length} ${daysWithoutEntry.length > 1 ? 'jours' : 'jour'} sans saisie)` : ''}`,
        stat: null as ObservanceItemStat | null,
      },
      ...stats.map((s) => ({ id: s.item.id, label: s.item.label, stat: s })),
    ],
    [stats, daysWithoutEntry.length]
  );
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        options.map((o) => [o.id, o.stat ? !o.stat.isNew && ratio(o.stat) < 0.7 : daysWithoutEntry.length > 0])
      ) as Record<string, boolean>,
    [options, daysWithoutEntry.length]
  );
  const [selected, setSelected] = useState<Record<string, boolean> | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sel = selected ?? defaults;

  const generated = useMemo(() => {
    const items = options.filter((o) => o.stat && sel[o.id]);
    let out = `Bonjour ${firstName},\n\n`;
    if (sel.journal) {
      out +=
        'Petit rappel : pensez à remplir votre journal chaque soir, même en deux minutes. Ces notes m’aident beaucoup à ajuster votre programme.\n\n';
    }
    if (items.length) {
      out += sel.journal ? 'J’ai aussi regardé votre checklist. ' : 'J’ai regardé votre checklist. ';
      out += items.length > 1 ? 'Ces conseils semblent plus difficiles à tenir en ce moment :\n' : 'Ce conseil semble plus difficile à tenir en ce moment :\n';
      out += items.map((o) => `- ${o.label}`).join('\n');
      out += '\n\nC’est normal, on ajuste ensemble. Concentrez-vous sur un seul point cette semaine, et dites-moi par message ce qui coince.\n\n';
    }
    return `${out}À bientôt !`;
  }, [options, sel, firstName]);

  const message = text ?? generated;
  const canSend = message.trim().length > 0 && (text !== null || options.some((o) => sel[o.id]));

  function close() {
    setSelected(null);
    setText(null);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      size="lg"
      title={`Rappel à ${firstName}`}
      description="Envoyé dans sa messagerie, avec une notification dans l’app."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Que voulez-vous mentionner ?</span>
          <span className="text-xs text-stone">
            Les conseils les moins suivis sur {DAYS} jours sont cochés d&apos;office. Le message se met à jour selon votre choix.
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {options.map((o) => {
              const on = Boolean(sel[o.id]);
              const r = o.stat ? ratio(o.stat) : null;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setSelected({ ...sel, [o.id]: !on })}
                  className={cn(
                    'flex min-h-[40px] items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left',
                    on ? 'border-sage/40 bg-sage-light/40' : 'border-divider'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 text-[11px] font-bold text-ink',
                      on ? 'border-sage bg-sage' : 'border-mist'
                    )}
                  >
                    {on ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{o.label}</span>
                  {o.stat && r !== null && !o.stat.isNew ? (
                    <span className={cn('text-xs font-semibold', rateColor(r))}>{rateLabel(o.stat)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Message
          <Textarea rows={10} value={message} onChange={(e) => setText(e.target.value)} className="font-normal" />
        </label>
        {text !== null ? (
          <span className="text-xs text-stone">
            Vous avez modifié le message : il ne suit plus vos coches.{' '}
            <button type="button" onClick={() => setText(null)} className="text-sage underline">
              Régénérer à partir des coches
            </button>
          </span>
        ) : null}
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={close} disabled={sending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          loading={sending}
          disabled={!canSend || sending}
          onClick={async () => {
            setSending(true);
            try {
              await onSend(message.trim());
              setSelected(null);
              setText(null);
            } finally {
              setSending(false);
            }
          }}
        >
          Envoyer à {firstName}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Ce qui ressort ─────────────────────────

type Insight = { text: string; how: string; tone: 'sage' | 'terracotta' | 'rose' | 'stone' | 'sky' };

const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: 'pendant les règles',
  follicular: 'en phase folliculaire',
  ovulation: 'autour de l’ovulation',
  luteal_early: 'en début de phase lutéale',
  luteal_late: 'en fin de phase lutéale',
};

function avg(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function fmt1(n: number) {
  return n.toFixed(1).replace('.', ',');
}

/**
 * Constats calculés sur les 14 derniers jours (journal, checklist, cycle), par des règles simples :
 * un constat n'apparaît que si les données suffisent. Aucune interprétation médicale.
 */
export function computeJournalInsights({
  entries,
  stats,
  daysWithoutEntry,
  phaseOf,
}: {
  entries: JournalEntry[];
  stats: ObservanceItemStat[];
  daysWithoutEntry: string[];
  phaseOf?: (date: string) => CyclePhase | null;
}): Insight[] {
  const out: Insight[] = [];
  const byDate = new Map(entries.map((e) => [e.date.slice(0, 10), e]));
  const dates = [...byDate.keys()].sort();

  // 1. Sommeil → énergie du lendemain (au moins 3 nuits de qualité ≤ 4/10 et 2 points d'écart)
  const pairs = dates
    .map((d) => {
      const next = new Date(`${d}T12:00:00`);
      next.setDate(next.getDate() + 1);
      const n = byDate.get(next.toISOString().slice(0, 10));
      const e = byDate.get(d);
      return e?.sleep_quality != null && n?.energy_level != null ? { sleep: e.sleep_quality, energy: n.energy_level } : null;
    })
    .filter((x): x is { sleep: number; energy: number } => x !== null);
  const poor = pairs.filter((p) => p.sleep <= 4).map((p) => p.energy);
  const good = pairs.filter((p) => p.sleep > 4).map((p) => p.energy);
  if (poor.length >= 3 && good.length && avg(good) - avg(poor) >= 2) {
    out.push({
      text: `Après une nuit de mauvaise qualité, l’énergie du lendemain est plus basse : ${fmt1(avg(poor))} / 10 contre ${fmt1(avg(good))} / 10.`,
      how: 'Énergie moyenne le lendemain des nuits notées 4/10 ou moins, comparée aux autres jours (au moins 3 nuits).',
      tone: 'terracotta',
    });
  }

  // 2. Énergie selon la phase du cycle (si le cycle est suivi)
  if (phaseOf) {
    const withPhase = dates
      .map((d) => ({ phase: phaseOf(d), energy: byDate.get(d)?.energy_level }))
      .filter((x): x is { phase: CyclePhase; energy: number } => x.phase !== null && x.energy != null);
    const groups = new Map<CyclePhase, number[]>();
    withPhase.forEach((x) => groups.set(x.phase, [...(groups.get(x.phase) ?? []), x.energy]));
    let low: { phase: CyclePhase; v: number } | null = null;
    groups.forEach((v, phase) => {
      if (v.length >= 2 && (!low || avg(v) < low.v)) low = { phase, v: avg(v) };
    });
    const lowest = low as { phase: CyclePhase; v: number } | null;
    if (lowest) {
      const others = withPhase.filter((x) => x.phase !== lowest.phase).map((x) => x.energy);
      if (others.length >= 2 && avg(others) - lowest.v >= 2) {
        out.push({
          text: `L’énergie est plus basse ${PHASE_LABEL[lowest.phase]} : ${fmt1(lowest.v)} / 10 contre ${fmt1(avg(others))} / 10 le reste du cycle.`,
          how: 'Énergie moyenne par phase du cycle (onglet Cycle), affichée à partir de 2 jours par phase et 2 points d’écart.',
          tone: 'sky',
        });
      }
    }
  }

  // 3. Checklist : l'item le plus suivi et le moins suivi
  const rated = stats.filter((s) => !s.isNew && s.planned > 0).sort((a, b) => ratio(b) - ratio(a));
  if (rated.length) {
    const best = rated[0];
    out.push({
      text: `« ${best.item.label} » est l’item le plus suivi : ${best.done} jours sur ${best.planned}.`,
      how: 'Jours où l’item est coché, sur les jours où il était prévu.',
      tone: 'sage',
    });
  }
  if (rated.length > 1 && ratio(rated[rated.length - 1]) < 0.7) {
    const worst = rated[rated.length - 1];
    out.push({
      text: `« ${worst.item.label} » est le moins suivi : ${worst.done} jours sur ${worst.planned}.`,
      how: 'Item au taux le plus bas, affiché s’il est sous 70 %.',
      tone: 'rose',
    });
  }

  // 4. Jours sans saisie
  const fmtDay = (d: string) =>
    new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00`));
  out.push(
    daysWithoutEntry.length
      ? {
          text: `${daysWithoutEntry.length} ${daysWithoutEntry.length > 1 ? 'jours' : 'jour'} sans saisie${
            daysWithoutEntry.length <= 3 ? ` : ${daysWithoutEntry.map(fmtDay).join(', ')}` : ''
          }.`,
          how: 'Jours sans aucune note dans le journal.',
          tone: 'stone',
        }
      : { text: 'Journal rempli tous les jours.', how: 'Jours sans aucune note dans le journal.', tone: 'stone' }
  );
  return out;
}

const DOT: Record<Insight['tone'], string> = {
  sage: 'bg-sage',
  terracotta: 'bg-terracotta',
  rose: 'bg-rose',
  stone: 'bg-stone',
  sky: 'bg-sky',
};

export function JournalInsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold">Ce qui ressort</h3>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {insights.map((i) => (
          <div key={i.text} className="flex gap-2.5 text-sm leading-relaxed">
            <span aria-hidden="true" className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full', DOT[i.tone])} />
            <span className="flex flex-col gap-0.5">
              <span>{i.text}</span>
              <span className="text-[11px] leading-snug text-mist">{i.how}</span>
            </span>
          </div>
        ))}
        <p className="text-xs text-stone">
          Calculés automatiquement sur les {DAYS} derniers jours du journal et de la checklist, sans interprétation médicale.
          Un constat n&apos;apparaît que si les données suffisent.
        </p>
      </CardContent>
    </Card>
  );
}
