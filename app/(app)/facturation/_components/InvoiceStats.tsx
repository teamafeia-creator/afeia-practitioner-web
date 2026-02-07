'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/invoicing/utils';
import type { InvoiceStats } from '@/lib/invoicing/types';
import { TrendingUp, Receipt, Clock, Calculator } from 'lucide-react';

interface Props {
  stats: InvoiceStats | null;
  loading: boolean;
}

export function InvoiceStatsDisplay({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent>
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-neutral-200 rounded w-20" />
                <div className="h-6 bg-neutral-200 rounded w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'CA du mois',
      value: formatCurrency(stats.ca_mois),
      icon: TrendingUp,
      color: 'text-teal',
      bg: 'bg-teal/10',
    },
    {
      label: 'CA annuel',
      value: formatCurrency(stats.ca_annee),
      icon: Calculator,
      color: 'text-aubergine',
      bg: 'bg-aubergine/10',
    },
    {
      label: 'Factures payees',
      value: String(stats.nb_factures_payees),
      icon: Receipt,
      color: 'text-sage',
      bg: 'bg-sage/10',
    },
    {
      label: 'En attente',
      value: formatCurrency(stats.montant_en_attente),
      icon: Clock,
      color: 'text-gold',
      bg: 'bg-gold/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}
                >
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-warmgray">{item.label}</p>
                  <p className="text-lg font-semibold text-charcoal">
                    {item.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
