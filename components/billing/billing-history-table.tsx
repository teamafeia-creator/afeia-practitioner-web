// components/billing/billing-history-table.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { BillingHistoryEvent } from '@/lib/billing/types';
import { formatRelativeDate, getBillingEventLabel } from '@/lib/billing/utils';
import { cn } from '@/lib/cn';

interface BillingHistoryTableProps {
  events: BillingHistoryEvent[];
}

function EventIcon({ eventType }: { eventType: BillingHistoryEvent['event_type'] }) {
  const iconClass = 'h-5 w-5';

  switch (eventType) {
    case 'subscription_created':
      return (
        <svg className={cn(iconClass, 'text-sage')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      );
    case 'subscription_updated':
      return (
        <svg className={cn(iconClass, 'text-charcoal')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'subscription_canceled':
      return (
        <svg className={cn(iconClass, 'text-terracotta')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'payment_succeeded':
      return (
        <svg className={cn(iconClass, 'text-sage')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'payment_failed':
      return (
        <svg className={cn(iconClass, 'text-terracotta')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'invoice_created':
      return (
        <svg className={cn(iconClass, 'text-charcoal')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    default:
      return (
        <svg className={cn(iconClass, 'text-charcoal')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

export function BillingHistoryTable({ events }: BillingHistoryTableProps) {
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-charcoal">Aucune activité pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-full bg-cream/80 p-1.5">
                <EventIcon eventType={event.event_type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal">
                  {getBillingEventLabel(event.event_type)}
                </p>
                {event.description && (
                  <p className="text-xs text-charcoal truncate">{event.description}</p>
                )}
                <p className="text-xs text-stone mt-0.5">
                  {formatRelativeDate(event.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
