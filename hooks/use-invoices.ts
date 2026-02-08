'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ConsultationInvoice } from '@/lib/invoicing/types';

export function useInvoices(filters?: {
  status?: string;
  consultant_id?: string;
  limit?: number;
}) {
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError('Non authentifie');
        return;
      }

      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.consultant_id) params.set('consultant_id', filters.consultant_id);
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await fetch(`/api/invoicing/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setInvoices(data.invoices);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.consultant_id, filters?.limit]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return { invoices, total, loading, error, refetch: fetchInvoices };
}
