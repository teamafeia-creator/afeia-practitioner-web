'use client';

import { Sparkles } from 'lucide-react';

interface AIStatusBarProps {
  aiGenerated: boolean;
  quotaUsed: number;
  quotaMax: number; // -1 = illimite
}

export function AIStatusBar({ aiGenerated, quotaUsed, quotaMax }: AIStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border rounded-lg">
      <div className="flex items-center gap-2">
        {aiGenerated && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
            <Sparkles className="w-3 h-3" /> Pré-rempli par IA
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500">
        {quotaMax === -1 ? (
          <span>Générations illimitées</span>
        ) : (
          <span>
            {quotaUsed}/{quotaMax} générations IA ce mois
            {quotaUsed >= quotaMax * 0.8 && quotaUsed < quotaMax && (
              <span className="text-amber-600 ml-1">(bientôt atteint)</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
