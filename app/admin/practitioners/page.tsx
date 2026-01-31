'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toaster';

const PAGE_SIZE = 10;

type PractitionerRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string | null;
  subscription_status: string | null;
  created_at: string | null;
};

type SortField = 'created_at' | 'full_name' | 'status';

type InviteFormState = {
  email: string;
  full_name: string;
  calendly_url: string;
};

export default function AdminPractitionersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PractitionerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: '',
    full_name: '',
    calendly_url: ''
  });
  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  useEffect(() => {
    let isMounted = true;

    async function loadPractitioners() {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('practitioners_public')
        .select('id, email, full_name, status, subscription_status, created_at', { count: 'exact' });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
      }

      query = query.order(sortField, { ascending: sortDirection === 'asc' }).range(from, to);

      const { data, count, error } = await query;

      if (!isMounted) return;

      if (error) {
        showToast.error('Erreur lors du chargement des praticiens.');
      }

      setRows(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    }

    loadPractitioners();

    return () => {
      isMounted = false;
    };
  }, [page, search, sortField, sortDirection, statusFilter]);

  async function handleInvite() {
    if (!inviteForm.email.trim()) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      showToast.error('Session invalide.');
      return;
    }

    const response = await fetch('/api/admin/invite-practitioner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(inviteForm)
    });

    if (!response.ok) {
      showToast.error("Erreur lors de l'invitation.");
      return;
    }

    showToast.success('Invitation envoyee.');
    setInviteOpen(false);
    setInviteForm({ email: '', full_name: '', calendly_url: '' });
    setPage(1);
  }

  function exportCsv() {
    const headers = ['full_name', 'email', 'status', 'subscription_status', 'created_at'];
    const lines = rows.map((row) =>
      [
        row.full_name ?? '',
        row.email ?? '',
        row.status ?? '',
        row.subscription_status ?? '',
        row.created_at ?? ''
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
      <PageHeader
        title="Praticiens"
        subtitle="Liste des praticiens et statut de la plateforme."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv}>
              Exporter CSV
            </Button>
            <Button onClick={() => setInviteOpen(true)}>Inviter un praticien</Button>
          </div>
        }
      />

      <PageShell className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-warmgray">Recherche</label>
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
            <label className="text-xs font-medium text-warmgray">Statut</label>
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
            <label className="text-xs font-medium text-warmgray">Tri</label>
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
              className="mt-2"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? 'Croissant' : 'Decroissant'}
            </Button>
          </div>
        </div>
      </PageShell>

      <AdminDataTable
        rows={rows}
        isLoading={loading}
        emptyMessage="Aucun praticien trouve."
        columns={[
          {
            key: 'full_name',
            header: 'Nom',
            render: (row) => (
              <div className="flex flex-col">
                <span className="font-medium text-charcoal">{row.full_name ?? '—'}</span>
                <span className="text-xs text-warmgray">{row.email}</span>
              </div>
            )
          },
          {
            key: 'status',
            header: 'Statut',
            render: (row) => (
              <span
                className={
                  row.status === 'suspended'
                    ? 'rounded-full bg-red-100 px-2 py-1 text-xs text-red-600'
                    : 'rounded-full bg-teal/10 px-2 py-1 text-xs text-teal'
                }
              >
                {row.status === 'suspended' ? 'Suspendu' : 'Actif'}
              </span>
            )
          },
          {
            key: 'subscription_status',
            header: 'Abonnement',
            render: (row) => row.subscription_status ?? '—'
          },
          {
            key: 'created_at',
            header: 'Cree le',
            render: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '—')
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/practitioners/${row.id}`)}
              >
                Voir
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

      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Inviter un praticien"
        description="L'invitation cree un compte et envoie un email de connexion."
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-warmgray">Email</label>
            <Input
              value={inviteForm.email}
              onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-warmgray">Nom complet</label>
            <Input
              value={inviteForm.full_name}
              onChange={(event) => setInviteForm({ ...inviteForm, full_name: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-warmgray">Calendly URL</label>
            <Input
              value={inviteForm.calendly_url}
              onChange={(event) => setInviteForm({ ...inviteForm, calendly_url: event.target.value })}
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
    </div>
  );
}
