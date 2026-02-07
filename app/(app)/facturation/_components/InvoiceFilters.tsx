'use client';

import { cn } from '@/lib/cn';

interface Props {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'paid', label: 'Payees' },
  { value: 'issued', label: 'En attente' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'cancelled', label: 'Annulees' },
];

export function InvoiceFilters({ currentFilter, onFilterChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            'px-3 py-1.5 rounded-sm text-[13px] font-medium transition-all duration-200',
            currentFilter === filter.value
              ? 'bg-teal text-white shadow-teal-glow'
              : 'bg-white/50 text-charcoal hover:bg-teal/10 hover:text-teal border border-teal/10'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
