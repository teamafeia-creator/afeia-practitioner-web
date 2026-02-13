'use client';

import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

type AdminMetricCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: number;
  accentColor?: 'teal' | 'emerald' | 'blue' | 'red';
  progress?: number;
};

const accentClasses: Record<string, string> = {
  teal: 'text-sage-600',
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  red: 'text-red-600',
};

export function AdminMetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  accentColor = 'teal',
  progress,
}: AdminMetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-slate-400" />
        {trend !== undefined && trend !== 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend > 0 ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={cn('mt-2 text-2xl font-bold', accentClasses[accentColor])}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
      {subtext && <div className="mt-0.5 text-xs text-slate-400">{subtext}</div>}
      {progress !== undefined && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-teal-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
