'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSnoozeConsultant } from '@/hooks/useConsultantActions';
import { showToast } from '@/components/ui/Toaster';

interface SnoozeModalProps {
  consultantName: string;
  consultantId: string;
  onClose: () => void;
  onSnoozed: () => void;
}

type SnoozePreset = {
  label: string;
  value: string;
  days: number | null;
};

const PRESETS: SnoozePreset[] = [
  { label: 'En pause temporaire (vacances, deplacement)', value: 'vacation', days: 14 },
  { label: 'Suivi espace (rythme mensuel)', value: 'spaced_followup', days: 30 },
  { label: 'Autre duree', value: 'other', days: null },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function SnoozeModal({ consultantName, consultantId, onClose, onSnoozed }: SnoozeModalProps) {
  const [reason, setReason] = useState('vacation');
  const [customDate, setCustomDate] = useState(
    addDays(new Date(), 7).toISOString().split('T')[0]
  );
  const snoozeMutation = useSnoozeConsultant();

  const handleSubmit = async () => {
    const preset = PRESETS.find(p => p.value === reason);
    const until = reason === 'other'
      ? new Date(customDate).toISOString()
      : addDays(new Date(), preset?.days ?? 7).toISOString();

    try {
      await snoozeMutation.mutateAsync({ consultantId, reason, until });
      showToast.success(`${consultantName} mis en pause`);
      onSnoozed();
    } catch {
      showToast.error('Erreur lors de la mise en pause');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Mettre en pause : ${consultantName}`}
      size="md"
    >
      <div>
        <div className="space-y-3 mb-6">
          {PRESETS.map(preset => (
            <label
              key={preset.value}
              className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
            >
              <input
                type="radio"
                name="snooze_reason"
                value={preset.value}
                checked={reason === preset.value}
                onChange={(e) => setReason(e.target.value)}
                className="mt-0.5 accent-teal"
              />
              <span className="text-sm text-charcoal">{preset.label}</span>
            </label>
          ))}
        </div>

        {reason === 'other' && (
          <div className="mb-6">
            <label className="block text-sm text-stone mb-2">Jusqu&apos;au :</label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={snoozeMutation.isPending}
          >
            {snoozeMutation.isPending ? 'En cours...' : 'Confirmer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
