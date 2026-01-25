'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientTabs } from '@/components/patients/PatientTabs';
import { Button } from '@/components/ui/Button';
import { getPatientById } from '@/lib/queries';
import type { PatientWithDetails } from '@/lib/types';

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params.id;
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPatient() {
      setLoading(true);
      setError(null);
      const data = await getPatientById(patientId);
      if (!active) return;
      if (!data) {
        setError('Patient introuvable.');
        setPatient(null);
        setLoading(false);
        return;
      }
      setPatient(data);
      setLoading(false);
    }

    if (patientId) {
      loadPatient();
    }

    return () => {
      active = false;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement du dossier patient…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-marine">
          {error}
        </div>
        <Button variant="secondary" onClick={() => router.push('/patients')}>
          Retour aux patients
        </Button>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return <PatientTabs patient={patient} />;
}
