'use client';

import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  color?: string;
  className?: string;
}

export function StatCard({ icon, value, label, trend, color, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl" role="img" aria-hidden="true">
          {icon}
        </span>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
              trend.direction === 'up' && 'bg-emerald-50 text-emerald-600',
              trend.direction === 'down' && 'bg-red-50 text-red-600',
              trend.direction === 'flat' && 'bg-gray-50 text-gray-500'
            )}
          >
            {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
            {trend.direction === 'flat' && <Minus className="h-3 w-3" />}
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <div
        className="text-2xl font-bold mb-1"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="text-sm text-warmgray">{label}</div>
    </div>
  );
}
