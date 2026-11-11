'use client';

import { useState } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatFrequency, isDailyFrequency, resolveTrackedItems, type TrackedItem } from '@/lib/observance-tracking';
import { CONSEILLANCIER_SECTIONS } from '@/lib/conseillancier';
import type { ObservanceCategory, ObservanceLog } from '@/lib/types';

export const SECTION_TINT: Record<string, { c: string; tint: string }> = {
  objectifs: { c: '#6DD4B8', tint: '#23383B' },
  alimentation: { c: '#D4A574', tint: '#373131' },
  phytotherapie: { c: '#B89FD9', tint: '#2E2738' },
  micronutrition: { c: '#B89FD9', tint: '#2E2738' },
  aromatologie: { c: '#B89FD9', tint: '#2E2738' },
  hydrologie: { c: '#7B93DB', tint: '#1F2640' },
  activite: { c: '#E8A87C', tint: '#373131' },
  equilibre_psycho: { c: '#7B93DB', tint: '#1F2640' },
  respiration: { c: '#7B93DB', tint: '#1F2640' },
  techniques_manuelles: { c: '#E8A87C', tint: '#373131' },
  sommeil: { c: '#6DD4B8', tint: '#23383B' },
  environnement: { c: '#8B95A5', tint: '#1C2230' },
  suivi: { c: '#8B95A5', tint: '#1C2230' },
};
export const DEFAULT_SECTION_TINT = { c: '#8B95A5', tint: '#1C2230' };

/** Rubrique du conseillancier → catégorie d'observance du journal (avis du consultant). */
const OBSERVANCE_OF: Record<string, ObservanceCategory> = {
  alimentation: 'alimentation',
  phytotherapie: 'phytotherapie',
  micronutrition: 'complement',
  aromatologie: 'aromatologie',
  hydrologie: 'hydrologie',
  activite: 'activite',
  equilibre_psycho: 'equilibre_psycho',
  respiration: 'respiration',
  techniques_manuelles: 'technique_manuelle',
  sommeil: 'sommeil',
};

export type PlanBlock = { id: string; section: string; cat: string; title: string; body: string; c: string; tint: string };

/** Les champs remplis du conseillancier, présentés comme des blocs. */
export function planBlocks(content: Record<string, string>): PlanBlock[] {
  const out: PlanBlock[] = [];
  for (const s of CONSEILLANCIER_SECTIONS) {
    if (['en_tete', 'cloture', 'notes_libres'].includes(s.id)) continue;
    for (const f of s.fields) {
      const body = (content[f.key] ?? '').trim();
      if (!body) continue;
      const t = SECTION_TINT[s.id] ?? DEFAULT_SECTION_TINT;
      out.push({ id: f.key, section: s.id, cat: s.title, title: f.label, body, ...t });
    }
  }
  return out;
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export function PlanBlocks({ content, firstName, logs }: { content: Record<string, string>; firstName: string; logs: ObservanceLog[] }) {
  const blocks = planBlocks(content);
  const notesBy = (section: string) => {
    const cat = OBSERVANCE_OF[section];
    if (!cat) return [];
    return logs
      .filter((l) => l.category === cat && (l.notes ?? '').trim())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2);
  };
  const seen = new Set<string>();

  if (!blocks.length) return <p className="text-sm text-stone">Ce conseillancier est vide.</p>;

  return (
    <div className="flex flex-col gap-3">
      {content.message_accueil?.trim() ? (
        <p className="whitespace-pre-line rounded-2xl border border-divider bg-surface p-4 text-sm leading-relaxed text-charcoal/85">{content.message_accueil.trim()}</p>
      ) : null}
      {blocks.map((b) => {
        // Avis affichés une seule fois par rubrique, sous son premier bloc.
        const notes = seen.has(b.section) ? [] : notesBy(b.section);
        seen.add(b.section);
        return (
          <article key={b.id} className="flex flex-col gap-2 rounded-2xl border border-divider bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: b.tint, color: b.c }}>
                {b.cat}
              </span>
            </div>
            <h4 className="text-[15px] font-semibold">{b.title}</h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#C9CFDA]">{b.body}</p>
            {notes.map((n) => (
              <div key={n.id} className="mt-1 flex items-start gap-2 rounded-xl bg-surface-raised px-3 py-2.5">
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-terracotta" aria-hidden="true" />
                <span className="text-[13px] leading-normal">
                  <span className="text-stone">
                    Avis de {firstName} · {dayFmt.format(new Date(n.date))} :{' '}
                  </span>
                  {n.notes}
                </span>
              </div>
            ))}
          </article>
        );
      })}
    </div>
  );
}

