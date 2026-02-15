'use client';

import { cn } from '@/lib/cn';
import type { ObservanceSummary, ObservanceCategory } from '@/lib/types';
import { OBSERVANCE_CATEGORIES } from '@/lib/journal-constants';

type ObservanceChartProps = {
  summary: ObservanceSummary;
  onCategoryClick?: (category: ObservanceCategory) => void;
  detailed?: boolean;
  detailedLogs?: Array<{ date: string; items: Array<{ category: string; done: boolean }> }>;
};

function getRateColor(rate: number): string {
  if (rate >= 75) return 'bg-sage';
  if (rate >= 50) return 'bg-terracotta';
  return 'bg-rose';
}

function getRateTextColor(rate: number): string {
  if (rate >= 75) return 'text-sage';
  if (rate >= 50) return 'text-terracotta';
  return 'text-rose';
}

function getCategoryLabel(cat: string): string {
  return OBSERVANCE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export function ObservanceChart({ summary, onCategoryClick, detailed = false, detailedLogs }: ObservanceChartProps) {
  const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div className="space-y-4">
      {/* Global rate bar */}
      <div className="rounded-lg bg-white/60 p-4 border border-divider">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-charcoal">Observance globale</span>
          <span className={cn('text-lg font-bold', getRateTextColor(summary.globalRate))}>
            {summary.globalRate}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', getRateColor(summary.globalRate))}
            style={{ width: `${summary.globalRate}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-2">
        {summary.categories.map((cat) => (
          <div key={cat.category}>
            <button
              type="button"
              onClick={() => onCategoryClick?.(cat.category)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg bg-white/60 px-3 py-2.5 border border-divider transition-colors',
                onCategoryClick && 'hover:bg-cream/50 cursor-pointer'
              )}
            >
              <span className="text-xs text-charcoal font-medium flex-1 text-left truncate">
                {getCategoryLabel(cat.category)}
              </span>
              <span className="text-xs text-stone">
                {cat.itemCount} item{cat.itemCount > 1 ? 's' : ''}
              </span>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', getRateColor(cat.rate))}
                  style={{ width: `${cat.rate}%` }}
                />
              </div>
              <span className={cn('text-xs font-semibold min-w-[36px] text-right', getRateTextColor(cat.rate))}>
                {cat.rate}%
              </span>
            </button>

            {/* Detailed 7-day grid */}
            {detailed && detailedLogs && (
              <div className="ml-4 mt-1 mb-2">
                <div className="flex gap-1 items-center">
                  {DAY_LABELS.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-stone">{day}</span>
                      {detailedLogs.slice(-7).map((log, j) => {
                        const matchingItems = log.items.filter((it) => it.category === cat.category);
                        if (matchingItems.length === 0) return <div key={j} className="h-3 w-3 rounded-full bg-gray-100" />;
                        const allDone = matchingItems.every((it) => it.done);
                        return (
                          <div
                            key={j}
                            className={cn(
                              'h-3 w-3 rounded-full',
                              allDone ? 'bg-sage' : 'bg-gray-200 border border-gray-300'
                            )}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
