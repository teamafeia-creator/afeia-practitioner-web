'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { BillingSettingsForm } from './_components/BillingSettingsForm';
import { InvoiceTemplatesManager } from './_components/InvoiceTemplatesManager';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { PractitionerBillingSettings, InvoiceTemplate } from '@/lib/invoicing/types';
import { ArrowLeft } from 'lucide-react';
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
    </div>
  );
}
