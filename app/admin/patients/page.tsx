'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Smartphone,
  Radio,
  Clock,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { PatientActivationBadge } from '@/components/admin/PatientActivationBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

const PAGE_SIZE = 20;

type PatientRow = {
  id: string;
  practitioner_id: string | null;
  full_name: string;
  email: string | null;
  status: string;
  is_premium: boolean;
  activated: boolean;
  activated_at: string | null;
  circular_enabled: boolean;
  last_circular_sync_at: string | null;
  created_at: string;
  updated_at: string | null;
  practitioner_name: string | null;
  invitation_code: string | null;
  activation_status: 'activated' | 'pending' | 'expired';
  journal_entries_count: number;
  messages_count: number;
};

type PatientMetrics = {
  totalPatients: number;
  premiumCount: number;
  circularCount: number;
  pendingActivation: number;
};

type PractitionerOption = {
  id: string;
  full_name: string | null;
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '—';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "A l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 30) return `il y a ${diffDays}j`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `il y a ${diffMonths} mois`;
  return `il y a ${Math.floor(diffDays / 365)} an(s)`;
}

export default function AdminPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [metrics, setMetrics] = useState<PatientMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activationFilter, setActivationFilter] = useState('');
  const [circularFilter, setCircularFilter] = useState('');
  const [practitionerFilter, setPractitionerFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [practitioners, setPractitioners] = useState<PractitionerOption[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  // Load practitioners for filter dropdown
  useEffect(() => {
    async function loadPractitioners() {
      try {
        const response = await fetch('/api/admin/practitioners?pageSize=200', {
          credentials: 'include',
        });
        if (!response.ok) return;
        const data = await response.json();
        setPractitioners(
          (data.practitioners ?? []).map((p: { id: string; full_name: string | null }) => ({
            id: p.id,
            full_name: p.full_name,
          }))
        );
      } catch {
        // Ignore
      }
    }
    loadPractitioners();
  }, []);

  // Load patients
  useEffect(() => {
    let isMounted = true;

    async function loadPatients() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          sortField,
          sortDirection,
        });

        if (search.trim()) params.set('search', search.trim());
        if (statusFilter) params.set('status', statusFilter);
        if (activationFilter) params.set('activation', activationFilter);
        if (circularFilter) params.set('circular', circularFilter);
        if (practitionerFilter) params.set('practitioner', practitionerFilter);

        const response = await fetch(`/api/admin/patients?${params.toString()}`, {
          credentials: 'include',
        });

        if (!isMounted) return;

        if (!response.ok) {
          setPatients([]);
          setTotal(0);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setPatients(data.patients ?? []);
        setTotal(data.total ?? 0);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error('[admin] loadPatients error:', err);
        if (isMounted) {
          setPatients([]);
          setTotal(0);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPatients();
    return () => { isMounted = false; };
  }, [page, search, sortField, sortDirection, statusFilter, activationFilter, circularFilter, practitionerFilter]);

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Ignore
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Patients"
        subtitle="Vue transversale de tous les patients de la plateforme."
      />

      {/* Metric cards */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            icon={Users}
            label="Patients total"
            value={metrics.totalPatients}
            subtext={`dont ${metrics.premiumCount} premium`}
            accentColor="teal"
          />
          <AdminMetricCard
            icon={Smartphone}
            label="App mobile installee"
            value="—"
            subtext="Donnees non disponibles"
            accentColor="blue"
          />
          <AdminMetricCard
            icon={Radio}
            label="Circular connecte"
            value={metrics.circularCount}
            subtext={metrics.premiumCount > 0
              ? `${Math.round((metrics.circularCount / metrics.premiumCount) * 100)}% des premium`
              : '—'}
            accentColor="emerald"
          />
          <div className="relative">
            <AdminMetricCard
              icon={Clock}
              label="En attente d'activation"
              value={metrics.pendingActivation}
              accentColor={metrics.pendingActivation > 0 ? 'red' : 'teal'}
            />
            {metrics.pendingActivation > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {metrics.pendingActivation}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-7">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-500">Recherche</label>
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom ou email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Praticien</label>
            <Select
              value={practitionerFilter}
              onChange={(e) => { setPractitionerFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous</option>
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Statut</label>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Activation</label>
            <Select
              value={activationFilter}
              onChange={(e) => { setActivationFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous</option>
              <option value="activated">Active</option>
              <option value="pending">En attente</option>
              <option value="expired">Expire</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Circular</label>
            <Select
              value={circularFilter}
              onChange={(e) => { setCircularFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous</option>
              <option value="connected">Connecte</option>
              <option value="disconnected">Non connecte</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Tri</label>
            <Select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="created_at">Date inscription</option>
              <option value="updated_at">Derniere activite</option>
              <option value="full_name">Nom</option>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-xs text-slate-500"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? 'Croissant' : 'Decroissant'}
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2 px-3">Patient</th>
                <th className="py-2 px-3">Praticien</th>
                <th className="py-2 px-3">Statut</th>
                <th className="py-2 px-3">Code d&apos;activation</th>
                <th className="py-2 px-3">Circular</th>
                <th className="py-2 px-3">Journal</th>
                <th className="py-2 px-3">Derniere activite</th>
                <th className="py-2 px-3">Inscrit le</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                      <Spinner size="sm" />
                      Chargement...
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-400">
                    Aucun patient trouve.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="text-slate-800 hover:bg-slate-50">
                    {/* Patient name + email */}
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {patient.full_name}
                        </span>
                        <span className="text-xs text-slate-500">{patient.email ?? '—'}</span>
                      </div>
                    </td>
                    {/* Practitioner */}
                    <td className="py-2 px-3">
                      {patient.practitioner_id ? (
                        <button
                          onClick={() => router.push(`/admin/practitioners/${patient.practitioner_id}`)}
                          className="text-sm text-sage-600 hover:text-sage-700 hover:underline"
                        >
                          {patient.practitioner_name ?? 'Praticien'}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="py-2 px-3">
                      <span
                        className={
                          patient.is_premium
                            ? 'inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700'
                            : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                        }
                      >
                        {patient.is_premium ? 'Premium' : 'Standard'}
                      </span>
                    </td>
                    {/* Activation code */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        {patient.invitation_code && (
                          <div className="group relative flex items-center gap-1">
                            <code className="text-xs font-mono text-slate-600">
                              {patient.invitation_code}
                            </code>
                            <button
                              onClick={() => handleCopyCode(patient.invitation_code!)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600"
                              title="Copier"
                            >
                              {copiedCode === patient.invitation_code ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )}
                        <PatientActivationBadge status={patient.activation_status} />
                      </div>
                    </td>
                    {/* Circular */}
                    <td className="py-2 px-3">
                      {patient.circular_enabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Connecte
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Non</span>
                      )}
                    </td>
                    {/* Journal */}
                    <td className="py-2 px-3 text-slate-600">
                      {patient.journal_entries_count > 0
                        ? `${patient.journal_entries_count} entrees`
                        : '—'}
                    </td>
                    {/* Last activity */}
                    <td className="py-2 px-3 text-slate-600">
                      {formatRelativeTime(patient.updated_at)}
                    </td>
                    {/* Created at */}
                    <td className="py-2 px-3 text-slate-600">
                      {new Date(patient.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-800"
                        onClick={() => router.push(`/admin/patients/${patient.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} / {totalPages || 1} — {total} patient(s)
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
    </div>
  );
}
