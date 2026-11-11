'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/cn';
import {
  fieldLines,
  formatFrequency,
  inferFrequency,
  resolveLineIndex,
  type TrackedItem,
} from '../../../lib/observance-tracking';
import { FrequencyPicker } from './FrequencyPicker';

/** Items suivis d'une rubrique, indexés par ligne actuelle. */
export function trackedByLine(fieldKey: string, value: string, tracked: TrackedItem[]) {
  const lines = fieldLines(value);
  const map = new Map<number, TrackedItem>();
  for (const t of tracked) {
    if (t.field_key !== fieldKey) continue;
    const i = resolveLineIndex(t, lines);
    if (i >= 0 && !map.has(i)) map.set(i, t);
  }
  return { lines, map };
}

/**
 * « Suivi dans le journal » sous une rubrique : chaque ligne peut devenir un item
 * de la checklist du consultant, avec un libellé et une fréquence modifiables.
 */
export function TrackPanel({
  fieldKey,
  value,
  firstName,
  tracked,
  onChange,
}: {
  fieldKey: string;
  value: string;
  firstName: string;
  tracked: TrackedItem[];
  onChange: (next: TrackedItem[]) => void;
}) {
  const [openFreq, setOpenFreq] = useState<number | null>(null);
  const { lines, map } = trackedByLine(fieldKey, value, tracked);
  if (!lines.length) return null;

  function replace(target: TrackedItem, patch: Partial<TrackedItem>) {
    onChange(tracked.map((t) => (t === target ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-ink/60 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-mist">Suivi dans le journal de {firstName}</span>
      <span className="text-xs text-stone">
        Cochez un conseil pour en faire un item de sa checklist. Le libellé et la fréquence sont modifiables.
      </span>
      {lines.map((line, i) => {
        const item = map.get(i);
        const on = Boolean(item);
        return (
          <div key={`${i}-${line}`} className="group flex flex-col gap-1.5 py-1">
            <div className="flex min-h-[34px] items-center gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                title={on ? 'Retirer de la checklist' : 'Suivre dans le journal'}
                onClick={() => {
                  if (item) {
                    onChange(tracked.filter((t) => t !== item));
                    if (openFreq === i) setOpenFreq(null);
                  } else {
                    onChange([...tracked, { field_key: fieldKey, line_index: i, line, label: line, freq: inferFrequency(line) }]);
                  }
                }}
                className={cn(
                  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-xs transition-opacity',
                  on ? 'text-sage' : 'text-stone opacity-0 focus-visible:opacity-100 group-hover:opacity-100'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border-[1.5px]',
                    on ? 'border-sage bg-sage text-ink' : 'border-mist'
                  )}
                >
                  {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                {on ? null : 'Suivre'}
              </button>
              {item ? (
                <>
                  <input
                    type="text"
                    aria-label="Libellé dans la checklist"
                    value={item.label}
                    onChange={(event) => replace(item, { label: event.target.value })}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-divider bg-ink px-2.5 text-[13px] text-charcoal"
                  />
                  <button
                    type="button"
                    aria-expanded={openFreq === i}
                    title="Choisir la fréquence"
                    onClick={() => setOpenFreq(openFreq === i ? null : i)}
                    className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-sage/40 bg-sage-light px-2.5 text-xs font-semibold text-sage"
                  >
                    {formatFrequency(item.freq)}
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-charcoal/75">{line}</span>
              )}
            </div>
            {item && openFreq === i ? (
              <div className="ml-9 flex flex-col gap-2">
                <FrequencyPicker value={item.freq} onChange={(freq) => replace(item, { freq })} />
                <span className="text-xs text-stone">
                  Dans l&apos;app : <span className="font-semibold text-charcoal">{formatFrequency(item.freq)}</span>
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
