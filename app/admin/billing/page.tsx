'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  practitioners_public?: {
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
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('stripe_subscriptions')
        .select('id, practitioner_id, status, price_id, current_period_end, payment_failed, latest_invoice_id, practitioners_public(full_name, email)', {
          count: 'exact'
        });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (paymentFilter) {
        query = query.eq('payment_failed', paymentFilter === 'failed');
      }

      if (practitionerFilter) {
        query = query.eq('practitioner_id', practitionerFilter);
      }

      query = query.order('current_period_end', { ascending: true }).range(from, to);

      const { data, count, error } = await query;

      if (!isMounted) return;

      if (error) {
        showToast.error('Erreur lors du chargement du billing.');
      }

      setRows(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    }

    loadBilling();

    return () => {
      isMounted = false;
    };
  }, [page, statusFilter, paymentFilter, practitionerFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Vue Stripe par praticien et alertes de paiement."
      />

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
              const practitioner = row.practitioners_public?.[0];
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
            render: (row) => (row.current_period_end ? new Date(row.current_period_end).toLocaleDateString('fr-FR') : '—')
          },
          {
            key: 'payment_failed',
            header: 'Paiement',
            render: (row) =>
              row.payment_failed
                ? 'Echec'
                : 'OK'
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
