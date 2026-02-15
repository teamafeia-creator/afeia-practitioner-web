'use client';

import { cn } from '@/lib/cn';
import { BRISTOL_TYPES } from '@/lib/journal-constants';
import type { BristolType } from '@/lib/types';

type BristolScaleProps = {
  value: BristolType | null;
  onChange?: (type: BristolType) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
};

const COLOR_MAP: Record<string, { bg: string; ring: string; text: string }> = {
  'orange-600': { bg: 'bg-orange-100', ring: 'ring-orange-400', text: 'text-orange-600' },
  'orange-400': { bg: 'bg-orange-50', ring: 'ring-orange-300', text: 'text-orange-400' },
  'emerald-500': { bg: 'bg-emerald-50', ring: 'ring-emerald-400', text: 'text-emerald-500' },
  'emerald-600': { bg: 'bg-emerald-100', ring: 'ring-emerald-500', text: 'text-emerald-600' },
  'red-400': { bg: 'bg-red-50', ring: 'ring-red-300', text: 'text-red-400' },
  'red-500': { bg: 'bg-red-100', ring: 'ring-red-400', text: 'text-red-500' },
  'red-600': { bg: 'bg-red-100', ring: 'ring-red-500', text: 'text-red-600' },
};

/** Inline SVG shapes for each Bristol type */
function BristolSVG({ type, size }: { type: number; size: 'sm' | 'md' }) {
  const w = size === 'sm' ? 28 : 40;
  const h = size === 'sm' ? 20 : 28;
  const strokeColor = 'currentColor';

  switch (type) {
    case 1:
      // Separate hard balls
      return (
        <svg width={w} height={h} viewBox="0 0 40 28" fill="none">
          <circle cx="10" cy="14" r="4" fill={strokeColor} opacity={0.6} />
          <circle cx="22" cy="10" r="3.5" fill={strokeColor} opacity={0.6} />
          <circle cx="20" cy="20" r="3" fill={strokeColor} opacity={0.6} />
          <circle cx="32" cy="14" r="3.5" fill={strokeColor} opacity={0.6} />
        </svg>
      );
    case 2:
      // Lumpy sausage
      return (
        <svg width={w} height={h} viewBox="0 0 40 28" fill="none">
          <path d="M6 14c0-4 2-7 6-7s4 3 8 3 4-3 8-3 6 3 6 7-2 7-6 7-4-3-8-3-4 3-8 3-6-3-6-7z" fill={strokeColor} opacity={0.5} />
          <circle cx="12" cy="11" r="2" fill={strokeColor} opacity={0.3} />
          <circle cx="20" cy="16" r="2.5" fill={strokeColor} opacity={0.3} />
          <circle cx="28" cy="11" r="2" fill={strokeColor} opacity={0.3} />
        </svg>
      );
    case 3:
      // Sausage with cracks
      return (
        <svg width={w} height={h} viewBox="0 0 40 28" fill="none">
          <rect x="4" y="8" width="32" height="12" rx="6" fill={strokeColor} opacity={0.5} />
          <line x1="14" y1="9" x2="13" y2="14" stroke={strokeColor} strokeWidth="0.8" opacity={0.4} />
          <line x1="22" y1="9" x2="23" y2="13" stroke={strokeColor} strokeWidth="0.8" opacity={0.4} />
          <line x1="30" y1="10" x2="29" y2="14" stroke={strokeColor} strokeWidth="0.8" opacity={0.4} />
        </svg>
      );
    case 4:
      // Smooth sausage (ideal)
      return (
        <svg width={w} height={h} viewBox="0 0 40 28" fill="none">
          <rect x="4" y="9" width="32" height="10" rx="5" fill={strokeColor} opacity={0.5} />
        </svg>
      );
    case 5:
      // Soft blobs with clear edges
      return (
        <svg width={w} height={h} viewBox="0 0 40 28" fill="none">
          <ellipse cx="10" cy="14" rx="5" ry="4" fill={strokeColor} opacity={0.5} />
          <ellipse cx="22" cy="13" rx="6" ry="5" fill={strokeColor} opacity={0.5} />
          <ellipse cx="34" cy="15" rx="4" ry="3.5" fill={strokeColor} opacity={0.5} />
        </svg>
      );
    case 6:
      // Mushy stool
      return (
        <svg width={w} height={h} viewBox="0 0 40 28" fill="none">
          <ellipse cx="12" cy="16" rx="7" ry="4" fill={strokeColor} opacity={0.4} />
          <ellipse cx="26" cy="13" rx="8" ry="5" fill={strokeColor} opacity={0.4} />
          <ellipse cx="18" cy="18" rx="5" ry="3" fill={strokeColor} opacity={0.3} />
        </svg>
      );
    case 7:
      // Liquid/wave
      return (
        <svg width={w} height={h} viewBox="0 0 40 28" fill="none">
          <path d="M4 14c4-4 8 4 12 0s8 4 12 0 8 4 8 0" stroke={strokeColor} strokeWidth="2" opacity={0.5} fill="none" />
          <path d="M4 20c4-3 8 3 12 0s8 3 12 0 8 3 8 0" stroke={strokeColor} strokeWidth="1.5" opacity={0.3} fill="none" />
        </svg>
      );
    default:
      return null;
  }
}

export function BristolScale({ value, onChange, readonly = false, size = 'md' }: BristolScaleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {BRISTOL_TYPES.map((bristol) => {
        const isSelected = value === bristol.type;
        const colors = COLOR_MAP[bristol.color] ?? { bg: 'bg-gray-100', ring: 'ring-gray-300', text: 'text-gray-500' };

        return (
          <button
            key={bristol.type}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(bristol.type as BristolType)}
            className={cn(
              'flex flex-col items-center rounded-lg border transition-all',
              size === 'sm' ? 'p-1.5 min-w-[44px]' : 'p-2 min-w-[60px]',
              isSelected
                ? `${colors.bg} border-transparent ring-2 ${colors.ring}`
                : 'border-divider bg-white hover:bg-cream/50',
              readonly && 'cursor-default',
              !readonly && !isSelected && 'hover:border-sage/30 cursor-pointer'
            )}
            title={`${bristol.label} — ${bristol.description}`}
          >
            <span className={cn('font-semibold', size === 'sm' ? 'text-xs' : 'text-sm', isSelected ? colors.text : 'text-stone')}>
              {bristol.type}
            </span>
            <div className={cn(isSelected ? colors.text : 'text-stone/60')}>
              <BristolSVG type={bristol.type} size={size} />
            </div>
            {size === 'md' && (
              <span className={cn('text-[10px] leading-tight text-center mt-0.5', isSelected ? colors.text : 'text-stone')}>
                {bristol.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
