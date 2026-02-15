'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { INDICATOR_CATEGORIES } from '@/lib/journal-constants';
import type { JournalIndicator, IndicatorCategory, IndicatorValueType } from '@/lib/types';

type IndicatorFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicator: { label: string; category: IndicatorCategory; value_type: IndicatorValueType; unit?: string; target_value?: string }) => void;
  editingIndicator?: JournalIndicator | null;
  saving?: boolean;
};

const VALUE_TYPE_OPTIONS: { value: IndicatorValueType; label: string }[] = [
  { value: 'boolean', label: 'Oui / Non' },
  { value: 'number', label: 'Nombre' },
  { value: 'scale_1_5', label: 'Échelle 1-5' },
  { value: 'text', label: 'Texte' },
];

export function IndicatorForm({ isOpen, onClose, onSave, editingIndicator, saving }: IndicatorFormProps) {
  const [label, setLabel] = useState(editingIndicator?.label ?? '');
  const [category, setCategory] = useState<IndicatorCategory>(editingIndicator?.category ?? 'custom');
  const [valueType, setValueType] = useState<IndicatorValueType>(editingIndicator?.value_type ?? 'boolean');
  const [unit, setUnit] = useState(editingIndicator?.unit ?? '');
  const [targetValue, setTargetValue] = useState(editingIndicator?.target_value ?? '');

  function handleSave() {
    if (!label.trim()) return;
    onSave({
      label: label.trim(),
      category,
      value_type: valueType,
      unit: unit.trim() || undefined,
      target_value: targetValue.trim() || undefined,
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingIndicator ? 'Modifier l\'indicateur' : 'Nouvel indicateur'}
      description="Définissez un indicateur personnalisé pour le suivi du consultant."
      size="md"
    >
      <div className="space-y-4 p-4">
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">Nom de l&apos;indicateur *</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Prise de magnésium"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">Catégorie</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as IndicatorCategory)}>
            {INDICATOR_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">Type de valeur</label>
          <Select value={valueType} onChange={(e) => setValueType(e.target.value as IndicatorValueType)}>
            {VALUE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        {valueType === 'number' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Unité</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ex: mg, ml, min"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Objectif</label>
              <Input
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Ex: 300"
              />
            </div>
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!label.trim() || saving} loading={saving}>
          {editingIndicator ? 'Mettre à jour' : 'Créer'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
