'use client';

import type { VitalityLevel } from '../../lib/types';
import { VITALITY_LEVELS, VITALITY_LEVEL_MAP } from '../../lib/terrain-constants';
import { cn } from '../../lib/cn';

interface VitalityIndicatorProps {
  level: VitalityLevel | null;
  notes?: string;
  date?: string;
  editing?: boolean;
  onLevelChange?: (level: VitalityLevel) => void;
}

export function VitalityIndicator({
  level,
  notes,
  date,
  editing,
  onLevelChange,
}: VitalityIndicatorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-warmgray">
          Force vitale
        </span>
        {date && (
          <span className="text-xs text-stone">
            {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Segmented bar */}
      <div className="flex gap-1">
        {VITALITY_LEVELS.map((v) => {
          const isActive = level === v.value;
          const isClickable = editing && onLevelChange;

          return (
            <button
              key={v.value}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onLevelChange(v.value)}
              className={cn(
                'flex-1 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all',
                isActive
                  ? v.color
                  : 'bg-cream text-stone/50',
                isClickable && 'cursor-pointer hover:opacity-80',
                !isClickable && !isActive && 'cursor-default'
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Current level description */}
      {level && !editing && (
        <p className="text-xs text-stone">
          {level === 'haute' && 'Capacité réactionnelle élevée — cures de détoxification possibles.'}
          {level === 'moyenne' && 'Capacité réactionnelle correcte — cures modérées conseillées.'}
          {level === 'basse' && 'Capacité réactionnelle faible — privilégier la revitalisation.'}
          {level === 'epuisee' && 'Capacité réactionnelle très faible — revitalisation impérative avant toute cure.'}
        </p>
      )}

      {notes && !editing && (
        <p className="text-sm text-charcoal whitespace-pre-line">{notes}</p>
      )}
    </div>
  );
}
