'use client';

import { useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Plus } from 'lucide-react';
import { TEMPLATE_CONFIG, type TemplateType } from './types';

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateType: TemplateType) => void;
}

export function TemplatePicker({ isOpen, onClose, onSelect }: TemplatePickerProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, { type: TemplateType; label: string; description: string; file: string | null }[]> = {};
    for (const [type, config] of Object.entries(TEMPLATE_CONFIG)) {
      if (!groups[config.category]) groups[config.category] = [];
      groups[config.category].push({
        type: type as TemplateType,
        label: config.label,
        description: config.description,
        file: config.file,
      });
    }
    return groups;
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choisir un modèle de schéma"
      size="lg"
    >
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, templates]) => (
          <div key={category}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone">
              {category}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.type}
                  type="button"
                  className="group flex flex-col items-center rounded-xl border border-divider bg-white p-3 text-center transition hover:ring-2 hover:ring-sage/50 cursor-pointer"
                  onClick={() => {
                    onSelect(template.type);
                    onClose();
                  }}
                >
                  <div className="flex h-32 w-full items-center justify-center rounded-lg bg-cream/60">
                    {template.file ? (
                      <img
                        src={template.file}
                        alt={template.label}
                        className="h-28 w-auto object-contain"
                      />
                    ) : (
                      <Plus className="h-10 w-10 text-stone/40" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-charcoal">{template.label}</p>
                  <p className="mt-0.5 text-xs text-stone">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
