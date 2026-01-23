'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Toast } from '../../../components/ui/Toast';
import { deletePatient, getPatientsWithUnreadCounts } from '../../../lib/queries';
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
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithUnreadCounts | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        console.log('[patients] loading list');
        const data = await getPatientsWithUnreadCounts();
        if (!isMounted) return;
        setPatients(data);
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
  }, []);

  const filteredPatients = useMemo(() => {
    const query = search.toLowerCase();
    return patients.filter((patient) => {
      return (
        patient.name.toLowerCase().includes(query) ||
        patient.city?.toLowerCase().includes(query)
      );
    });
  }, [patients, search]);

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
          <p className="text-sm text-warmgray">{patients.length} patient(s) au total</p>
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
          onChange={(e) => setSearch(e.target.value)}
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
          {filteredPatients.length === 0 ? (
            <p className="text-sm text-warmgray">Aucun patient trouvé</p>
          ) : (
            <div className="space-y-3">
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 text-xs font-semibold text-warmgray md:grid">
                <div>Patient</div>
                <div>Statut</div>
                <div>Messages non lus</div>
                <div>Notifications</div>
                <div>Dernière consultation</div>
              </div>
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="rounded-xl bg-white p-4 ring-1 ring-black/5 transition hover:bg-sable/30"
                >
                  <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-center">
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
                    <div className="flex justify-end">
                      <Button
                        variant="danger"
                        className="w-full md:w-auto"
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
