// components/billing/subscription-features.tsx
'use client';

import { cn } from '@/lib/cn';

interface SubscriptionFeaturesProps {
  features: string[];
  className?: string;
}

export function SubscriptionFeatures({ features, className }: SubscriptionFeaturesProps) {
  if (!features || features.length === 0) {
    return null;
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {features.map((feature, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          <svg
            className="h-5 w-5 shrink-0 text-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-charcoal">{feature}</span>
        </li>
      ))}
    </ul>
  );
}
