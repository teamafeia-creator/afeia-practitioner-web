'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Patients</h1>
          <p className="text-sm text-warmgray">{patients.length} patient(s) au total</p>
        </div>
        <Link href="/patients/new">
          <Button variant="cta">Nouveau patient</Button>
        </Link>
      </div>

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
                  {isPremium ? <Badge variant="premium">Premium</Badge> : <Badge variant="info">Standard</Badge>}
                </div>

                <div className="grid gap-2 text-sm text-marine">
                  <div>
                    <span className="text-xs text-warmgray">Email</span>
                    <div>{patient.email || 'Non renseigné'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-warmgray">Téléphone</span>
                      <div>{patient.phone || 'Non renseigné'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-warmgray">Pathologie</span>
                      <div>{patient.pathology || 'Non renseigné'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link href={`/patients/${patient.id}`}>
                  <Button variant="secondary">Voir le dossier</Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-warmgray/30 bg-sable/50 p-6 text-center text-sm text-warmgray">
          Aucun patient trouvé.
        </div>
      ) : null}
    </div>
  );
}