export function PhonePreview({
  content,
  firstName,
  tracked = [],
  showTitle = true,
}: {
  content: Record<string, string>;
  firstName: string;
  /** Conseils suivis : deuxième page « Ma checklist ». */
  tracked?: TrackedItem[];
  showTitle?: boolean;
}) {
  const [tab, setTab] = useState<'programme' | 'checklist'>('programme');
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const blocks = planBlocks(content).slice(0, 5);
  const items = resolveTrackedItems(content, tracked);
  const daily = items.filter((t) => isDailyFrequency(t.freq));
  const other = items.filter((t) => !isDailyFrequency(t.freq));
  const keyOf = (t: TrackedItem) => `${t.field_key}#${t.line_index}`;
  const doneCount = daily.filter((t) => ticks[keyOf(t)]).length;
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date());

  const renderItem = (t: TrackedItem) => {
    const on = Boolean(ticks[keyOf(t)]);
    return (
      <div key={keyOf(t)} className="flex items-center gap-2.5 rounded-xl bg-surface-raised/60 px-2.5 py-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={t.label || t.line}
          onClick={() => setTicks((prev) => ({ ...prev, [keyOf(t)]: !on }))}
          className={cn(
            'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2',
            on ? 'border-sage bg-sage text-ink' : 'border-mist'
          )}
        >
          {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </button>
        <span className="flex min-w-0 flex-col">
          <span className={cn('text-[13px] font-medium', on && 'text-stone line-through')}>{t.label || t.line}</span>
          <span className="text-[11px] text-stone">{formatFrequency(t.freq)}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {showTitle ? <h3 className="px-1 text-[15px] font-semibold">Ce que {firstName} verra dans l&apos;app</h3> : null}
      <div className="mx-auto w-full max-w-[300px] rounded-[34px] border border-divider bg-cream p-3 shadow-lg">
        <div className="flex min-h-[420px] flex-col gap-3 rounded-[26px] bg-surface p-4">
          <div role="tablist" aria-label="Pages de l'app" className="flex gap-1 rounded-[14px] bg-surface-raised p-1">
            {(
              [
                ['programme', 'Programme'],
                ['checklist', 'Ma checklist'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'h-[34px] flex-1 rounded-[10px] text-xs font-semibold',
                  tab === id ? 'bg-ink text-sage' : 'text-stone'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'programme' ? (
            <>
              <span className="text-[11px] font-semibold text-sage">Votre programme</span>
              <span className="font-serif text-lg leading-tight">Votre programme, {firstName}</span>
              {blocks.length ? (
                blocks.map((b) => (
                  <div key={b.id} className="flex items-start gap-2.5 rounded-xl p-2.5" style={{ background: b.tint }}>
                    <span className="mt-1 h-2 w-2 flex-none rounded-full" style={{ background: b.c }} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-medium">{b.title}</span>
                      <span className="line-clamp-2 text-[11px] text-stone">{b.body}</span>
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-stone">Les conseils apparaîtront ici.</span>
              )}
            </>
          ) : (
            <>
              <span className="text-[11px] font-semibold text-sage first-letter:uppercase">Aujourd&apos;hui · {today}</span>
              <span className="font-serif text-lg leading-tight">Ma checklist</span>
              <div className="flex flex-col gap-1.5 rounded-xl bg-surface-raised px-3 py-2.5">
                <span className="text-xs text-charcoal/80">
                  <span className="font-semibold text-charcoal">
                    {doneCount} sur {daily.length}
                  </span>{' '}
                  faits aujourd&apos;hui
                </span>
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-ink">
                  <div
                    className="h-full rounded-full bg-sage"
                    style={{ width: `${daily.length ? Math.round((doneCount / daily.length) * 100) : 0}%` }}
                  />
                </div>
              </div>
              {daily.length ? (
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone">Chaque jour</span>
              ) : null}
              {daily.map(renderItem)}
              {other.length ? (
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone">À votre rythme</span>
              ) : null}
              {other.map(renderItem)}
              {!items.length ? (
                <span className="text-xs leading-relaxed text-stone">
                  Aucun conseil suivi pour l&apos;instant. Cochez « Suivre » à côté d&apos;un conseil pour l&apos;ajouter ici.
                </span>
              ) : null}
              <span className="text-[11px] leading-snug text-mist">
                Vos coches sont visibles par votre praticien dans votre journal.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Aperçu téléphone en modale (bouton « Voir dans l'app » du conseillancier). */
export function PhonePreviewModal({
  isOpen,
  onClose,
  content,
  firstName,
  version,
  tracked,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: Record<string, string>;
  firstName: string;
  version: number;
  tracked?: TrackedItem[];
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={`Ce que ${firstName} voit dans l'app`}
      description={`Conseillancier v${version} · seules les rubriques remplies apparaissent.`}
    >
      <PhonePreview content={content} firstName={firstName} tracked={tracked} showTitle={false} />
    </Modal>
  );
}
