'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  'admin.login': 'Connexion admin',
  'practitioner.update': 'Praticien modifie',
  'practitioner.suspend': 'Praticien suspendu',
  'practitioner.delete': 'Praticien supprime',
  'practitioner.password_reset': 'Reset mot de passe',
  'practitioner.invite': 'Invitation envoyee',
  'admin.create': 'Admin ajoute',
  'admin.delete': 'Admin supprime',
  'admin.logout': 'Deconnexion admin',
};

type AuditLog = {
  id: string;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

function formatActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatTarget(log: AuditLog): string {
  if (!log.target_type && !log.target_id) return '\u2014';
  const parts: string[] = [];
  if (log.target_type) parts.push(log.target_type);
  if (log.target_id) parts.push(log.target_id.slice(0, 8));
  return parts.join(' / ');
}

function formatDetailsSummary(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return '\u2014';
  const keys = Object.keys(details);
  if (keys.length <= 2) {
    return keys.map((k) => `${k}: ${String(details[k])}`).join(', ');
  }
  return `${keys.length} champs`;
}

function DetailsExpander({ details }: { details: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);

  if (!details || Object.keys(details).length === 0) {
    return <span className="text-slate-400">{'\u2014'}</span>;
  }

  const entries = Object.entries(details);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-slate-600 transition hover:text-slate-800"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {open ? 'Masquer' : formatDetailsSummary(details)}
      </button>
      {open && (
        <div className="mt-1.5 space-y-0.5 rounded border border-slate-100 bg-slate-50 p-2 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="font-medium text-slate-600">{key}:</span>
              <span className="text-slate-500">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [period, setPeriod] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [targetIdFilter, setTargetIdFilter] = useState('');

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (period) params.set('period', period);
      if (actionFilter) params.set('action', actionFilter);
      if (adminFilter) params.set('admin', adminFilter);
      if (targetIdFilter) params.set('targetId', targetIdFilter);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setLogs([]);
        setTotal(0);
        return;
      }

      const data = await response.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('[admin] loadAuditLogs error:', err);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, period, actionFilter, adminFilter, targetIdFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Journal d'audit"
        subtitle="Historique des actions administratives sur la plateforme."
      />

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Periode
            </label>
            <Select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                handleFilterChange();
              }}
            >
              <option value="">Toutes</option>
              <option value="today">Aujourd&apos;hui</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Action
            </label>
            <Input
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                handleFilterChange();
              }}
              placeholder="ex: practitioner.update"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Admin
            </label>
            <Input
              value={adminFilter}
              onChange={(e) => {
                setAdminFilter(e.target.value);
                handleFilterChange();
              }}
              placeholder="email admin"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              ID cible
            </label>
            <Input
              value={targetIdFilter}
              onChange={(e) => {
                setTargetIdFilter(e.target.value);
                handleFilterChange();
              }}
              placeholder="UUID cible"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Chargement...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-500">
            <FileText className="mb-2 h-8 w-8 text-slate-300" />
            Aucun log pour les filtres selectionnes.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Date/Heure</th>
                    <th className="px-5 py-3">Admin</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Cible</th>
                    <th className="px-5 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-500">
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-800">
                        {log.admin_email}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {formatActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {formatTarget(log)}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <DetailsExpander details={log.details} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <span className="text-sm text-slate-500">
                Page {page} / {totalPages || 1} ({total} resultats)
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
