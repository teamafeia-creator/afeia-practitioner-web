'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { InvoiceStatsDisplay } from './_components/InvoiceStats';
import { InvoiceFilters } from './_components/InvoiceFilters';
import { InvoiceList } from './_components/InvoiceList';
import { InvoiceModal } from '@/components/invoicing/InvoiceModal';
import { useInvoiceStats } from '@/hooks/use-invoice-stats';
import { supabase } from '@/lib/supabase';
import type { ConsultationInvoice, InvoiceTemplate, PractitionerBillingSettings } from '@/lib/invoicing/types';
import { Toaster, showToast } from '@/components/ui/Toaster';
import { Plus, Settings, Download, FileText, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default function FacturationPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [settings, setSettings] = useState<PractitionerBillingSettings | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [authToken, setAuthToken] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
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

  // Fermer le menu export quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleRefresh() {
    fetchData();
    refetchStats();
  }

  async function handleExportCSV(period: string) {
    setShowExportMenu(false);
    try {
      const response = await fetch(`/api/invoicing/export/csv?period=${period}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Erreur export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factures_${period}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast.error("Erreur lors de l'export CSV");
    }
  }

  async function handleExportPDF(period: string) {
    setShowExportMenu(false);
    try {
      const response = await fetch(`/api/invoicing/export/pdf-summary?period=${period}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Erreur export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recapitulatif_${period}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast.error("Erreur lors de l'export PDF");
    }
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
            {settingsConfigured && (
              <div className="relative" ref={exportMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  Exporter
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-teal/10 py-1 z-50">
                    <div className="px-3 py-1.5 text-xs font-medium text-warmgray uppercase tracking-wider">
                      CSV
                    </div>
                    <button
                      onClick={() => handleExportCSV('month')}
                      className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-teal/5 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-warmgray" />
                      Mois en cours
                    </button>
                    <button
                      onClick={() => handleExportCSV('quarter')}
                      className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-teal/5 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-warmgray" />
                      Trimestre
                    </button>
                    <button
                      onClick={() => handleExportCSV('year')}
                      className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-teal/5 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-warmgray" />
                      Annee
                    </button>
                    <div className="border-t border-teal/10 my-1" />
                    <div className="px-3 py-1.5 text-xs font-medium text-warmgray uppercase tracking-wider">
                      Recapitulatif PDF
                    </div>
                    <button
                      onClick={() => handleExportPDF('month')}
                      className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-teal/5 flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-warmgray" />
                      Mensuel
                    </button>
                    <button
                      onClick={() => handleExportPDF('quarter')}
                      className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-teal/5 flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-warmgray" />
                      Trimestriel
                    </button>
                    <button
                      onClick={() => handleExportPDF('year')}
                      className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-teal/5 flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-warmgray" />
                      Annuel
                    </button>
                  </div>
                )}
              </div>
            )}
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
