'use client';

import { useState } from 'react';
import type { CycleProfile, CycleRegularity } from '../../lib/types';
import { CYCLE_REGULARITY_LABELS } from '../../lib/cycle-constants';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

export function CycleProfileEditor({
  profile,
  onSave,
  onCancel,
}: {
  profile: CycleProfile;
  onSave: (data: Partial<CycleProfile>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    average_cycle_length: profile.average_cycle_length,
    average_period_length: profile.average_period_length,
    cycle_regularity: profile.cycle_regularity,
    contraception: profile.contraception ?? '',
    notes: profile.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        average_cycle_length: form.average_cycle_length,
        average_period_length: form.average_period_length,
        cycle_regularity: form.cycle_regularity,
        contraception: form.contraception || null,
        notes: form.notes || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border-2 border-teal-600/20 bg-teal-50/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-stone">
            Durée moyenne du cycle (jours)
          </label>
          <Input
            type="number"
            min={21}
            max={45}
            step={1}
            className="mt-1"
            value={form.average_cycle_length}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                average_cycle_length: Math.min(45, Math.max(21, parseInt(e.target.value) || 28)),
              }))
            }
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-stone">
            Durée moyenne des règles (jours)
          </label>
          <Input
            type="number"
            min={2}
            max={8}
            step={1}
            className="mt-1"
            value={form.average_period_length}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                average_period_length: Math.min(8, Math.max(2, parseInt(e.target.value) || 5)),
              }))
            }
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-stone">Régularité</label>
          <Select
            className="mt-1"
            value={form.cycle_regularity}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                cycle_regularity: e.target.value as CycleRegularity,
              }))
            }
          >
            {(Object.entries(CYCLE_REGULARITY_LABELS) as [CycleRegularity, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              )
            )}
          </Select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-stone">Contraception</label>
          <Input
            className="mt-1"
            value={form.contraception}
            onChange={(e) => setForm((prev) => ({ ...prev, contraception: e.target.value }))}
            placeholder="Ex : pilule, stérilet cuivre..."
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-stone">Notes praticien</label>
        <Textarea
          className="mt-1"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Ex : SOPK diagnostiqué, endométriose stade 2..."
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Enregistrer
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
