'use client';

import Link from 'next/link';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AlertLevel } from '@/lib/admin/alerts';

type AdminAlertItemProps = {
  level: AlertLevel;
  title: string;
  description: string;
  practitionerId: string;
};

const levelConfig: Record<AlertLevel, { icon: React.ElementType; classes: string }> = {
  critical: {
    icon: AlertCircle,
    classes: 'border-red-200 bg-red-50 text-red-800',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  info: {
    icon: Info,
    classes: 'border-blue-200 bg-blue-50 text-blue-800',
  },
};

export function AdminAlertItem({ level, title, description, practitionerId }: AdminAlertItemProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Link
      href={`/admin/practitioners/${practitionerId}`}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-opacity hover:opacity-80',
        config.classes
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-medium">{title}</span>
      <span className="flex-1 truncate text-xs opacity-80">{description}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </Link>
  );
}
