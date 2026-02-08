'use client';

import { AlertTriangle } from 'lucide-react';

interface MedicalAlertBannerProps {
  alerts: string[];
}

export function MedicalAlertBanner({ alerts }: MedicalAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-800">
          Signaux d&apos;alerte détectés dans l&apos;anamnèse
        </p>
        <p className="text-sm text-amber-700 mt-1">
          Les éléments suivants peuvent nécessiter un avis médical préalable :
        </p>
        <ul className="mt-1.5 space-y-0.5">
          {alerts.map((alert, i) => (
            <li key={i} className="text-sm text-amber-700">
              &bull; {alert}
            </li>
          ))}
        </ul>
        <p className="text-xs text-amber-600 mt-2">
          Vérifiez les sections marquées et orientez si nécessaire vers le médecin traitant.
        </p>
      </div>
    </div>
  );
}
