'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatDate } from '@/lib/invoicing/utils';
import type { InvoiceHistory } from '@/lib/invoicing/types';
import {
  Plus,
  FileText,
  Check,
  X,
  Send,
  Edit3,
} from 'lucide-react';

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  created: { label: 'Facture creee', icon: Plus, color: 'text-sage' },
  issued: { label: 'Facture emise', icon: FileText, color: 'text-terracotta' },
  paid: { label: 'Paiement enregistre', icon: Check, color: 'text-sage' },
  cancelled: { label: 'Facture annulee', icon: X, color: 'text-accent-danger' },
  sent: { label: 'Email envoye', icon: Send, color: 'text-sage' },
  updated: { label: 'Facture modifiee', icon: Edit3, color: 'text-stone' },
};

interface Props {
  history: InvoiceHistory[];
}

export function InvoiceHistoryTimeline({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => {
            const config = ACTION_CONFIG[entry.action] || {
              label: entry.action,
              icon: FileText,
              color: 'text-stone',
            };
            const Icon = config.icon;

            return (
              <div key={entry.id} className="flex gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50 shrink-0 ${config.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal">
                    {config.label}
                  </p>
                  <p className="text-xs text-stone">
                    {formatDate(entry.created_at)}
                  </p>
                  {entry.metadata && entry.action === 'sent' && (
                    <p className="text-xs text-stone mt-0.5">
                      Envoye a {(entry.metadata as Record<string, string>).email}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
