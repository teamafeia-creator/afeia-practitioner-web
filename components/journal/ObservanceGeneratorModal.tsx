'use client';

import { useState, useMemo } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Trash2 } from 'lucide-react';
import { parseConseillancierToObservanceItems } from '@/lib/observance-parser';
import { OBSERVANCE_CATEGORIES } from '@/lib/journal-constants';
import type { ConsultantPlan, ObservanceItem, ObservanceCategory, ObservanceFrequency } from '@/lib/types';

type CandidateItem = {
  label: string;
  category: ObservanceCategory;
  frequency: ObservanceFrequency;
  weekly_target: number | null;
  checked: boolean;
};

type ObservanceGeneratorModalProps = {
  plan: ConsultantPlan;
  consultantId: string;
  practitionerId: string;
  existingItems: ObservanceItem[];
  onGenerate: (items: Array<Omit<ObservanceItem, 'id' | 'created_at'>>) => void;
  onClose: () => void;
  saving?: boolean;
};

export function ObservanceGeneratorModal({
  plan,
  consultantId,
  practitionerId,
  existingItems,
  onGenerate,
  onClose,
  saving,
}: ObservanceGeneratorModalProps) {
  const parsedItems = useMemo(() => {
    return parseConseillancierToObservanceItems(
      (plan.content ?? {}) as Record<string, string | null>,
      plan.id,
      consultantId,
      practitionerId
    );
  }, [plan, consultantId, practitionerId]);

  const [candidates, setCandidates] = useState<CandidateItem[]>(
    parsedItems.map((item) => ({
      label: item.label,
      category: item.category,
      frequency: item.frequency,
      weekly_target: item.weekly_target ?? null,
      checked: true,
    }))
  );

  const [deleteExisting, setDeleteExisting] = useState(false);

  // Manual add form
  const [manualLabel, setManualLabel] = useState('');
  const [manualCategory, setManualCategory] = useState<ObservanceCategory>('autre');
  const [manualFrequency, setManualFrequency] = useState<ObservanceFrequency>('daily');

  function toggleCandidate(index: number) {
    setCandidates((prev) => prev.map((c, i) => i === index ? { ...c, checked: !c.checked } : c));
  }

  function updateCandidate(index: number, field: string, value: string | number | null) {
    setCandidates((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }

  function addManual() {
    if (!manualLabel.trim()) return;
    setCandidates((prev) => [
      ...prev,
      {
        label: manualLabel.trim(),
        category: manualCategory,
        frequency: manualFrequency,
        weekly_target: manualFrequency === 'weekly' ? 3 : null,
        checked: true,
      },
    ]);
    setManualLabel('');
  }

  function handleGenerate() {
    const selected = candidates
      .filter((c) => c.checked)
      .map((c, i) => ({
        consultant_plan_id: plan.id,
        practitioner_id: practitionerId,
        consultant_id: consultantId,
        label: c.label,
        category: c.category,
        frequency: c.frequency,
        weekly_target: c.weekly_target,
        sort_order: i,
        is_active: true,
      }));
    onGenerate(selected);
  }

  // Group candidates by category
  const grouped = useMemo(() => {
    const map = new Map<ObservanceCategory, Array<CandidateItem & { index: number }>>();
    candidates.forEach((c, i) => {
      const list = map.get(c.category) ?? [];
      list.push({ ...c, index: i });
      map.set(c.category, list);
    });
    return map;
  }, [candidates]);

  const checkedCount = candidates.filter((c) => c.checked).length;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Générer la checklist d'observance"
      description="Les items sont extraits du conseillancier. Validez et ajustez avant de générer."
      size="lg"
    >
      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
        {/* Warning for existing items */}
        {existingItems.length > 0 && (
          <div className="rounded-lg border border-terracotta/30 bg-terracotta/5 p-3">
            <p className="text-xs text-charcoal font-medium">
              {existingItems.length} item{existingItems.length > 1 ? 's' : ''} d&apos;observance existe{existingItems.length > 1 ? 'nt' : ''} déjà.
            </p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteExisting}
                onChange={(e) => setDeleteExisting(e.target.checked)}
                className="rounded border-divider"
              />
              <span className="text-xs text-stone">Supprimer les anciens items avant de générer</span>
            </label>
          </div>
        )}

        {/* Grouped items */}
        {([...grouped.entries()] as [ObservanceCategory, Array<CandidateItem & { index: number }>][]).map(([category, items]) => {
          const catLabel = OBSERVANCE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
          return (
            <div key={category}>
              <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-2">
                {catLabel}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item.index} className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 border border-divider">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleCandidate(item.index)}
                      className="rounded border-divider"
                    />
                    <input
                      type="text"
                      className="flex-1 text-xs border-none bg-transparent text-charcoal focus:ring-0 p-0"
                      value={item.label}
                      onChange={(e) => updateCandidate(item.index, 'label', e.target.value)}
                    />
                    <Select
                      className="text-xs w-24 !py-1"
                      value={item.frequency}
                      onChange={(e) => updateCandidate(item.index, 'frequency', e.target.value)}
                    >
                      <option value="daily">Quotidien</option>
                      <option value="weekly">Hebdo</option>
                      <option value="as_needed">Si besoin</option>
                    </Select>
                    {item.frequency === 'weekly' && (
                      <input
                        type="number"
                        min={1}
                        max={7}
                        className="w-12 text-xs border border-divider rounded px-1 py-0.5 bg-white text-charcoal text-center"
                        value={item.weekly_target ?? 3}
                        onChange={(e) => updateCandidate(item.index, 'weekly_target', parseInt(e.target.value) || null)}
                        title="Objectif hebdomadaire"
                      />
                    )}
                    <button
                      onClick={() => removeCandidate(item.index)}
                      className="p-1 text-stone hover:text-rose transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {candidates.length === 0 && (
          <div className="text-center py-6 text-stone text-sm">
            Aucun item détecté dans le conseillancier. Ajoutez des items manuellement.
          </div>
        )}

        {/* Manual add */}
        <div className="rounded-lg border border-dashed border-sage/30 p-3">
          <p className="text-xs font-medium text-charcoal mb-2">Ajouter un item manuellement</p>
          <div className="flex gap-2 items-end">
            <Input
              className="flex-1 text-xs"
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              placeholder="Nom de l'item..."
              onKeyDown={(e) => e.key === 'Enter' && addManual()}
            />
            <Select
              className="text-xs w-32"
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value as ObservanceCategory)}
            >
              {OBSERVANCE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </Select>
            <Select
              className="text-xs w-24"
              value={manualFrequency}
              onChange={(e) => setManualFrequency(e.target.value as ObservanceFrequency)}
            >
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdo</option>
              <option value="as_needed">Si besoin</option>
            </Select>
            <Button variant="secondary" size="sm" onClick={addManual} disabled={!manualLabel.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleGenerate} disabled={checkedCount === 0 || saving} loading={saving}>
          Générer ({checkedCount} item{checkedCount > 1 ? 's' : ''})
        </Button>
      </ModalFooter>
    </Modal>
  );
}
