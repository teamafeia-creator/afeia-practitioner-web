'use client';

import type { SurchargeLevel } from '../../lib/types';
import { SURCHARGE_LEVELS, SURCHARGE_LEVEL_MAP } from '../../lib/terrain-constants';
import { Select } from '../ui/Select';

interface SurchargeGaugeProps {
  label: string;
  level: SurchargeLevel | null;
  editing?: boolean;
  onChange?: (level: SurchargeLevel) => void;
}

export function SurchargeGauge({ label, level, editing, onChange }: SurchargeGaugeProps) {
  const info = level ? SURCHARGE_LEVEL_MAP[level] : null;
  const percent = info?.percent ?? 0;

  if (editing) {
    return (
      <div className="space-y-1.5">
        <span className="text-xs text-warmgray">{label}</span>
        <Select
          value={level ?? ''}
          onChange={(e) => onChange?.(e.target.value as SurchargeLevel)}
        >
          <option value="">Non évalué</option>
          {SURCHARGE_LEVELS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-warmgray">{label}</span>
        <span className={`text-xs font-medium ${info?.color ?? 'text-stone'}`}>
          {info?.label ?? 'Non évalué'}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-cream overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${info?.barColor ?? 'bg-stone/20'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
