'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { InvoiceStatusBadge } from '@/components/invoicing/InvoiceStatusBadge';
import { PaymentMethodBadge } from '@/components/invoicing/PaymentMethodBadge';
import { InvoiceNumberDisplay } from '@/components/invoicing/InvoiceNumberDisplay';
import { formatCurrency, formatDate } from '@/lib/invoicing/utils';
import type { ConsultationInvoice } from '@/lib/invoicing/types';

interface Props {
  invoice: ConsultationInvoice;
}

export function InvoiceDetail({ invoice }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Informations generales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-stone">Numero</dt>
              <dd>
                <InvoiceNumberDisplay numero={invoice.numero} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone">Statut</dt>
              <dd>
                <InvoiceStatusBadge status={invoice.status} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone">Date emission</dt>
              <dd className="text-sm text-charcoal">
                {formatDate(invoice.date_emission)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone">Description</dt>
              <dd className="text-sm text-charcoal text-right max-w-[200px]">
                {invoice.description}
              </dd>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-3">
              <dt className="text-sm font-medium text-charcoal">Montant</dt>
              <dd className="text-lg font-semibold text-charcoal">
                {formatCurrency(invoice.montant)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Paiement */}
      <Card>
        <CardHeader>
          <CardTitle>Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-stone">Moyen de paiement</dt>
              <dd>
                <PaymentMethodBadge method={invoice.payment_method} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone">Date de paiement</dt>
              <dd className="text-sm text-charcoal">
                {formatDate(invoice.payment_date)}
              </dd>
            </div>
            {invoice.payment_notes && (
              <div>
                <dt className="text-sm text-stone mb-1">Notes</dt>
                <dd className="text-sm text-charcoal bg-neutral-50 rounded p-2">
                  {invoice.payment_notes}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Praticien */}
      <Card>
        <CardHeader>
          <CardTitle>Praticien</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <dd className="text-sm font-medium text-charcoal">
              {invoice.practitioner_snapshot.prenom}{' '}
              {invoice.practitioner_snapshot.nom}
            </dd>
            <dd className="text-sm text-stone">
              {invoice.practitioner_snapshot.adresse}
            </dd>
            <dd className="text-sm text-stone">
              SIRET : {invoice.practitioner_snapshot.siret}
            </dd>
            <dd className="text-xs text-stone italic">
              {invoice.practitioner_snapshot.mention_tva}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {/* Consultant */}
      <Card>
        <CardHeader>
          <CardTitle>Consultant</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <dd className="text-sm font-medium text-charcoal">
              {invoice.consultant_snapshot.prenom}{' '}
              {invoice.consultant_snapshot.nom}
            </dd>
            <dd className="text-sm text-stone">
              {invoice.consultant_snapshot.email}
            </dd>
            {invoice.consultant_snapshot.adresse && (
              <dd className="text-sm text-stone">
                {invoice.consultant_snapshot.adresse}
              </dd>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
