'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Textarea } from '../../ui/Textarea';
import { cn } from '../../../lib/cn';
import { SectionSuggestButton } from '../../ai/SectionSuggestButton';
import { BlockInsertButton } from '../../blocks/BlockInsertButton';
import { SaveAsBlockButton } from '../../blocks/SaveAsBlockButton';
import { ResourceInsertButton } from '../../resources/ResourceInsertButton';
import { PhonePreview, SECTION_TINT, DEFAULT_SECTION_TINT } from '../record/PlanBlocks';
import {
  sectionHasContent,
  type ConseillancierContent,
  type ConseillancierKey,
  type ConseillancierSection,
} from '../../../lib/conseillancier';
import type { BlockSection } from '../../../lib/blocks-types';

type FieldUpdate = string | ((previous: string) => string);

interface ConseillancierFocusEditorProps {
  consultantId: string;
  planId: string;
  version: number;
  consultantFullName: string;
  firstName: string;
  consultationMotif?: string | null;
  /** Catégories choisies, dans l'ordre du document. */
  sections: ConseillancierSection[];
  index: number;
  onIndexChange: (index: number) => void;
  content: ConseillancierContent;
  onFieldChange: (key: ConseillancierKey, update: FieldUpdate) => void;
  /** Rappel discret des traitements en cours (catégorie Phytothérapie). */
  treatmentsReminder?: string | null;
  /** Bandeaux existants : IA, alerte médicale, contre-indications. */
  alerts?: ReactNode;
  /** Modales rendues au-dessus du plein écran. */
  overlays?: ReactNode;
  /** Toast, placé sous la barre du haut. */
  toast?: ReactNode;
  onBack: () => void;
  onOpenPicker: () => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
  onShare: () => void;
  sharing: boolean;
  shareDisabled: boolean;
  shareTitle?: string;
  onReviewEnd?: () => void;
}

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return n > 1 ? pluralForm : singular;
}

/**
 * Éditeur plein écran du conseillancier : une page par catégorie choisie,
 * rubriques repliées, aperçu téléphone facultatif.
 */
