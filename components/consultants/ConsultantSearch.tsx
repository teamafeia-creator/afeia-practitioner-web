'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export type ConsultantOption = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export function getConsultantDisplayName(c: ConsultantOption): string {
  if (c.name) return c.name;
  const parts = [c.first_name, c.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Consultant';
}

/** Recherche d'un consultant du praticien (nom ou e-mail), avec liste déroulante. */
export function ConsultantSearch({
  consultants,
  open,
  onOpenChange,
  onSelect,
  inputClassName,
}: {
  consultants: ConsultantOption[];
  /** Liste déroulante ouverte. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (consultant: ConsultantOption) => void;
  inputClassName: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConsultants = searchQuery
    ? consultants.filter(
        (c) =>
          getConsultantDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : consultants;

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" aria-hidden="true" />
      <input
        type="text"
        aria-label="Rechercher un consultant"
        placeholder="Rechercher un consultant…"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          onOpenChange(true);
        }}
        onFocus={() => onOpenChange(true)}
        className={`${inputClassName} pl-10`}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-[10px] border border-divider bg-surface shadow-lg">
          {filteredConsultants.length === 0 ? (
            <div className="p-3 text-sm text-stone">Aucun consultant trouvé</div>
          ) : (
            filteredConsultants.slice(0, 20).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setSearchQuery('');
                  onOpenChange(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-surface-raised"
              >
                <div className="text-sm font-medium text-charcoal">{getConsultantDisplayName(c)}</div>
                {c.email && <div className="text-xs text-stone">{c.email}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
