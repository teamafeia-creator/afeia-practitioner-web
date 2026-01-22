'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PatientForm } from '../../../../components/patients/PatientForm';
import { createPatient } from '../../../../services/patients';
import { getErrorMessage } from '../../../../lib/errors';
import type { NewPatient } from '../../../../lib/patients/types';
import { supabase } from '../../../../lib/supabaseClient';

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function ensureAuth() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data.user) {
        router.push('/login?from=/patients/new');
      }
    }

    ensureAuth();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleCreate(values: NewPatient) {
    setLoading(true);
    setError(null);
    try {
      await createPatient(values);
      router.push('/patients?created=1');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Ajouter un patient</h1>
          <p className="text-sm text-warmgray">
            Les champs marqués d’une * sont obligatoires.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/patients')}>
          Retour à la liste
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Informations patient</h2>
        </CardHeader>
        <CardContent>
          <PatientForm onSubmit={handleCreate} loading={loading} serverError={error} />
        </CardContent>
      </Card>
    </div>
  );
}
