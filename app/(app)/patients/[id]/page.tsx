'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PatientTabs } from '../../../../components/patients/PatientTabs';
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-warmgray">Chargement...</div>
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/patients" className="text-sm text-teal hover:underline">
          Retour à la liste des patients
        </Link>
        <Button
          variant="danger"
          onClick={() => {
            setConfirmText('');
            setShowDeleteModal(true);
          }}
        >
          Supprimer
        </Button>
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
