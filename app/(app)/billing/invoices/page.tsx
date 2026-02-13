// app/(app)/billing/invoices/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInvoices, downloadInvoice } from '@/lib/billing/api';
import type { Invoice } from '@/lib/billing/types';
import {
  formatPrice,
  formatDate,
  getInvoiceStatusLabel,
  getInvoiceStatusVariant,
} from '@/lib/billing/utils';

function InvoiceCard({ invoice }: { invoice: Invoice }) {
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
    <div className="flex items-center gap-4 p-4 bg-cream/60 rounded-xl">
      {/* Icône */}
      <div className="shrink-0 p-2 bg-white rounded-lg shadow-sm">
        <svg
          className="h-6 w-6 text-charcoal"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-charcoal">{invoice.invoice_number}</p>
          <Badge variant={getInvoiceStatusVariant(invoice.status)}>
            {getInvoiceStatusLabel(invoice.status)}
          </Badge>
        </div>
        <p className="text-sm text-charcoal">{formatDate(invoice.invoice_date)}</p>
        {invoice.description && (
          <p className="text-xs text-stone truncate">{invoice.description}</p>
        )}
      </div>

      {/* Montant */}
      <div className="text-right shrink-0">
        <p className="font-medium text-charcoal">
          {formatPrice(invoice.amount_total, invoice.currency)}
        </p>
        {invoice.amount_tax > 0 && (
          <p className="text-xs text-charcoal">
            dont TVA: {formatPrice(invoice.amount_tax, invoice.currency)}
          </p>
        )}
      </div>

      {/* Action */}
      {invoice.status === 'paid' && (
        <Button
          variant="ghost"
          onClick={handleDownload}
          loading={downloading}
          className="shrink-0"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </Button>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const data = await getInvoices(50);
        setInvoices(data);
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  // Grouper les factures par année
  const invoicesByYear = invoices.reduce((acc, invoice) => {
    const year = new Date(invoice.invoice_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(invoice);
    return acc;
  }, {} as Record<number, Invoice[]>);

  const years = Object.keys(invoicesByYear)
    .map(Number)
    .sort((a, b) => b - a);

  // Calculer les statistiques
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount_total, 0);

  const currentYearInvoices = invoicesByYear[new Date().getFullYear()] || [];
  const currentYearTotal = currentYearInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount_total, 0);

  if (loading) {
    return (
      <PageShell>
        <PageHeader
          title="Historique des factures"
        />
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-cream/80 rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Historique des factures"
        subtitle="Consultez et téléchargez toutes vos factures"
      />

      {invoices.length === 0 ? (
        <EmptyState
          title="Aucune facture"
          description="Vous n'avez pas encore de factures. Elles apparaîtront ici après votre premier paiement."
        />
      ) : (
        <>
          {/* Statistiques */}
          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-charcoal">Total payé (cette année)</p>
                <p className="text-2xl font-bold text-charcoal">
                  {formatPrice(currentYearTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-charcoal">Total payé (tout temps)</p>
                <p className="text-2xl font-bold text-charcoal">
                  {formatPrice(totalPaid)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Factures par année */}
          {years.map((year) => (
            <Card key={year} className="mb-6">
              <CardHeader>
                <CardTitle>{year}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoicesByYear[year].map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </PageShell>
  );
}
