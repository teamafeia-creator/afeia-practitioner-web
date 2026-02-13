'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import type { ContraindicationAlert } from '@/lib/types/contraindications';

interface ContraindicationValidationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  alerts: ContraindicationAlert[];
  loading?: boolean;
}

export function ContraindicationValidationModal({
  open,
  onClose,
  onConfirm,
  alerts,
  loading,
}: ContraindicationValidationModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!open) return null;

  const unacknowledgedCritical = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal">
              Alertes de contre-indications non resolues
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-stone" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {unacknowledgedCritical.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100"
            >
              <span className="text-red-500 mt-0.5">●</span>
              <div>
                <p className="text-sm font-medium text-red-800">
                  {alert.substanceName} × {alert.conditionOrSubstanceName}
                </p>
                <p className="text-sm text-red-700 mt-0.5">{alert.messageFr}</p>
              </div>
            </div>
          ))}

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-gray-50 border border-gray-200">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-sage focus:ring-sage/30"
            />
            <span className="text-sm text-charcoal">
              Je confirme avoir pris connaissance de ces alertes et j&apos;assume la responsabilite de mes recommandations.
            </span>
          </label>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <span className="text-blue-500 text-sm mt-0.5">ℹ️</span>
            <p className="text-xs text-blue-700">
              AFEIA fournit des alertes informatives. Elles ne constituent pas un avis medical.
              En cas de doute, orientez votre consultant vers son medecin traitant.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
              setAcknowledged(false);
            }}
            disabled={!acknowledged || loading}
          >
            {loading ? 'Validation...' : 'Valider quand meme'}
          </Button>
        </div>
      </div>
    </div>
  );
}
