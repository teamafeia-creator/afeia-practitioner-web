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
}

export function TemplateSelector({ onApplyTemplate }: TemplateSelectorProps) {
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
      `Appliquer le modèle "${template.title}" ?\n\nCela pré-remplira les sections du conseillancier avec le contenu du modèle. Les champs déjà remplis seront remplacés.`
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

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-template-selector]')) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  return (
    <div className="relative" data-template-selector>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-teal/20 bg-white px-3 py-2 text-sm font-medium text-teal transition-colors hover:border-teal/40 hover:bg-teal/5"
      >
        <FileText className="h-4 w-4" />
        Partir d&apos;un modèle de conseillancier
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-96 rounded-xl border border-teal/15 bg-white shadow-lg">
          <div className="p-3 border-b border-neutral-100">
            <p className="text-xs font-medium text-charcoal">Modèles disponibles</p>
            <p className="text-[10px] text-warmgray">
              Sélectionnez un modèle pour pré-remplir le conseillancier.
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
              </div>
            ) : templates.length === 0 ? (
              <p className="py-6 text-center text-xs text-warmgray">
                Aucun modèle disponible.
              </p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full rounded-lg p-3 text-left transition-colors hover:bg-sable-light"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">
                        {template.title}
                      </p>
                      {template.description && (
                        <p className="mt-0.5 text-xs text-warmgray line-clamp-2">
                          {template.description}
                        </p>
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
        </div>
      )}
    </div>
  );
}
