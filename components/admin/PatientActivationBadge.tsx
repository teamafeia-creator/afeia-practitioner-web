'use client';

import { cn } from '@/lib/cn';

type ActivationStatus = 'activated' | 'pending' | 'expired';

type PatientActivationBadgeProps = {
  status: ActivationStatus;
  className?: string;
};

const statusConfig: Record<ActivationStatus, { label: string; classes: string }> = {
  activated: {
    label: 'Active',
    classes: 'bg-emerald-100 text-emerald-700',
  },
  pending: {
    label: 'En attente',
    classes: 'bg-amber-100 text-amber-700',
  },
  expired: {
    label: 'Expire',
    classes: 'bg-red-100 text-red-700',
  },
};

export function PatientActivationBadge({ status, className }: PatientActivationBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
