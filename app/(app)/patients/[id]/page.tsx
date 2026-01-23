'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PatientTabs } from '../../../../components/patients/PatientTabs';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Toast } from '../../../../components/ui/Toast';
import { deletePatient, getPatientById } from '../../../../lib/queries';
import type { PatientWithDetails } from '../../../../lib/types';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPatientById(params.id);
        if (!active) return;
        if (!data) {
          setError('Patient introuvable.');
          setPatient(null);
        } else {
          setPatient(data);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Impossible de charger le dossier patient.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-7 w-40 rounded-full bg-sable animate-pulse" />
              <div className="h-4 w-56 rounded-full bg-sable/70 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-36 rounded-full bg-sable/70 animate-pulse" />
              <div className="h-9 w-24 rounded-full bg-sable/70 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="h-10 w-full rounded-full bg-sable/70 animate-pulse" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`tab-skeleton-${index}`}
                className="h-20 rounded-2xl bg-sable/60 ring-1 ring-black/5 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-marine">
          {error ?? 'Patient introuvable.'}
        </div>
        <Link href="/patients" className="text-sm text-teal hover:underline">
          Retour à la liste des patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/patients" className="text-sm text-teal hover:underline">
        Retour à la liste des patients
      </Link>
      <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-black/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-charcoal">{patient.name}</h1>
              <Badge variant={patient.is_premium ? 'premium' : 'info'}>
                {patient.is_premium ? 'Premium' : 'Standard'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-warmgray">
              <span>{patient.age ? `${patient.age} ans` : 'Âge non renseigné'}</span>
              <span>{patient.city ?? 'Ville non renseignée'}</span>
              <span>{patient.email ?? 'Email non renseigné'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {patient.email ? (
              <Link href="/patient/login" target="_blank" rel="noreferrer">
                <Button variant="secondary">Voir côté patient</Button>
              </Link>
            ) : null}
            <Button
              variant="danger"
              className="w-full sm:w-auto"
              onClick={() => {
                setConfirmText('');
                setShowDeleteModal(true);
              }}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </div>
      <PatientTabs patient={patient} />
      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-charcoal">Supprimer ce patient</h2>
            <p className="mt-2 text-sm text-warmgray">
              Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.
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
                    setDeleting(true);
                    try {
                      console.log('[patients] deleting from detail', { patientId: patient.id });
                      await deletePatient(patient.id);
                      setToast({
                        title: 'Patient supprimé',
                        description: 'Le patient a été retiré du CRM.',
                        variant: 'success'
                      });
                      setShowDeleteModal(false);
                      setTimeout(() => {
                        router.push('/patients');
                        router.refresh();
                      }, 600);
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
