'use client';

import { cn } from '@/lib/cn';

export function InvoiceNumberDisplay({
  numero,
  className,
}: {
  numero: string | null;
  className?: string;
}) {
  if (!numero) {
    return (
      <span className={cn('text-sm text-stone italic', className)}>
        Brouillon
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-sm font-mono font-medium text-charcoal',
        className
      )}
    >
      {numero}
    </span>
  );
}