export function ConseillancierFocusEditor({
  consultantId,
  planId,
  version,
  consultantFullName,
  firstName,
  consultationMotif,
  sections,
  index,
  onIndexChange,
  content,
  onFieldChange,
  treatmentsReminder,
  alerts,
  overlays,
  toast,
  onBack,
  onOpenPicker,
  onSave,
  saving,
  saveDisabled,
  onShare,
  sharing,
  shareDisabled,
  shareTitle,
  onReviewEnd,
}: ConseillancierFocusEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openFields, setOpenFields] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);

  const total = sections.length;
  const current = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
  const section = sections[current] ?? null;
  const doneCount = sections.filter((s) => sectionHasContent(s, content)).length;
  const doneLabel = `${doneCount} sur ${total} ${plural(total, 'catégorie')} ${plural(doneCount, 'remplie')}`;

  // Page plein écran : la page du dossier ne défile plus derrière
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  // Nouvelle catégorie : rubriques repliées et retour en haut de page
  useEffect(() => {
    setOpenFields({});
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current, section?.id]);

  function goTo(n: number) {
    if (n < 0 || n >= total) return;
    onIndexChange(n);
  }

  const tint = section ? SECTION_TINT[section.id] ?? DEFAULT_SECTION_TINT : DEFAULT_SECTION_TINT;
  const isFirst = current === 0;
  const isLast = current >= total - 1;

  return (
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Conseillancier v${version} de ${consultantFullName}`}
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-cream text-charcoal"
    >
      <header className="z-10 flex flex-wrap md:sticky md:top-0 items-center gap-x-4 gap-y-2.5 border-b border-divider bg-surface px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg pl-1 pr-2.5 text-[13px] text-charcoal/80 transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au dossier
        </button>
        <span aria-hidden="true" className="hidden h-6 w-px bg-divider sm:block" />
        <div className="flex min-w-0 flex-[1_1_280px] flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h1 className="font-serif text-xl font-medium">
            Conseillancier v{version} · {consultantFullName}
          </h1>
          <span className="rounded-full border border-divider bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-stone">
            Brouillon
          </span>
          <span className="text-xs text-stone">{doneLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={onOpenPicker}>
            Catégories ({total})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn('h-9', showPreview && 'border-sage/40 text-sage')}
            aria-pressed={showPreview}
            onClick={() => setShowPreview((v) => !v)}
          >
            Aperçu
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={onSave} loading={saving} disabled={saveDisabled}>
            Enregistrer
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="h-9 font-semibold"
            onClick={onShare}
            loading={sharing}
            disabled={shareDisabled}
            title={shareTitle}
          >
            Partager à {firstName}
          </Button>
        </div>
      </header>

      <main className="flex flex-wrap items-start justify-center gap-6 px-4 pb-12 pt-6 md:px-6">
        <div className="flex min-w-0 max-w-[760px] flex-[1_1_480px] flex-col gap-4">
          {alerts}

          {total > 0 ? (
            <nav aria-label="Catégories choisies" className="flex flex-wrap gap-1.5">
              {sections.map((s, n) => {
                const on = n === current;
                const done = sectionHasContent(s, content);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(n)}
                    aria-current={on ? 'step' : undefined}
                    className={cn(
                      'inline-flex h-[34px] items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors',
                      on ? 'border-sage bg-sage-light text-charcoal' : 'border-divider text-charcoal/75 hover:border-sage/40'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-bold text-ink',
                        done ? 'bg-sage' : 'bg-mist'
                      )}
                    >
                      {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n + 1}
                    </span>
                    {s.title}
                    {done ? <span className="sr-only"> (remplie)</span> : null}
                  </button>
                );
              })}
            </nav>
          ) : null}

          {section ? (
            <section aria-live="polite" className="flex flex-col gap-3.5 rounded-2xl border border-divider bg-surface p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold"
                  style={{ background: tint.tint, color: tint.c }}
                >
                  {current + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-xs text-stone">
                    Catégorie {current + 1} sur {total}
                  </span>
                  <h2 className="font-serif text-2xl font-medium">{section.title}</h2>
                  {section.description ? <p className="text-sm text-stone">{section.description}</p> : null}
                  {section.id === 'phytotherapie' && treatmentsReminder ? (
                    <p className="mt-0.5 text-xs text-mist">{treatmentsReminder}</p>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-stone">
                Rien n&apos;est obligatoire : remplissez seulement les rubriques utiles, les autres n&apos;apparaîtront
                pas chez {firstName}.
              </p>

              <div className="flex flex-col gap-2">
                {section.fields.map((field) => {
                  const value = content[field.key] ?? '';
                  const filled = Boolean(value.trim());
                  const open = Boolean(openFields[field.key]);
                  const panelId = `conseil-field-${field.key}`;
                  return (
                    <div
                      key={field.key}
                      className={cn(
                        'overflow-hidden rounded-xl border bg-surface-raised',
                        open ? 'border-sage/30' : 'border-transparent'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFields((prev) => ({ ...prev, [field.key]: !open }))}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="flex min-h-[52px] w-full items-center gap-2.5 px-3.5 py-2 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className={cn('h-2 w-2 shrink-0 rounded-full', filled ? 'bg-sage' : 'bg-mist')}
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm font-semibold">{field.label}</span>
                          <span className="truncate text-xs text-stone">
                            {filled ? value.trim().split('\n')[0] : 'Facultatif · vide'}
                          </span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className={cn('h-4 w-4 shrink-0 text-stone transition-transform', open && 'rotate-180')}
                        />
                      </button>
                      {open ? (
                        <div id={panelId} className="flex flex-col gap-2 px-3.5 pb-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <SectionSuggestButton
                              consultantId={consultantId}
                              fieldKey={field.key}
                              onAccept={(text) => onFieldChange(field.key, text)}
                            />
                            <BlockInsertButton
                              section={section.id as BlockSection}
                              sectionLabel={`${section.title} — ${field.label}`}
                              consultationMotif={consultationMotif}
                              onInsert={(inserted) =>
                                onFieldChange(field.key, (prev) => (prev ? `${prev}\n\n${inserted}` : inserted))
                              }
                            />
                            <ResourceInsertButton
                              consultantId={consultantId}
                              consultantPlanId={planId}
                              sectionKey={field.key}
                              label="Joindre une fiche"
                              onInsert={(text) => onFieldChange(field.key, (prev) => (prev ? `${prev}\n${text}` : text))}
                            />
                          </div>
                          <Textarea
                            aria-label={field.label}
                            value={value}
                            onChange={(event) => onFieldChange(field.key, event.target.value)}
                            placeholder={field.placeholder}
                            rows={field.multiline ? 4 : 2}
                          />
                          <div>
                            <SaveAsBlockButton selectedText={value} section={section.id as BlockSection} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                <Button
                  variant="outline"
                  onClick={() => goTo(current - 1)}
                  disabled={isFirst}
                  icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                >
                  {isFirst ? 'Précédente' : sections[current - 1].title}
                </Button>
                <span className="flex-1" />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!isLast) {
                      goTo(current + 1);
                      return;
                    }
                    setShowPreview(true);
                    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    onReviewEnd?.();
                  }}
                  icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  iconPosition="right"
                >
                  {isLast ? 'Relire et partager' : sections[current + 1].title}
                </Button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-divider bg-surface p-6 text-sm text-stone">
              Aucune catégorie choisie.{' '}
              <button type="button" onClick={onOpenPicker} className="font-medium text-sage hover:underline">
                Choisir les catégories
              </button>
            </section>
          )}
        </div>

        {showPreview ? (
          <aside aria-label={`Aperçu côté ${firstName}`} className="w-full max-w-[300px] shrink-0 md:sticky md:top-24">
            <PhonePreview content={content} firstName={firstName} />
          </aside>
        ) : null}
      </main>

      {overlays}
      <div className="[&>div]:!top-[72px]">{toast}</div>
    </div>
  );
}
