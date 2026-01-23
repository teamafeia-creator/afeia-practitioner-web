'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Toast } from '../../../components/ui/Toast';
import { deletePatient, getPatientsWithUnreadCountsPaged } from '../../../lib/queries';
import type { PatientWithUnreadCounts } from '../../../lib/types';

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

function formatDate(value: string | null) {
  if (!value) return '—';
  return DATE_FORMATTER.format(new Date(value));
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithUnreadCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialSearch = searchParams.get('search') ?? '';
  const initialPage = Number(searchParams.get('page') ?? '1');
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(Number.isNaN(initialPage) ? 1 : Math.max(1, initialPage));
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithUnreadCounts | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        console.log('[patients] loading list');
        const { patients: data, total } = await getPatientsWithUnreadCountsPaged({
          page,
          pageSize,
          search
        });
        if (!isMounted) return;
        setPatients(data);
        setTotalCount(total);
      } catch (err) {
        if (!isMounted) return;
        console.error('[patients] failed to load list', err);
        setError(err instanceof Error ? err.message : 'Impossible de charger les patients.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [page, pageSize, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set('search', search.trim());
    }
    if (page > 1) {
      params.set('page', String(page));
    }
    const next = params.toString();
    router.replace(`${pathname}${next ? `?${next}` : ''}`);
  }, [page, pathname, router, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-warmgray">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Patients</h1>
          <p className="text-sm text-warmgray">{totalCount} patient(s) au total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/patients/new">
            <Button variant="cta">+ Nouveau patient</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Rechercher par nom ou ville..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-marine">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">CRM patients</h2>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="text-sm text-warmgray">Aucun patient trouvé</p>
          ) : (
            <div className="space-y-3">
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 text-xs font-semibold text-warmgray md:grid">
                <div>Patient</div>
                <div>Statut</div>
                <div>Messages non lus</div>
                <div>Notifications</div>
                <div>Dernière consultation</div>
                <div className="text-right">Actions</div>
              </div>
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="rounded-xl bg-white p-4 ring-1 ring-black/5 transition hover:bg-sable/30"
                >
                  <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center">
                    <div className="min-w-0">
                      <Link href={`/patients/${patient.id}`} className="font-medium text-charcoal hover:underline">
                        {patient.name}
                      </Link>
                      <p className="text-sm text-warmgray break-words">
                        {[patient.age ? `${patient.age} ans` : null, patient.city]
                          .filter(Boolean)
                          .join(' • ') || '—'}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Badge variant={patient.is_premium ? 'premium' : 'info'}>
                        {patient.is_premium ? 'Premium' : 'Standard'}
                      </Badge>
                    </div>
                    <div className="text-sm text-marine">
                      {patient.unreadMessages > 0 ? (
                        <Badge variant="new">{patient.unreadMessages} non lus</Badge>
                      ) : (
                        <span className="text-warmgray">0</span>
                      )}
                    </div>
                    <div className="text-sm text-marine">
                      {patient.unreadNotifications > 0 ? (
                        <Badge variant="attention">{patient.unreadNotifications} non vues</Badge>
                      ) : (
                        <span className="text-warmgray">0</span>
                      )}
                    </div>
                    <div className="text-sm text-marine">
                      {formatDate(patient.lastConsultationAt)}
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:justify-end md:gap-2">
                      <div className="flex flex-wrap gap-2 md:hidden">
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() =>
                            setOpenActionMenuId((prev) => (prev === patient.id ? null : patient.id))
                          }
                        >
                          Actions
                        </Button>
                        {openActionMenuId === patient.id ? (
                          <div className="w-full rounded-xl border border-black/10 bg-white p-3 shadow-soft">
                            <div className="flex flex-col gap-2">
                              <Link href={`/patients/${patient.id}`}>
                                <Button variant="secondary" className="w-full">
                                  Voir
                                </Button>
                              </Link>
                              <Link href={`/patients/${patient.id}`}>
                                <Button variant="primary" className="w-full">
                                  Éditer
                                </Button>
                              </Link>
                              <Button
                                variant="danger"
                                className="w-full"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setConfirmText('');
                                  setShowDeleteModal(true);
                                  setOpenActionMenuId(null);
                                }}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="hidden items-center justify-end gap-2 md:flex">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="secondary">Voir</Button>
                        </Link>
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="primary">Éditer</Button>
                        </Link>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setConfirmText('');
                            setShowDeleteModal(true);
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 text-sm text-warmgray">
        <div>{totalCount} patients</div>
        <div className="flex items-center gap-3">
          <span>
            Page {page} / {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
              disabled={page >= pageCount}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
      {showDeleteModal && selectedPatient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-charcoal">Supprimer ce patient</h2>
            <p className="mt-2 text-sm text-warmgray">
              Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer la suppression de{' '}
              <strong>{selectedPatient.name}</strong>.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                placeholder="SUPPRIMER"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirmText('');
                    setSelectedPatient(null);
                    setShowDeleteModal(false);
                  }}
                  disabled={deleting}
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  loading={deleting}
                  disabled={confirmText.trim().toUpperCase() !== 'SUPPRIMER'}
                  onClick={async () => {
                    if (!selectedPatient) return;
                    setDeleting(true);
                    try {
                      console.log('[patients] deleting from list', { patientId: selectedPatient.id });
                      await deletePatient(selectedPatient.id);
                      setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id));
                      setTotalCount((prev) => Math.max(0, prev - 1));
                      setToast({
                        title: 'Patient supprimé',
                        description: `${selectedPatient.name} a été retiré du CRM.`,
                        variant: 'success'
                      });
                      setShowDeleteModal(false);
                      setSelectedPatient(null);
                    } catch (deleteError) {
                      console.error('Failed to delete patient', deleteError);
                      setToast({
                        title: 'Suppression impossible',
                        description:
                          deleteError instanceof Error ? deleteError.message : 'Erreur inconnue.',
                        variant: 'error'
                      });
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
