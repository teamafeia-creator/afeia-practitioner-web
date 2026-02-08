'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { BillingSettingsForm } from './_components/BillingSettingsForm';
import { InvoiceTemplatesManager } from './_components/InvoiceTemplatesManager';
import { Button } from '@/components/ui/Button';
import { Toaster } from '@/components/ui/Toaster';
import { supabase } from '@/lib/supabase';
import type { PractitionerBillingSettings, InvoiceTemplate } from '@/lib/invoicing/types';
import { ArrowLeft, CreditCard, Bell } from 'lucide-react';
import Link from 'next/link';

export default function FacturationSettingsPage() {
  const [settings, setSettings] = useState<PractitionerBillingSettings | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setAuthToken(token);

      const [settingsRes, templatesRes] = await Promise.all([
        fetch('/api/invoicing/settings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/invoicing/templates', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Parametres facturation" />
        <div className="glass-card rounded-lg p-8 text-center text-warmgray">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <PageHeader
        title="Parametres facturation"
        subtitle="Configurez vos informations legales et vos templates de facturation"
        actions={
          <Link href="/facturation">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Retour facturation
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BillingSettingsForm
          settings={settings}
          authToken={authToken}
          onSaved={fetchData}
        />
        <InvoiceTemplatesManager
          templates={templates}
          authToken={authToken}
          onRefresh={fetchData}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/settings/facturation/stripe" className="block">
          <div className="glass-card rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer border border-teal/10">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal/10 p-2">
                <CreditCard className="h-5 w-5 text-teal" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-charcoal">
                  Paiement en ligne
                </h3>
                <p className="text-xs text-warmgray">
                  Connecter Stripe pour recevoir des paiements
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/settings/facturation/relances" className="block">
          <div className="glass-card rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer border border-teal/10">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal/10 p-2">
                <Bell className="h-5 w-5 text-teal" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-charcoal">
                  Relances automatiques
                </h3>
                <p className="text-xs text-warmgray">
                  Configurer les rappels pour les factures impayees
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
