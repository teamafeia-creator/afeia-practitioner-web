'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { TemplateSelector } from '../../blocks/TemplateSelector';
import { cn } from '../../../lib/cn';
import {
  CONSEILLANCIER_SECTIONS,
  normalizeSelectedSections,
  sectionHasContent,
  type ConseillancierContent,
} from '../../../lib/conseillancier';

export type CategoryPickerMode = 'create' | 'edit';

interface CategoryPickerModalProps {
  isOpen: boolean;
  /** create : la version est créée à la validation ; edit : la sélection du brouillon est modifiée. */
  mode: CategoryPickerMode;
  /** Libellé du bouton de validation (« Commencer » ou « Mettre à jour »). */
  ctaLabel: string;
  /** Catégories cochées à l'ouverture. */
  initialSelection: string[];
  /** Contenu actuel du brouillon (mode edit) : sert à prévenir avant d'effacer une catégorie remplie. */
  content?: ConseillancierContent;
  /** Version reprise à la création (Dupliquer / nouvelle version). */
  baseVersion?: number | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (selected: string[]) => void;
  onApplyTemplate: (sections: Record<string, string>) => void;
}

const TEMPLATE_CONFIRM =
  'Les catégories du modèle seront sélectionnées et pré-remplies. Les champs déjà remplis seront remplacés.';

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

/** Modale « Que voulez-vous remplir ? » : choix des grandes catégories du conseillancier. */
export function CategoryPickerModal({
  isOpen,
  mode,
  ctaLabel,
  initialSelection,
  content,
  baseVersion,
  loading = false,
  onClose,
  onConfirm,
  onApplyTemplate,
}: CategoryPickerModalProps) {
  const [draft, setDraft] = useState<string[]>(initialSelection);
  const [pendingRemoval, setPendingRemoval] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(normalizeSelectedSections(initialSelection));
    setPendingRemoval(null);
    setError(null);
    // La sélection n'est réinitialisée qu'à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const draftSet = useMemo(() => new Set(draft), [draft]);

  function toggle(id: string) {
    setError(null);
    setPendingRemoval(null);
    setDraft((prev) => normalizeSelectedSections(prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleConfirm() {
    if (draft.length === 0) {
      setError('Choisissez au moins une catégorie pour commencer.');
      return;
    }
    if (mode === 'edit' && content && !pendingRemoval) {
      const removedWithContent = CONSEILLANCIER_SECTIONS.filter(
        (s) => initialSelection.includes(s.id) && !draftSet.has(s.id) && sectionHasContent(s, content)
      ).map((s) => s.id);
      if (removedWithContent.length > 0) {
        setPendingRemoval(removedWithContent);
        return;
      }
    }
    onConfirm(draft);
  }

  const removedTitles = (pendingRemoval ?? [])
    .map((id) => CONSEILLANCIER_SECTIONS.find((s) => s.id === id)?.title)
    .filter(Boolean)
    .map((t) => `« ${t} »`)
    .join(', ');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Que voulez-vous remplir ?" size="full" className="max-w-[720px]">
      <div className="flex max-h-[calc(100vh-180px)] flex-col gap-4">
        <p className="text-sm leading-relaxed text-stone">
          Choisissez les grandes catégories de ce conseillancier. Vous les remplirez une par une, et vous pourrez en
          ajouter ou en retirer à tout moment.
        </p>

        <div className="shrink-0">
          <TemplateSelector onApplyTemplate={onApplyTemplate} confirmMessage={TEMPLATE_CONFIRM} />
        </div>

        <div className="-mx-1 min-h-0 overflow-y-auto px-1">
          <div className="grid gap-2 sm:grid-cols-2">
            {CONSEILLANCIER_SECTIONS.map((section) => {
              const on = draftSet.has(section.id);
              return (
                <button
                  key={section.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(section.id)}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    on ? 'border-sage/40 bg-sage-light/60' : 'border-divider hover:border-sage/30'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2',
                      on ? 'border-sage bg-sage text-ink' : 'border-mist'
                    )}
                  >
                    {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-charcoal">{section.title}</span>
                    {section.description ? <span className="text-xs text-stone">{section.description}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {mode === 'create' && baseVersion ? (
          <p className="text-xs text-stone">
            Le contenu de la v{baseVersion} est repris pour les catégories cochées ; les catégories décochées ne sont
            pas reprises.
          </p>
        ) : null}

        {pendingRemoval ? (
          <div role="alert" className="rounded-xl border border-terracotta/40 bg-terracotta-light px-3.5 py-3 text-sm text-charcoal">
            <p>
              {pendingRemoval.length > 1 ? 'Les catégories ' : 'La catégorie '}
              {removedTitles} {pendingRemoval.length > 1 ? 'contiennent' : 'contient'} du texte. En{' '}
              {pendingRemoval.length > 1 ? 'les' : 'la'} retirant, ce texte sera effacé du brouillon.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft((prev) => normalizeSelectedSections([...prev, ...pendingRemoval]));
                  setPendingRemoval(null);
                }}
              >
                Garder {pendingRemoval.length > 1 ? 'ces catégories' : 'cette catégorie'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onConfirm(draft)}>
                Retirer et effacer
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-rose">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1 text-[13px] text-stone">
            {plural(draft.length, 'catégorie')} {draft.length > 1 ? 'choisies' : 'choisie'}
          </span>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={loading} disabled={loading || Boolean(pendingRemoval)}>
            {ctaLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
