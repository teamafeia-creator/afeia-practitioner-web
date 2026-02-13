'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Chip } from '@/components/ui/Chip';
import { Popover } from '@/components/ui/Popover';
import type { ConsultantFilters, ConsultantSortOption } from '@/lib/types/filters';
import {
  CARE_PLAN_STATUS_LABELS,
  LAST_ACTIVITY_LABELS,
  NEXT_APPOINTMENT_LABELS,
  ADHERENCE_LABELS,
  REGISTRATION_DATE_LABELS,
  SORT_LABELS,
} from '@/lib/types/filters';

interface ConsultantFilterBarProps {
  filters: ConsultantFilters;
  setFilter: <K extends keyof ConsultantFilters>(key: K, value: ConsultantFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  search: string;
  setSearch: (value: string) => void;
  sortOption: ConsultantSortOption;
  setSortOption: (option: ConsultantSortOption) => void;
  resultCount: number;
  availableConcerns?: string[];
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-gray-50 transition-colors"
      >
        {title}
        <ChevronDown className={cn('h-4 w-4 text-stone transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
          <input
            type="checkbox"
            checked={values.includes(opt.value)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...values, opt.value]);
              } else {
                onChange(values.filter((v) => v !== opt.value));
              }
            }}
            className="rounded border-gray-300 text-sage focus:ring-sage/30"
          />
          <span className="text-charcoal">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
          <input
            type="radio"
            checked={value === opt.value}
            onChange={() => onChange(value === opt.value ? null : opt.value)}
            className="border-gray-300 text-sage focus:ring-sage/30"
          />
          <span className="text-charcoal">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function getActiveChips(
  filters: ConsultantFilters
): { key: string; filterKey: keyof ConsultantFilters; label: string; value: string }[] {
  const chips: { key: string; filterKey: keyof ConsultantFilters; label: string; value: string }[] = [];

  filters.carePlanStatus.forEach((v) =>
    chips.push({
      key: `carePlanStatus-${v}`,
      filterKey: 'carePlanStatus',
      label: `Conseillancier: ${CARE_PLAN_STATUS_LABELS[v]}`,
      value: v,
    })
  );

  if (filters.lastActivity) {
    chips.push({
      key: 'lastActivity',
      filterKey: 'lastActivity',
      label: `Activite: ${LAST_ACTIVITY_LABELS[filters.lastActivity]}`,
      value: filters.lastActivity,
    });
  }

  filters.badge.forEach((v) =>
    chips.push({
      key: `badge-${v}`,
      filterKey: 'badge',
      label: v === 'premium' ? 'Premium' : 'Standard',
      value: v,
    })
  );

  if (filters.nextAppointment) {
    chips.push({
      key: 'nextAppointment',
      filterKey: 'nextAppointment',
      label: `RDV: ${NEXT_APPOINTMENT_LABELS[filters.nextAppointment]}`,
      value: filters.nextAppointment,
    });
  }

  filters.adherenceLevel.forEach((v) =>
    chips.push({
      key: `adherenceLevel-${v}`,
      filterKey: 'adherenceLevel',
      label: `Adhesion: ${ADHERENCE_LABELS[v]}`,
      value: v,
    })
  );

  if (filters.registrationDate) {
    chips.push({
      key: 'registrationDate',
      filterKey: 'registrationDate',
      label: `Inscription: ${REGISTRATION_DATE_LABELS[filters.registrationDate]}`,
      value: filters.registrationDate,
    });
  }

  filters.mainConcern.forEach((v) =>
    chips.push({
      key: `mainConcern-${v}`,
      filterKey: 'mainConcern',
      label: `Motif: ${v}`,
      value: v,
    })
  );

  return chips;
}

