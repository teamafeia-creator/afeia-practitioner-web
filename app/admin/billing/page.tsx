'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toaster';

const PAGE_SIZE = 10;

type PractitionerPublic = {
  full_name: string | null;
  email: string | null;
};

type BillingRow = {
  id: string;
  practitioner_id: string;
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
  payment_failed: boolean | null;
  latest_invoice_id: string | null;
  practitioners_public?: PractitionerPublic[] | PractitionerPublic | null;
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-sm text-slate-400">{'\u2014'}</span>;

  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    past_due: 'bg-amber-100 text-amber-700',
    canceled: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    active: 'Actif',
    past_due: 'En retard',
    canceled: 'Annule',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function PaymentBadge({ failed }: { failed: boolean | null }) {
  if (failed === null || failed === undefined) {
    return <span className="text-sm text-slate-400">{'\u2014'}</span>;
  }

  if (failed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Echec
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      OK
    </span>
  );
}

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
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        if (statusFilter) params.set('status', statusFilter);
        if (paymentFilter) params.set('paymentFailed', paymentFilter);
        if (practitionerFilter) params.set('practitioner', practitionerFilter);

        const response = await fetch(`/api/admin/billing?${params.toString()}`, {
          credentials: 'include',
        });

        if (!isMounted) return;

        if (!response.ok) {
          showToast.error('Erreur lors du chargement du billing.');
          setRows([]);
          setTotal(0);
          return;
        }

        const data = await response.json();
        setRows(data.billing ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error('[admin] loadBilling error:', err);
        if (!isMounted) return;
        showToast.error('Erreur reseau lors du chargement du billing.');
        setRows([]);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBilling();

    return () => {
      isMounted = false;
    };
  }, [page, statusFilter, paymentFilter, practitionerFilter]);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Billing"
        subtitle="Vue Stripe par praticien et alertes de paiement."
      />

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Statut
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
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
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Paiements
            </label>
            <Select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous</option>
              <option value="failed">Echoue</option>
              <option value="ok">OK</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Chargement...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-500">
            <CreditCard className="mb-2 h-8 w-8 text-slate-300" />
            Aucune donnee billing.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Praticien</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">Renouvellement</th>
                    <th className="px-5 py-3">Paiement</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const practitioner = Array.isArray(row.practitioners_public)
                      ? row.practitioners_public[0]
                      : row.practitioners_public;

                    return (
                      <tr key={row.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/practitioners/${row.practitioner_id}`}
                            className="group flex flex-col"
                          >
                            <span className="text-sm font-medium text-slate-800 group-hover:text-teal-700">
                              {practitioner?.full_name ?? row.practitioner_id.slice(0, 8)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {practitioner?.email ?? ''}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {row.price_id ?? '\u2014'}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {row.current_period_end
                            ? new Date(row.current_period_end).toLocaleDateString('fr-FR')
                            : '\u2014'}
                        </td>
                        <td className="px-5 py-3">
                          <PaymentBadge failed={row.payment_failed} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/practitioners/${row.practitioner_id}`)
                            }
                            icon={<ExternalLink className="h-3.5 w-3.5" />}
                            className="text-slate-600 hover:text-slate-800"
                          >
                            Voir
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
