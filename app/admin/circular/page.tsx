'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toaster';

const PAGE_SIZE = 10;

type CircularRow = {
  id: string;
  full_name: string;
  email: string | null;
  practitioner_id: string;
  circular_enabled: boolean | null;
  last_circular_sync_at: string | null;
  last_circular_sync_status: string | null;
  practitioners_public?: {
    full_name: string | null;
  } | null;
};

export default function AdminCircularPage() {
  const [rows, setRows] = useState<CircularRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadCircular() {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from('patients_identity')
      .select('id, full_name, email, practitioner_id, circular_enabled, last_circular_sync_at, last_circular_sync_status, practitioners_public(full_name)', {
        count: 'exact'
      })
      .eq('circular_enabled', true)
      .order('last_circular_sync_at', { ascending: false })
      .range(from, to);

    if (error) {
      showToast.error('Erreur lors du chargement Circular.');
    }

    setRows(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    loadCircular();
  }, [page]);

  async function triggerSync(patientId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      showToast.error('Session invalide.');
      return;
    }

    const response = await fetch('/api/admin/circular-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ patient_id: patientId })
    });

    if (!response.ok) {
      showToast.error('Erreur lors du sync.');
      return;
    }

    showToast.success('Sync lance.');
    loadCircular();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circular"
        subtitle="Patients actives et synchronisation manuelle."
      />

      <AdminDataTable
        rows={rows}
        isLoading={loading}
        emptyMessage="Aucun patient active Circular."
        columns={[
          {
            key: 'patient',
            header: 'Patient',
            render: (row) => (
              <div className="flex flex-col">
                <span className="font-medium text-charcoal">{row.full_name}</span>
                <span className="text-xs text-warmgray">{row.email}</span>
              </div>
            )
          },
          {
            key: 'practitioner',
            header: 'Praticien',
            render: (row) => row.practitioners_public?.full_name ?? '—'
          },
          {
            key: 'last_sync',
            header: 'Derniere sync',
            render: (row) =>
              row.last_circular_sync_at
                ? new Date(row.last_circular_sync_at).toLocaleString('fr-FR')
                : 'Jamais'
          },
          {
            key: 'status',
            header: 'Statut',
            render: (row) => row.last_circular_sync_status ?? '—'
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
              <Button variant="outline" size="sm" onClick={() => triggerSync(row.id)}>
                Sync now
              </Button>
            )
          }
        ]}
        footer={
          <div className="flex w-full items-center justify-between text-sm text-warmgray">
            <span>
              Page {page} / {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Precedent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
