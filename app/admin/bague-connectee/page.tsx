'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toaster';
import { AdminBackBar } from '@/components/admin/AdminBackBar';

const PAGE_SIZE = 10;

type BagueConnecteeRow = {
  id: string;
  full_name: string;
  email: string | null;
  practitioner_id: string;
  bague_connectee_enabled: boolean | null;
  last_bague_connectee_sync_at: string | null;
  last_bague_connectee_sync_status: string | null;
  practitioners_public?: {
    full_name: string | null;
  }[] | { full_name: string | null } | null;
};

export default function AdminBagueConnecteePage() {
  const [rows, setRows] = useState<BagueConnecteeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadBagueConnectee = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE)
      });

      const response = await fetch(`/api/admin/bague-connectee?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        showToast.error('Erreur lors du chargement bague connectée.');
        setRows([]);
        setTotal(0);
        return;
      }

      const data = await response.json();
      setRows(data.consultants ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('[admin] loadBagueConnectee error:', err);
      showToast.error('Erreur réseau lors du chargement bague connectée.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadBagueConnectee();
  }, [loadBagueConnectee]);

  async function triggerSync(consultantId: string) {
    try {
      const response = await fetch('/api/admin/bague-connectee-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ consultant_id: consultantId })
      });

      if (!response.ok) {
        showToast.error('Erreur lors du sync.');
        return;
      }

      showToast.success('Sync lance.');
      loadBagueConnectee();
    } catch (err) {
      console.error('[admin] triggerSync error:', err);
      showToast.error('Erreur réseau lors du sync.');
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <AdminBackBar />
      <PageHeader title="Bague connectée" subtitle="Consultants activés et synchronisation manuelle." />

      <AdminDataTable
        rows={rows}
        isLoading={loading}
        emptyMessage="Aucun consultant avec bague connectée activée."
        columns={[
          {
            key: 'consultant',
            header: 'Consultant',
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
            render: (row) => {
              const p = Array.isArray(row.practitioners_public)
                ? row.practitioners_public[0]
                : row.practitioners_public;
              return p?.full_name ?? '—';
            }
          },
          {
            key: 'last_sync',
            header: 'Derniere sync',
            render: (row) =>
              row.last_bague_connectee_sync_at
                ? new Date(row.last_bague_connectee_sync_at).toLocaleString('fr-FR')
                : 'Jamais'
          },
          {
            key: 'status',
            header: 'Statut',
            render: (row) => row.last_bague_connectee_sync_status ?? '—'
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
