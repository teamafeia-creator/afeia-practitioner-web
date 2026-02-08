'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { PractitionerBillingSettings, InvoiceTemplate } from '@/lib/invoicing/types';

export function useBillingSettings() {
  const [settings, setSettings] = useState<PractitionerBillingSettings | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Non authentifie');
        return;
      }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, templates, loading, error, refetch: fetchSettings, getToken };
}