export function ConsultantFilterBar({
  filters,
  setFilter,
  clearFilters,
  activeFilterCount,
  search,
  setSearch,
  sortOption,
  setSortOption,
  resultCount,
  availableConcerns = [],
}: ConsultantFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const activeChips = getActiveChips(filters);

  const removeChip = (chip: { filterKey: keyof ConsultantFilters; value: string }) => {
    const { filterKey, value } = chip;
    switch (filterKey) {
      case 'carePlanStatus':
        setFilter('carePlanStatus', filters.carePlanStatus.filter((v) => v !== value));
        break;
      case 'lastActivity':
        setFilter('lastActivity', null);
        break;
      case 'badge':
        setFilter('badge', filters.badge.filter((v) => v !== value));
        break;
      case 'nextAppointment':
        setFilter('nextAppointment', null);
        break;
      case 'adherenceLevel':
        setFilter('adherenceLevel', filters.adherenceLevel.filter((v) => v !== value));
        break;
      case 'registrationDate':
        setFilter('registrationDate', null);
        break;
      case 'mainConcern':
        setFilter('mainConcern', filters.mainConcern.filter((v) => v !== value));
        break;
    }
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un consultant..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/30"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-charcoal"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter button + popover */}
        <Popover
          open={filterOpen}
          onOpenChange={setFilterOpen}
          trigger={
            <button className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
              activeFilterCount > 0
                ? 'border-sage bg-sage-light/50 text-sage'
                : 'border-gray-200 text-charcoal hover:border-gray-300'
            )}>
              <Filter className="h-3.5 w-3.5" />
              Filtrer
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-sage text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          }
          className="max-h-[70vh] overflow-y-auto"
        >
          <div className="py-1">
            <FilterSection title="Conseillancier">
              <CheckboxGroup
                options={Object.entries(CARE_PLAN_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                values={filters.carePlanStatus}
                onChange={(values) => setFilter('carePlanStatus', values as ConsultantFilters['carePlanStatus'])}
              />
            </FilterSection>

            <FilterSection title="Derniere activite">
              <RadioGroup
                options={Object.entries(LAST_ACTIVITY_LABELS).map(([value, label]) => ({ value, label }))}
                value={filters.lastActivity}
                onChange={(v) => setFilter('lastActivity', v as ConsultantFilters['lastActivity'])}
              />
            </FilterSection>

            <FilterSection title="Badge">
              <CheckboxGroup
                options={[
                  { value: 'premium', label: 'Premium' },
                  { value: 'standard', label: 'Standard' },
                ]}
                values={filters.badge}
                onChange={(values) => setFilter('badge', values as ConsultantFilters['badge'])}
              />
            </FilterSection>

            <FilterSection title="Prochain RDV">
              <RadioGroup
                options={Object.entries(NEXT_APPOINTMENT_LABELS).map(([value, label]) => ({ value, label }))}
                value={filters.nextAppointment}
                onChange={(v) => setFilter('nextAppointment', v as ConsultantFilters['nextAppointment'])}
              />
            </FilterSection>

            <FilterSection title="Adhesion">
              <CheckboxGroup
                options={Object.entries(ADHERENCE_LABELS).map(([value, label]) => ({ value, label }))}
                values={filters.adherenceLevel}
                onChange={(values) => setFilter('adherenceLevel', values as ConsultantFilters['adherenceLevel'])}
              />
            </FilterSection>

            <FilterSection title="Inscription">
              <RadioGroup
                options={Object.entries(REGISTRATION_DATE_LABELS).map(([value, label]) => ({ value, label }))}
                value={filters.registrationDate}
                onChange={(v) => setFilter('registrationDate', v as ConsultantFilters['registrationDate'])}
              />
            </FilterSection>

            {availableConcerns.length > 0 && (
              <FilterSection title="Motif">
                <CheckboxGroup
                  options={availableConcerns.map((c) => ({ value: c, label: c }))}
                  values={filters.mainConcern}
                  onChange={(values) => setFilter('mainConcern', values)}
                />
              </FilterSection>
            )}
          </div>
        </Popover>

        {/* Active filter chips */}
        {activeChips.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            variant="teal"
            onRemove={() => removeChip(chip)}
          />
        ))}

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-stone hover:text-charcoal underline"
          >
            Effacer tout
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort selector */}
        <Popover
          open={sortOpen}
          onOpenChange={setSortOpen}
          align="end"
          trigger={
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-charcoal hover:border-gray-300 transition-colors">
              Trier : {SORT_LABELS[sortOption.field]}
              <ChevronDown className="h-3.5 w-3.5 text-stone" />
            </button>
          }
          className="min-w-[200px]"
        >
          <div className="py-1">
            {(Object.entries(SORT_LABELS) as [ConsultantSortOption['field'], string][]).map(([field, label]) => (
              <button
                key={field}
                onClick={() => {
                  setSortOption({
                    field,
                    order: field === sortOption.field && sortOption.order === 'asc' ? 'desc' : 'asc',
                  });
                  setSortOpen(false);
                }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors',
                  sortOption.field === field ? 'text-sage font-medium' : 'text-charcoal'
                )}
              >
                {label}
                {sortOption.field === field && (
                  <span className="ml-1 text-xs text-stone">
                    {sortOption.order === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Popover>

        {/* Result count */}
        <span className="text-xs text-stone whitespace-nowrap">
          {resultCount} consultant{resultCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
