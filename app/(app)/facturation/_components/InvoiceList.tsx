'use client';

import Link from 'next/link';
import { InvoiceStatusBadge } from '@/components/invoicing/InvoiceStatusBadge';
import { PaymentMethodBadge } from '@/components/invoicing/PaymentMethodBadge';
import { InvoiceNumberDisplay } from '@/components/invoicing/InvoiceNumberDisplay';
import { formatCurrency, formatDateShort } from '@/lib/invoicing/utils';
import type { ConsultationInvoice } from '@/lib/invoicing/types';
import { FileText } from 'lucide-react';

interface Props {
  invoices: ConsultationInvoice[];
  loading: boolean;
}

export function InvoiceList({ invoices, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="p-8 text-center text-stone">Chargement...</div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="p-12 text-center">
          <FileText className="h-12 w-12 text-stone/40 mx-auto mb-4" />
          <p className="text-stone text-sm">Aucune facture</p>
          <p className="text-stone/70 text-xs mt-1">
            Les factures apparaitront ici une fois creees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left">
              <th className="px-4 py-3 font-medium text-stone text-xs uppercase tracking-wide">
                Numero
              </th>
              <th className="px-4 py-3 font-medium text-stone text-xs uppercase tracking-wide">
                Consultant
              </th>
              <th className="px-4 py-3 font-medium text-stone text-xs uppercase tracking-wide">
                Description
              </th>
              <th className="px-4 py-3 font-medium text-stone text-xs uppercase tracking-wide text-right">
                Montant
              </th>
              <th className="px-4 py-3 font-medium text-stone text-xs uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 font-medium text-stone text-xs uppercase tracking-wide">
                Paiement
              </th>
              <th className="px-4 py-3 font-medium text-stone text-xs uppercase tracking-wide">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-neutral-50 hover:bg-sage-light/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/facturation/${invoice.id}`}
                    className="hover:text-sage transition-colors"
                  >
                    <InvoiceNumberDisplay numero={invoice.numero} />
                  </Link>
                </td>
                <td className="px-4 py-3 text-charcoal">
                  {invoice.consultant_snapshot.prenom}{' '}
                  {invoice.consultant_snapshot.nom}
                </td>
                <td className="px-4 py-3 text-stone max-w-[200px] truncate">
                  {invoice.description}
                </td>
                <td className="px-4 py-3 text-right font-medium text-charcoal">
                  {formatCurrency(invoice.montant)}
                </td>
                <td className="px-4 py-3 text-stone">
                  {formatDateShort(
                    invoice.date_emission || invoice.created_at
                  )}
                </td>
                <td className="px-4 py-3">
                  <PaymentMethodBadge method={invoice.payment_method} />
                </td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
