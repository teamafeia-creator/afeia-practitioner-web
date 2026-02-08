'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { HealthScoreBadge } from '@/components/admin/HealthScoreBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';
import { useDeletePractitioner } from '@/hooks/useAdmin';
import { Spinner } from '@/components/ui/Spinner';
import { Trash2, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

type PractitionerRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string | null;
  subscription_status: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

type SortField = 'created_at' | 'full_name' | 'status';

type InviteFormState = {
  email: string;
  full_name: string;
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Jamais';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "A l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 30) return `Il y a ${diffDays}j`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
  const diffYears = Math.floor(diffDays / 365);
  return `Il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
}

function approximateHealthScore(lastLoginAt: string | null): { score: number; color: 'green' | 'yellow' | 'red' } {
  if (!lastLoginAt) return { score: 20, color: 'red' };
  const daysSince = Math.floor(
    (Date.now() - new Date(lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince <= 7) return { score: 80, color: 'green' };
  if (daysSince <= 14) return { score: 55, color: 'yellow' };
  if (daysSince <= 30) return { score: 40, color: 'yellow' };
  return { score: 20, color: 'red' };
}

function daysSinceLogin(lastLoginAt: string | null): number | null {
  if (!lastLoginAt) return null;
  return Math.floor(
    (Date.now() - new Date(lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function AdminPractitionersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PractitionerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: '',
    full_name: '',
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [practitionerToDelete, setPractitionerToDelete] = useState<PractitionerRow | null>(null);
  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  const deletePractitionerMutation = useDeletePractitioner();

  const filteredRows = useMemo(() => {
    if (!healthFilter) return rows;
    return rows.filter((row) => {
      const { color } = approximateHealthScore(row.last_login_at);
      return color === healthFilter;
    });
  }, [rows, healthFilter]);

  const handleDeletePractitioner = async () => {
    if (!practitionerToDelete) return;

    try {
      await deletePractitionerMutation.mutateAsync(practitionerToDelete.id);
      showToast.success('Le praticien a bien ete supprime.');
      setDeleteModalOpen(false);
      setPractitionerToDelete(null);
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression.');
    }
  };

  const openDeleteModal = (practitioner: PractitionerRow) => {
    setPractitionerToDelete(practitioner);
    setDeleteModalOpen(true);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadPractitioners() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          sortField,
          sortDirection,
        });

        if (statusFilter) {
          params.set('status', statusFilter);
        }

        if (planFilter) {
          params.set('plan', planFilter);
        }

        if (search.trim()) {
          params.set('search', search.trim());
        }

        const response = await fetch(`/api/admin/practitioners?${params.toString()}`, {
          credentials: 'include',
        });

        if (!isMounted) return;

        if (!response.ok) {
          showToast.error('Erreur lors du chargement des praticiens.');
          setRows([]);
          setTotal(0);
          setLoadError('Erreur de chargement.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setRows(data.practitioners ?? []);
        setTotal(data.total ?? 0);
        setLoadError(null);
      } catch (err) {
        console.error('[admin] loadPractitioners error:', err);
        if (!isMounted) return;
        showToast.error('Erreur reseau lors du chargement des praticiens.');
        setRows([]);
        setTotal(0);
        setLoadError('Erreur de chargement.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPractitioners();

    return () => {
      isMounted = false;
    };
  }, [page, refreshKey, search, sortField, sortDirection, statusFilter, planFilter]);

  async function handleInvite() {
    if (!inviteForm.email.trim()) return;

    const response = await fetch('/api/admin/invite-practitioner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(inviteForm),
    });

    if (!response.ok) {
      showToast.error("Erreur lors de l'invitation.");
      return;
    }

    showToast.success('Invitation envoyee.');
    setInviteOpen(false);
    setInviteForm({ email: '', full_name: '' });
    setPage(1);
    setRefreshKey((value) => value + 1);
  }

  function exportCsv() {
    const headers = ['full_name', 'email', 'status', 'subscription_status', 'created_at', 'last_login_at'];
    const lines = rows.map((row) =>
      [
        row.full_name ?? '',
        row.email ?? '',
        row.status ?? '',
        row.subscription_status ?? '',
        row.created_at ?? '',
        row.last_login_at ?? '',
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'practitioners.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Praticiens"
        subtitle="Liste des praticiens et statut de la plateforme."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              Exporter CSV
            </Button>
            <Button onClick={() => setInviteOpen(true)}>Inviter un praticien</Button>
          </>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-500">Recherche</label>
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nom ou email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Statut</label>
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Plan</label>
            <Select
              value={planFilter}
              onChange={(event) => {
                setPlanFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous</option>
              <option value="active">Actif</option>
              <option value="past_due">En retard</option>
              <option value="canceled">Annule</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Sante</label>
            <Select
              value={healthFilter}
              onChange={(event) => {
                setHealthFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous</option>
              <option value="green">Vert</option>
              <option value="yellow">Jaune</option>
              <option value="red">Rouge</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Tri</label>
            <Select
              value={sortField}
              onChange={(event) => setSortField(event.target.value as SortField)}
            >
              <option value="created_at">Date</option>
              <option value="full_name">Nom</option>
              <option value="status">Statut</option>
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
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="py-2 px-3">Nom</th>
              <th className="py-2 px-3">Statut</th>
              <th className="py-2 px-3">Abonnement</th>
              <th className="py-2 px-3">Sante</th>
              <th className="py-2 px-3">Derniere connexion</th>
              <th className="py-2 px-3">Cree le</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Spinner size="sm" />
                    Chargement...
                  </div>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                  {loadError ? 'Erreur de chargement.' : 'Aucun praticien trouve.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const health = approximateHealthScore(row.last_login_at);
                const loginDays = daysSinceLogin(row.last_login_at);
                const isStale = loginDays !== null && loginDays > 14;

                return (
                  <tr key={row.id} className="text-slate-800 hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {row.full_name ?? '\u2014'}
                        </span>
                        <span className="text-xs text-slate-400">{row.email}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={
                          row.status === 'suspended'
                            ? 'inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
                            : 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                        }
                      >
                        {row.status === 'suspended' ? 'Suspendu' : 'Actif'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {row.subscription_status ?? '\u2014'}
                    </td>
                    <td className="py-2 px-3">
                      <HealthScoreBadge score={health.score} color={health.color} />
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={
                          isStale
                            ? 'text-red-600 font-medium'
                            : 'text-slate-600'
                        }
                      >
                        {formatRelativeTime(row.last_login_at)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleDateString('fr-FR')
                        : '\u2014'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-slate-800"
                          onClick={() => router.push(`/admin/practitioners/${row.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => openDeleteModal(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
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

      {/* Invite Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Inviter un praticien"
        description="L'invitation cree un compte et envoie un email de connexion."
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Email</label>
            <Input
              value={inviteForm.email}
              onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Nom complet</label>
            <Input
              value={inviteForm.full_name}
              onChange={(event) => setInviteForm({ ...inviteForm, full_name: event.target.value })}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setInviteOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleInvite}>Envoyer</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer le praticien"
        description="Cette action est irreversible. Le compte praticien et toutes ses donnees seront supprimes."
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Etes-vous sur de vouloir supprimer le praticien{' '}
            <strong className="text-slate-800">
              {practitionerToDelete?.full_name || practitionerToDelete?.email}
            </strong>{' '}
            ?
          </p>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">
              Attention : Cette action supprimera egalement tous les consultants associes a ce
              praticien.
            </p>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleDeletePractitioner}
            loading={deletePractitionerMutation.isPending}
          >
            {deletePractitionerMutation.isPending ? 'Suppression...' : 'Supprimer'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
