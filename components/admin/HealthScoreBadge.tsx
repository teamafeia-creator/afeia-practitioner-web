'use client';

import { cn } from '@/lib/cn';

type HealthScoreBadgeProps = {
  score: number;
  color: 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md';
};

const colorClasses: Record<string, { dot: string; text: string; bg: string }> = {
  green: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  yellow: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  red: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

export function HealthScoreBadge({ score, color, size = 'sm' }: HealthScoreBadgeProps) {
  const classes = colorClasses[color];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        classes.bg,
        classes.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <span className={cn('inline-block h-2 w-2 rounded-full', classes.dot)} />
      {score}
    </span>
  );
}
