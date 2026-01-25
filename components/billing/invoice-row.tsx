// components/billing/invoice-row.tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Invoice } from '@/lib/billing/types';
import {
  formatPrice,
  formatShortDate,
  getInvoiceStatusLabel,
  getInvoiceStatusVariant,
} from '@/lib/billing/utils';
import { downloadInvoice } from '@/lib/billing/api';

interface InvoiceRowProps {
  invoice: Invoice;
}

export function InvoiceRow({ invoice }: InvoiceRowProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoice(invoice.id);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <tr className="border-b border-sable/50 last:border-0">
      <td className="py-3 pr-4">
        <span className="font-medium text-charcoal">{invoice.invoice_number}</span>
      </td>
      <td className="py-3 pr-4 text-sm text-marine">
        {formatShortDate(invoice.invoice_date)}
      </td>
      <td className="py-3 pr-4 text-sm font-medium text-charcoal">
        {formatPrice(invoice.amount_total, invoice.currency)}
      </td>
      <td className="py-3 pr-4">
        <Badge variant={getInvoiceStatusVariant(invoice.status)}>
          {getInvoiceStatusLabel(invoice.status)}
        </Badge>
      </td>
      <td className="py-3 text-right">
        {invoice.status === 'paid' && (
          <Button
            variant="ghost"
            onClick={handleDownload}
            loading={downloading}
            className="text-xs"
          >
            {downloading ? 'Téléchargement...' : 'Télécharger'}
          </Button>
        )}
      </td>
    </tr>
  );
}
