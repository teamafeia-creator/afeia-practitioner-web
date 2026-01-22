'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PatientList } from '../../../components/patients/PatientList';
import { listMyPatients } from '../../../services/patients';
import type { Patient } from '../../../lib/patients/types';
import { getErrorMessage } from '../../../lib/errors';
import { getPatientDisplayName } from '../../../lib/patients/utils';

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const created = searchParams.get('created') === '1';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await listMyPatients();
        if (mounted) {
          setPatients(data);
        }
      } catch (err) {
        const message = getErrorMessage(err);
        if (message.includes('connecté')) {
          router.push(`/login?from=/patients`);
          return;
        }
        if (mounted) {
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) => {
      const name = getPatientDisplayName(patient).toLowerCase();
      return (
        name.includes(query) ||
        patient.email?.toLowerCase().includes(query) ||
        patient.phone?.toLowerCase().includes(query)
      );
    });
  }, [patients, search]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-warmgray">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-warmgray/40 border-t-transparent" />
          Chargement des patients...
        </div>
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
          <Button variant="cta" onClick={() => router.push('/patients/new')}>
            Ajouter un patient
          </Button>
        </div>
      </div>

      {created ? (
        <div className="rounded-xl border border-teal/20 bg-teal/10 p-3 text-sm text-marine">
          Patient ajouté avec succès.
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
          <div className="font-medium text-marine">Impossible de charger les patients</div>
          <div className="text-marine mt-1">{error}</div>
        </div>
      ) : null}

      <div className="max-w-md">
        <Input
          placeholder="Rechercher par nom, email, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <PatientList patients={filteredPatients} />
    </div>
  );
}
