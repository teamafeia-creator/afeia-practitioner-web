'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ContraindicationAlert } from '@/lib/types/contraindications';

interface ContraindicationInlineAlertProps {
  alert: ContraindicationAlert;
  onAcknowledge: () => void;
  compact?: boolean;
}

const severityConfig = {
  critical: {
    borderColor: 'border-l-red-500',
    bg: 'bg-red-50/50',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    label: 'Critique',
    labelBg: 'bg-red-100 text-red-700',
  },
  warning: {
    borderColor: 'border-l-amber-500',
    bg: 'bg-amber-50/50',
    icon: AlertCircle,
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
    label: 'Attention',
    labelBg: 'bg-amber-100 text-amber-700',
  },
  info: {
    borderColor: 'border-l-blue-500',
    bg: 'bg-blue-50/50',
    icon: Info,
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    label: 'Info',
    labelBg: 'bg-blue-100 text-blue-700',
  },
};

export function ContraindicationInlineAlert({ alert, onAcknowledge, compact }: ContraindicationInlineAlertProps) {
  const [showDetails, setShowDetails] = useState(false);
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  if (alert.acknowledged) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 opacity-60">
        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="text-xs text-gray-500 line-through">
          {alert.substanceName} × {alert.conditionOrSubstanceName}
        </span>
        <span className="text-xs text-green-600">Pris en note</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-3',
        config.borderColor,
        config.bg
      )}
      role={alert.severity === 'critical' ? 'alert' : undefined}
      aria-live={alert.severity === 'critical' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', config.labelBg)}>
              {config.label}
            </span>
            <span className={cn('text-sm font-medium', config.titleColor)}>
              {alert.ruleType === 'interaction'
                ? `${alert.substanceName} × ${alert.conditionOrSubstanceName}`
                : `${alert.substanceName} × ${alert.conditionOrSubstanceName}`}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-2">{alert.messageFr}</p>

          {!compact && showDetails && (
            <div className="space-y-2 mb-2">
              {alert.recommendationFr && (
                <div className="text-sm">
                  <span className="font-medium text-gray-600">Recommandation : </span>
                  <span className="text-gray-700">{alert.recommendationFr}</span>
                </div>
              )}
              {alert.source && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Source : </span>
                  {alert.source}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            {!compact && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs font-medium text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                {showDetails ? 'Masquer' : 'Voir details'}
              </button>
            )}
            <button
              onClick={onAcknowledge}
              className="text-xs font-medium text-sage hover:text-sage-deep flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              J&apos;ai pris note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
