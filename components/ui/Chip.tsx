'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ChipProps {
  label: string;
  onRemove?: () => void;
  variant?: 'default' | 'teal' | 'aubergine' | 'gold';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  teal: 'bg-teal/10 text-teal border-teal/20',
  aubergine: 'bg-aubergine/10 text-aubergine border-aubergine/20',
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function Chip({ label, onRemove, variant = 'teal', size = 'sm', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variantStyles[variant],
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
          aria-label={`Retirer le filtre ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
