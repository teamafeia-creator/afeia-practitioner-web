'use client';

import { Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type DossierNavBadge =
  | { kind: 'todo' }
  | { kind: 'done' }
  | { kind: 'version'; version: number }
  | { kind: 'premium' }
  | { kind: 'unread'; count: number };

export interface DossierNavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: DossierNavBadge | null;
}

export interface DossierNavGroup<T extends string> {
  label: string;
  items: DossierNavItem<T>[];
}

function NavBadge({ badge }: { badge: DossierNavBadge }) {
  switch (badge.kind) {
    case 'todo':
      return (
        <span className="shrink-0 rounded-full bg-terracotta-light px-2 py-0.5 text-[10px] font-medium text-terracotta">
          à compléter
        </span>
      );
    case 'done':
      return (
        <span className="shrink-0 text-xs text-sage" aria-label="complété">
          ✓
        </span>
      );
    case 'version':
      return (
        <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium tabular-nums text-stone">
          v{badge.version}
        </span>
      );
    case 'premium':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-terracotta">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Premium
        </span>
      );
    case 'unread':
      return badge.count > 0 ? (
        <span
          className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] font-semibold tabular-nums text-ink"
          aria-label={`${badge.count} non lu${badge.count > 1 ? 's' : ''}`}
        >
          {badge.count > 99 ? '99+' : badge.count}
        </span>
      ) : null;
  }
}

export function DossierNav<T extends string>({
  groups,
  active,
  onChange,
  className,
}: {
  groups: DossierNavGroup<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  const allItems = groups.flatMap((group) => group.items);

  return (
    <nav aria-label="Sections du dossier" className={className}>
      {/* Mobile / tablette : rangée défilante */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {allItems.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                isActive
                  ? 'border-transparent bg-sage-light text-sage'
                  : 'border-divider bg-surface text-stone hover:text-charcoal'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="whitespace-nowrap">{item.label}</span>
              {item.badge ? <NavBadge badge={item.badge} /> : null}
            </button>
          );
        })}
      </div>

      {/* Bureau : navigation verticale groupée */}
      <div className="sticky top-20 hidden w-[220px] space-y-5 lg:block">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-mist">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.id === active;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] font-medium transition-colors',
                        isActive
                          ? 'bg-sage-light text-sage'
                          : 'text-stone hover:bg-white/5 hover:text-charcoal'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge ? <NavBadge badge={item.badge} /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
