'use client';

import { useState, useCallback, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { InvoiceStatsDisplay } from './_components/InvoiceStats';
import { InvoiceFilters } from './_components/InvoiceFilters';
import { InvoiceList } from './_components/InvoiceList';
import { InvoiceModal } from '@/components/invoicing/InvoiceModal';
import { useInvoiceStats } from '@/hooks/use-invoice-stats';
import { supabase } from '@/lib/supabase';
import type { ConsultationInvoice, InvoiceTemplate, PractitionerBillingSettings } from '@/lib/invoicing/types';
import { Toaster } from '@/components/ui/Toaster';
import { Plus, Settings } from 'lucide-react';
import Link from 'next/link';

export default function FacturationPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [settings, setSettings] = useState<PractitionerBillingSettings | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [authToken, setAuthToken] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { stats, loading: statsLoading, refetch: refetchStats } = useInvoiceStats();

  const fetchData = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setAuthToken(token);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const [invoicesRes, settingsRes, templatesRes] = await Promise.all([
        fetch(`/api/invoicing/list?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/invoicing/settings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/invoicing/templates', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data.invoices);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates);
      }
    } finally {
      setInvoicesLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleRefresh() {
    fetchData();
    refetchStats();
  }

  const settingsConfigured = !!settings;

  return (
    <div className="space-y-6">
      <Toaster />
      <PageHeader
        title="Facturation"
        subtitle="Gerez vos factures et suivez votre chiffre d'affaires"
        actions={
          <div className="flex gap-2">
            <Link href="/settings/facturation">
              <Button
                variant="ghost"
                size="sm"
                icon={<Settings className="h-4 w-4" />}
              >
                Parametres
              </Button>
            </Link>
            {settingsConfigured && (
              <Button
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                Nouvelle facture
              </Button>
            )}
          </div>
        }
      />

      {!settingsConfigured && !invoicesLoading && (
        <div className="glass-card rounded-lg p-6 text-center">
          <Settings className="h-10 w-10 text-warmgray/50 mx-auto mb-3" />
          <h3 className="font-medium text-charcoal mb-1">
            Configurez votre facturation
          </h3>
          <p className="text-sm text-warmgray mb-4">
            Renseignez votre SIRET et vos informations legales pour commencer a
            facturer.
          </p>
          <Link href="/settings/facturation">
            <Button size="sm">Configurer</Button>
          </Link>
        </div>
      )}

      {settingsConfigured && (
        <>
          <InvoiceStatsDisplay stats={stats} loading={statsLoading} />

          <InvoiceFilters
            currentFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />

          <InvoiceList invoices={invoices} loading={invoicesLoading} />
        </>
      )}

      {showCreateModal && (
        <InvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleRefresh}
          consultantId=""
          consultantName=""
          templates={templates}
          authToken={authToken}
        />
      )}
    </div>
  );
}
