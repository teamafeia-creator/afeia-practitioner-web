'use client';

import { cn } from '@/lib/cn';
import type { PeriodKey } from '@/lib/types/stats';
import { PERIOD_OPTIONS } from '@/lib/types/stats';

interface PeriodSelectorProps {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
  className?: string;
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-gray-100 rounded-lg p-1', className)}>
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            value === option.key
              ? 'bg-white text-charcoal shadow-sm'
              : 'text-stone hover:text-charcoal'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
