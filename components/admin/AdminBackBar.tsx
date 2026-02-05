'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

type AdminBackBarProps = {
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variants = {
  ghost: 'bg-transparent text-charcoal hover:bg-sable/70 focus-visible:ring-teal/30',
  outline: 'border border-teal/30 bg-white text-teal hover:border-teal hover:bg-teal/5'
};

const sizes = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4 py-2.5 text-[13px]'
};

export function AdminBackBar({ secondaryHref, secondaryLabel, className }: AdminBackBarProps) {
  return (
    <div className={cn('mb-4 flex w-full flex-wrap items-center justify-start gap-2', className)}>
      <Link href="/admin" className={cn(baseClasses, variants.ghost, sizes.md)}>
        ← Retour au dashboard admin
      </Link>
      {secondaryHref && secondaryLabel ? (
        <Link href={secondaryHref} className={cn(baseClasses, variants.outline, sizes.md)}>
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}
