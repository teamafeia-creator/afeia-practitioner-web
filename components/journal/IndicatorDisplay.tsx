'use client';

import { cn } from '@/lib/cn';
import { Check, X } from 'lucide-react';
import type { JournalIndicator, CustomIndicatorValue } from '@/lib/types';

type IndicatorDisplayProps = {
  indicator: JournalIndicator;
  value: CustomIndicatorValue | null;
  onChange?: (value: CustomIndicatorValue) => void;
  readonly?: boolean;
};

export function IndicatorDisplay({ indicator, value, onChange, readonly = false }: IndicatorDisplayProps) {
  const currentValue = value?.value;

  function handleChange(newValue: boolean | number | string) {
    onChange?.({
      indicator_id: indicator.id,
      value: newValue,
      notes: value?.notes,
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/60 px-3 py-2 border border-divider">
      <span className="text-xs text-charcoal font-medium truncate">{indicator.label}</span>

      <div className="flex-shrink-0">
        {indicator.value_type === 'boolean' && (
          <BooleanControl
            checked={currentValue === true}
            readonly={readonly}
            onToggle={() => handleChange(currentValue !== true)}
          />
        )}

        {indicator.value_type === 'number' && (
          <NumberControl
            value={typeof currentValue === 'number' ? currentValue : 0}
            unit={indicator.unit}
            targetValue={indicator.target_value}
            readonly={readonly}
            onChange={(n) => handleChange(n)}
          />
        )}

        {indicator.value_type === 'scale_1_5' && (
          <ScaleControl
            value={typeof currentValue === 'number' ? currentValue : 0}
            readonly={readonly}
            onChange={(n) => handleChange(n)}
          />
        )}

        {indicator.value_type === 'text' && (
          readonly ? (
            <span className="text-xs text-stone">{typeof currentValue === 'string' ? currentValue : '—'}</span>
          ) : (
            <input
              type="text"
              className="text-xs border border-divider rounded px-2 py-1 w-24 bg-white text-charcoal"
              value={typeof currentValue === 'string' ? currentValue : ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="..."
            />
          )
        )}
      </div>
    </div>
  );
}

function BooleanControl({
  checked,
  readonly,
  onToggle,
}: {
  checked: boolean;
  readonly: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={readonly}
      onClick={onToggle}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        checked ? 'bg-sage-light text-sage' : 'bg-gray-100 text-stone',
        !readonly && 'cursor-pointer hover:opacity-80'
      )}
    >
      {checked ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </button>
  );
}

function NumberControl({
  value,
  unit,
  targetValue,
  readonly,
  onChange,
}: {
  value: number;
  unit?: string | null;
  targetValue?: string | null;
  readonly: boolean;
  onChange: (n: number) => void;
}) {
  const target = targetValue ? parseFloat(targetValue) : null;
  const progress = target && target > 0 ? Math.min(100, (value / target) * 100) : null;

  if (readonly) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-charcoal">{value}</span>
        {unit && <span className="text-[10px] text-stone">{unit}</span>}
        {progress !== null && (
          <div className="w-12 h-1.5 bg-gray-200 rounded-full ml-1">
            <div
              className="h-full rounded-full bg-sage transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        className="w-16 text-xs border border-divider rounded px-2 py-1 bg-white text-charcoal text-right"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      {unit && <span className="text-[10px] text-stone">{unit}</span>}
      {progress !== null && (
        <div className="w-10 h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-full rounded-full bg-sage transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ScaleControl({
  value,
  readonly,
  onChange,
}: {
  value: number;
  readonly: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(n)}
          className={cn(
            'h-5 w-5 rounded-full border transition-colors',
            n <= value
              ? 'bg-sage border-sage'
              : 'bg-white border-divider',
            !readonly && 'cursor-pointer hover:border-sage/50'
          )}
        />
      ))}
    </div>
  );
}
