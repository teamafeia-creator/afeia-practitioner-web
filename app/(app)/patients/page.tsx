'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

type PatientRow = {
  id: string;
  name?: string | null;
  age?: number | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  pathology?: string | null;
  status?: string | null;
  is_premium?: boolean | null;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        if (!userId) {
          setPatients([]);
          return;
        }

        const { data } = await supabase
          .from('patients')
          .select('id, name, age, city, email, phone, pathology, status, is_premium')
          .eq('practitioner_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        setPatients((data ?? []) as PatientRow[]);
      } catch (err) {
        console.error('Erreur chargement patients:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  useEffect(() => {
    if (searchParams.get('deleted') === '1') {
      setToast({
        title: 'Patient supprimé',
        description: 'Le dossier a été supprimé définitivement.',
        variant: 'success'
      });
    }
  }, [searchParams]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.name, patient.city, patient.email].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [patients, search]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement des patients…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patient(s) au total`}
        actions={
          <Link href="/patients/new">
            <Button variant="primary">Ajouter un patient</Button>
          </Link>
        }
      />

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher par nom, ville ou email..."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPatients.map((patient) => {
          const isPremium = patient.is_premium || patient.status === 'premium';
          return (
            <Card key={patient.id} className="flex flex-col justify-between p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal">
                      {patient.name || 'Non renseigné'}
                    </h3>
                    <p className="text-xs text-warmgray">
                      {patient.age ? `${patient.age} ans` : 'Âge inconnu'}
                      {patient.city ? ` • ${patient.city}` : ''}
                    </p>
                  </div>
                  {isPremium ? (
                    <Badge variant="premium">Premium</Badge>
                  ) : (
                    <Badge variant="standard">Standard</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-marine">
                  <div className="flex flex-wrap gap-2 text-xs text-warmgray">
                    <span>Email : <span className="text-marine">{patient.email || 'Non renseigné'}</span></span>
                    <span>Téléphone : <span className="text-marine">{patient.phone || 'Non renseigné'}</span></span>
                  </div>
                  <div className="text-xs text-warmgray">
                    Pathologie : <span className="text-marine">{patient.pathology || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link href={`/patients/${patient.id}`}>
                  <Button variant="ghost" className="rounded-full px-4 py-2 text-xs">
                    Voir le dossier
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredPatients.length === 0 ? (
        <EmptyState
          icon="🧑‍⚕️"
          title="Aucun patient trouvé"
          description="Ajustez votre recherche ou ajoutez un nouveau dossier."
          action={
            <Link href="/patients/new">
              <Button variant="secondary">Créer un patient</Button>
            </Link>
          }
        />
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
