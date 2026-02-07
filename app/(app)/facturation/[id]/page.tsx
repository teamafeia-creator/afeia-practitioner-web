'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { InvoiceDetail } from './_components/InvoiceDetail';
import { InvoiceActions } from './_components/InvoiceActions';
import { InvoiceHistoryTimeline } from './_components/InvoiceHistoryTimeline';
import { supabase } from '@/lib/supabase';
import type { ConsultationInvoice, InvoiceHistory } from '@/lib/invoicing/types';
import { ArrowLeft } from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<ConsultationInvoice | null>(null);
  const [history, setHistory] = useState<InvoiceHistory[]>([]);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setAuthToken(token);

      const response = await fetch(`/api/invoicing/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Facture introuvable');

      const data = await response.json();
      setInvoice(data.invoice);
      setHistory(data.history);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Chargement..." />
        <div className="glass-card rounded-lg p-8 text-center text-warmgray">
          Chargement de la facture...
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Facture introuvable" />
        <div className="glass-card rounded-lg p-8 text-center text-warmgray">
          Cette facture n&apos;existe pas ou vous n&apos;y avez pas acces.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Facture ${invoice.numero || 'Brouillon'}`}
        subtitle={`${invoice.consultant_snapshot.prenom} ${invoice.consultant_snapshot.nom}`}
        actions={
          <Link href="/facturation">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Retour
            </Button>
          </Link>
        }
      />

      <InvoiceActions
        invoice={invoice}
        authToken={authToken}
        onRefresh={fetchInvoice}
      />

      <InvoiceDetail invoice={invoice} />

      <InvoiceHistoryTimeline history={history} />
    </div>
  );
}
