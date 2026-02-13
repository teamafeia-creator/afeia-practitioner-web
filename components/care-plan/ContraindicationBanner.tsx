'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ContraindicationAlert } from '@/lib/types/contraindications';
import { ContraindicationInlineAlert } from './ContraindicationInlineAlert';

interface ContraindicationBannerProps {
  alerts: ContraindicationAlert[];
  onAcknowledge: (ruleId: string) => void;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export function ContraindicationBanner({
  alerts,
  onAcknowledge,
  criticalCount,
  warningCount,
  infoCount,
}: ContraindicationBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  if (unacknowledgedAlerts.length === 0) return null;

  const hasCritical = criticalCount > 0;
  const hasWarning = warningCount > 0;

  return (
    <div
      className={cn(
        'rounded-xl border-l-4 overflow-hidden transition-all',
        hasCritical
          ? 'border-l-red-500 bg-red-50/80'
          : hasWarning
          ? 'border-l-amber-500 bg-amber-50/80'
          : 'border-l-blue-500 bg-blue-50/80'
      )}
      role="alert"
      aria-live="polite"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {hasCritical ? (
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          ) : hasWarning ? (
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          )}
          <span className={cn(
            'text-sm font-medium',
            hasCritical ? 'text-red-800' : hasWarning ? 'text-amber-800' : 'text-blue-800'
          )}>
            {criticalCount > 0 && (
              <span>{criticalCount} alerte{criticalCount > 1 ? 's' : ''} critique{criticalCount > 1 ? 's' : ''}</span>
            )}
            {criticalCount > 0 && warningCount > 0 && <span> · </span>}
            {warningCount > 0 && (
              <span>{warningCount} avertissement{warningCount > 1 ? 's' : ''}</span>
            )}
            {(criticalCount > 0 || warningCount > 0) && infoCount > 0 && <span> · </span>}
            {infoCount > 0 && (
              <span>{infoCount} info{infoCount > 1 ? 's' : ''}</span>
            )}
            <span className="text-xs ml-2 opacity-75">
              — {expanded ? 'Masquer' : 'Voir les details'}
            </span>
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-stone" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {unacknowledgedAlerts.map((alert) => (
            <ContraindicationInlineAlert
              key={alert.id}
              alert={alert}
              onAcknowledge={() => onAcknowledge(alert.ruleId)}
            />
          ))}
          <p className="text-xs text-gray-500 italic mt-2">
            Information non exhaustive a titre indicatif. En cas de doute, orientez votre consultant vers son medecin traitant.
          </p>
        </div>
      )}
    </div>
  );
}
