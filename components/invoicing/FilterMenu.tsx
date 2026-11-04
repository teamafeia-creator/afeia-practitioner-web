'use client';

import { useEffect, useRef } from 'react';

export type FilterOption = { k: string; l: string; n?: number };

/** Bouton « Libellé : valeur ▾ » avec sa liste d'options (barre de filtres Facturation). */
export function FilterMenu({
  label,
  value,
  options,
  open,
  onToggle,
  onPick,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  open: boolean;
  onToggle: (open: boolean) => void;
  onPick: (k: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chosen = options.find((o) => o.k === value) ?? options[0];
  const active = value !== options[0]?.k;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onToggle(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open, onToggle]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border px-3 text-[13px] text-charcoal"
        style={{ borderColor: active ? '#2F5A50' : '#2A3140', background: active ? '#23383B' : '#0A0E14' }}
      >
        <span className="text-stone">{label}</span>
        <span className="font-semibold" style={{ color: active ? '#6DD4B8' : '#E8EDF4' }}>{chosen?.l}</span>
        <span aria-hidden="true" className="text-stone">▾</span>
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="absolute left-0 top-11 z-20 flex max-h-80 min-w-[230px] flex-col overflow-y-auto rounded-xl border border-divider bg-surface-raised p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          {options.map((o) => {
            const on = o.k === value;
            return (
              <button
                key={o.k}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onPick(o.k);
                  onToggle(false);
                }}
                className={`flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-charcoal ${on ? 'bg-sage-light' : 'hover:bg-surface'}`}
              >
                <span aria-hidden="true" className="w-3.5 text-sage">{on ? '✓' : ''}</span>
                <span className="flex-1">{o.l}</span>
                {o.n !== undefined && <span className="text-xs tabular-nums text-stone">{o.n}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
