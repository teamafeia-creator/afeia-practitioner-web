'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toaster';

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

function SyncStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-sm text-slate-400">{'\u2014'}</span>;

  const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    success: {
      className: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: 'Succes',
    },
    error: {
      className: 'bg-red-100 text-red-700',
      icon: <XCircle className="h-3 w-3" />,
      label: 'Erreur',
    },
    pending: {
      className: 'bg-amber-100 text-amber-700',
      icon: <Clock className="h-3 w-3" />,
      label: 'En cours',
    },
    running: {
      className: 'bg-blue-100 text-blue-700',
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      label: 'Sync en cours',
    },
  };

  const c = config[status] ?? {
    className: 'bg-slate-100 text-slate-700',
    icon: null,
    label: status,
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

export default function AdminBagueConnecteePage() {
  const [rows, setRows] = useState<BagueConnecteeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadBagueConnectee = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      const response = await fetch(`/api/admin/bague-connectee?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        showToast.error('Erreur lors du chargement bague connect\u00e9e.');
        setRows([]);
        setTotal(0);
        return;
      }

      const data = await response.json();
      setRows(data.consultants ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('[admin] loadBagueConnectee error:', err);
      showToast.error('Erreur r\u00e9seau lors du chargement bague connect\u00e9e.');
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
    setSyncingId(consultantId);
    try {
      const response = await fetch('/api/admin/bague-connectee-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ consultant_id: consultantId }),
      });

      if (!response.ok) {
        showToast.error('Erreur lors du sync.');
        return;
      }

      showToast.success('Sync lance.');
      loadBagueConnectee();
    } catch (err) {
      console.error('[admin] triggerSync error:', err);
      showToast.error('Erreur r\u00e9seau lors du sync.');
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Bague connect\u00e9e"
        subtitle="Consultants activ\u00e9s et synchronisation manuelle."
      />

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Chargement...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-500">
            <Radio className="mb-2 h-8 w-8 text-slate-300" />
            Aucun consultant avec bague connect{'\u00e9'}e activ{'\u00e9'}e.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Consultant</th>
                    <th className="px-5 py-3">Praticien</th>
                    <th className="px-5 py-3">Derniere sync</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const p = Array.isArray(row.practitioners_public)
                      ? row.practitioners_public[0]
                      : row.practitioners_public;

                    return (
                      <tr key={row.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-800">
                              {row.full_name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {row.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/practitioners/${row.practitioner_id}`}
                            className="group inline-flex items-center gap-1 text-sm text-slate-700 hover:text-teal-700"
                          >
                            {p?.full_name ?? '\u2014'}
                            <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-500">
                          {row.last_bague_connectee_sync_at
                            ? new Date(row.last_bague_connectee_sync_at).toLocaleString('fr-FR')
                            : 'Jamais'}
                        </td>
                        <td className="px-5 py-3">
                          <SyncStatusBadge status={row.last_bague_connectee_sync_status} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            loading={syncingId === row.id}
                            onClick={() => triggerSync(row.id)}
                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                          >
                            Sync now
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <span className="text-sm text-slate-500">
                Page {page} / {totalPages || 1}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
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
          </>
        )}
      </div>
    </div>
  );
}
