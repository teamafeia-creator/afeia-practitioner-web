'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Select } from '@/components/ui/Select';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toaster';

const PAGE_SIZE = 10;

type BillingRow = {
  id: string;
  practitioner_id: string;
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
  payment_failed: boolean | null;
  latest_invoice_id: string | null;
  practitioners?: {
    full_name: string | null;
    email: string | null;
  }[] | null;
};

export default function AdminBillingPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [practitionerFilter, setPractitionerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const practitionerParam = searchParams.get('practitioner');
    if (practitionerParam) {
      setPractitionerFilter(practitionerParam);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadBilling() {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE)
      });

      if (statusFilter) {
        params.set('status', statusFilter);
      }

      if (paymentFilter) {
        params.set('paymentFailed', paymentFilter);
      }

      if (practitionerFilter) {
        params.set('practitioner', practitionerFilter);
      }

      const response = await fetch(`/api/admin/billing?${params.toString()}`, {
        credentials: 'include'
      });

      if (!isMounted) return;

      if (!response.ok) {
        showToast.error('Erreur lors du chargement du billing.');
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setRows(data.billing ?? []);
      setTotal(data.total ?? 0);
      setLoading(false);
    }

    loadBilling();

    return () => {
      isMounted = false;
    };
  }, [page, statusFilter, paymentFilter, practitionerFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Vue Stripe par praticien et alertes de paiement." />

      <PageShell className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
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
              <option value="past_due">En retard</option>
              <option value="canceled">Annule</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-warmgray">Paiements</label>
            <Select
              value={paymentFilter}
              onChange={(event) => {
                setPaymentFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous</option>
              <option value="failed">Echoue</option>
              <option value="ok">OK</option>
            </Select>
          </div>
        </div>
      </PageShell>

      <AdminDataTable
        rows={rows}
        isLoading={loading}
        emptyMessage="Aucune donnee billing."
        columns={[
          {
            key: 'practitioner',
            header: 'Praticien',
            render: (row) => {
              const practitioner = row.practitioners?.[0];
              return (
                <div className="flex flex-col">
                  <span className="font-medium text-charcoal">
                    {practitioner?.full_name ?? row.practitioner_id}
                  </span>
                  <span className="text-xs text-warmgray">{practitioner?.email ?? ''}</span>
                </div>
              );
            }
          },
          {
            key: 'plan',
            header: 'Plan',
            render: (row) => row.price_id ?? '—'
          },
          {
            key: 'status',
            header: 'Statut',
            render: (row) => row.status ?? '—'
          },
          {
            key: 'current_period_end',
            header: 'Renouvellement',
            render: (row) =>
              row.current_period_end
                ? new Date(row.current_period_end).toLocaleDateString('fr-FR')
                : '—'
          },
          {
            key: 'payment_failed',
            header: 'Paiement',
            render: (row) => (row.payment_failed ? 'Echec' : 'OK')
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/practitioners/${row.practitioner_id}`)}
              >
                Voir praticien
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
