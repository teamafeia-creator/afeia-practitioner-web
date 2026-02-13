// components/billing/invoice-list.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { InvoiceRow } from './invoice-row';
import type { Invoice } from '@/lib/billing/types';

interface InvoiceListProps {
  invoices: Invoice[];
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-charcoal">Aucune facture pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Factures récentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-divider text-left text-xs font-medium uppercase tracking-wider text-charcoal">
                <th className="pb-3 pr-4">Numéro</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Montant</th>
                <th className="pb-3 pr-4">Statut</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
