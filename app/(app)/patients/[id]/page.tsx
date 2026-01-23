'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PatientTabs } from '../../../../components/patients/PatientTabs';
import { getPatientById } from '../../../../lib/queries';
import type { PatientWithDetails } from '../../../../lib/types';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <PatientTabs patient={patient} />
    </div>
  );
}
