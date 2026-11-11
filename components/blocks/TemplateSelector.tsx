'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { cn } from '../../lib/cn';
import { supabase } from '../../lib/supabase';
import { Badge } from '../ui/Badge';
import { MOTIF_LABELS, type ConsultationMotif } from '../../lib/blocks-types';
import type { Template } from '../../lib/blocks-types';

interface TemplateSelectorProps {
  onApplyTemplate: (sections: Record<string, string>) => void;
  /** Texte de confirmation (le titre du modèle est ajouté en tête). */
  confirmMessage?: string;
}

const DEFAULT_CONFIRM =
  'Cela pré-remplira les sections du conseillancier avec le contenu du modèle. Les champs déjà remplis seront remplacés.';

/**
 * « Partir d'un modèle » : liste dépliable affichée dans la modale de choix
 * des catégories du conseillancier.
 */
export function TemplateSelector({ onApplyTemplate, confirmMessage = DEFAULT_CONFIRM }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } catch (err) {
      console.error('Erreur chargement modèles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && templates.length === 0) {
      fetchTemplates();
    }
  }, [open, templates.length, fetchTemplates]);

  const handleSelectTemplate = async (template: Template) => {
    const confirmed = window.confirm(
      `Appliquer le modèle "${template.title}" ?\n\n${confirmMessage}`
    );
    if (!confirmed) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/templates/${template.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const resolvedBlocks = data.resolvedBlocks as Record<string, { content: string }>;
      const sections: Record<string, string> = {};

      for (const [key, block] of Object.entries(resolvedBlocks)) {
        if (block?.content) {
          sections[key] = block.content;
        }
      }

      onApplyTemplate(sections);
      setOpen(false);
    } catch (err) {
      console.error('Erreur application modèle:', err);
    }
  };

  return (
    <div className="rounded-xl border border-divider">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm font-medium text-sage"
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          Partir d&apos;un modèle{' '}
          <span className="font-normal text-stone">(facultatif : coche et pré-remplit ses catégories)</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-stone transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="max-h-64 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sage border-t-transparent" />
            </div>
          ) : templates.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone">Aucun modèle disponible.</p>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelectTemplate(template)}
                className="w-full rounded-lg p-3 text-left transition-colors hover:bg-surface-raised"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal">{template.title}</p>
                    {template.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone">{template.description}</p>
                    )}
                  </div>
                  <Badge variant="info" className="shrink-0 text-[9px]">
                    {MOTIF_LABELS[template.primary_motif as ConsultationMotif] ?? template.primary_motif}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
