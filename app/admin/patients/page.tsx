'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { showToast } from '@/components/ui/Toaster';

const PAGE_SIZE = 10;

type PatientRow = {
  id: string;
  practitioner_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string | null;
  is_premium: boolean | null;
  created_at: string | null;
  practitioner_name?: string | null;
};

type PractitionerOption = {
  id: string;
  full_name: string | null;
};

export default function AdminPatientsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [practitionerFilter, setPractitionerFilter] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'full_name' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [practitioners, setPractitioners] = useState<PractitionerOption[]>([]);
  const searchParams = useSearchParams();

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  useEffect(() => {
    const practitionerParam = searchParams.get('practitioner');
    if (practitionerParam) {
      setPractitionerFilter(practitionerParam);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadPractitioners() {
      const response = await fetch('/api/admin/practitioners/options', { credentials: 'include' });
      if (!response.ok) {
        showToast.error('Erreur lors du chargement des praticiens.');
        return;
      }

      const data = await response.json();
      if (!isMounted) return;
      setPractitioners(data.practitioners ?? []);
    }

    loadPractitioners();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPatients() {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortField,
        sortDirection
      });

      if (statusFilter) {
        params.set('status', statusFilter);
      }

      if (practitionerFilter) {
        params.set('practitioner', practitionerFilter);
      }

      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`/api/admin/patients?${params.toString()}`, { credentials: 'include' });

      if (!isMounted) return;

      if (!response.ok) {
        showToast.error('Erreur lors du chargement des patients.');
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setRows(data.patients ?? []);
      setTotal(data.total ?? 0);
      setLoading(false);
    }

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, [page, search, sortField, sortDirection, statusFilter, practitionerFilter]);

  function exportCsv() {
    const headers = ['full_name', 'email', 'phone', 'city', 'status', 'is_premium', 'created_at'];
    const lines = rows.map((row) =>
      [
        row.full_name,
        row.email ?? '',
        row.phone ?? '',
        row.city ?? '',
        row.status ?? '',
        row.is_premium ? 'premium' : 'standard',
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
    link.download = 'patients.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle="Identites patients et statuts."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              ← Retour au dashboard admin
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              Exporter CSV
            </Button>
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
            <label className="text-xs font-medium text-warmgray">Praticien</label>
            <Select
              value={practitionerFilter}
              onChange={(event) => {
                setPractitionerFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous</option>
              {practitioners.map((practitioner) => (
                <option key={practitioner.id} value={practitioner.id}>
                  {practitioner.full_name ?? practitioner.id}
                </option>
              ))}
            </Select>
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
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="text-xs font-medium text-warmgray">Tri</label>
            <Select value={sortField} onChange={(event) => setSortField(event.target.value as 'created_at' | 'full_name' | 'status')}>
              <option value="created_at">Date</option>
              <option value="full_name">Nom</option>
              <option value="status">Statut</option>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          >
            {sortDirection === 'asc' ? 'Croissant' : 'Decroissant'}
          </Button>
        </div>
      </PageShell>

      <AdminDataTable
        rows={rows}
        isLoading={loading}
        emptyMessage="Aucun patient trouve."
        columns={[
          {
            key: 'full_name',
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
            render: (row) => row.practitioner_name ?? '—'
          },
          {
            key: 'status',
            header: 'Statut',
            render: (row) => (row.status === 'premium' || row.is_premium ? 'Premium' : 'Standard')
          },
          {
            key: 'created_at',
            header: 'Cree le',
            render: (row) =>
              row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '—'
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
              <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/patients/${row.id}`)}>
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
    </div>
  );
}
