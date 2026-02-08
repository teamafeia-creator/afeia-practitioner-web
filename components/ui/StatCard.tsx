'use client';

import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
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
        'bg-white rounded-xl border border-divider p-5 shadow-card hover:shadow-card-hover transition-shadow duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: color ? `${color}15` : '#E8F0EB' }}>
          {typeof icon === 'string' ? (
            <span className="text-lg" style={{ color: color || '#5B8C6E' }}>{icon}</span>
          ) : (
            <span style={{ color: color || '#5B8C6E' }}>{icon}</span>
          )}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
              trend.direction === 'up' && 'bg-sage-light text-sage-dark',
              trend.direction === 'down' && 'bg-rose/10 text-rose',
              trend.direction === 'flat' && 'bg-stone/10 text-stone'
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
        className="text-2xl font-bold text-charcoal mb-1"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="text-[13px] text-stone">{label}</div>
    </div>
  );
}
