'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { fetchPatientsOverview, type PatientOverview } from '../../../services/patients';

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
  const [patients, setPatients] = useState<PatientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      const data = await fetchPatientsOverview();
      if (!isMounted) return;
      setPatients(data);
      setLoading(false);
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
            <Button variant="cta">Ajouter un patient</Button>
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
            <p className="text-sm text-warmgray">Aucun patient trouve</p>
          ) : (
            <div className="space-y-3">
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 text-xs font-semibold text-warmgray md:grid">
                <div>Patient</div>
                <div>Statut</div>
                <div>Dernière consultation</div>
                <div>Prochain RDV</div>
                <div>Signaux</div>
              </div>
              {filteredPatients.map((patient) => {
                const hasCircular = patient.circularEnabled;
                const lastSync = patient.lastCircularSyncAt ? new Date(patient.lastCircularSyncAt) : null;
                const circularActive =
                  !!lastSync &&
                  new Date().getTime() - lastSync.getTime() < 1000 * 60 * 60 * 48;
                const anamneseState = patient.anamneseStatus === 'PENDING' ? 'À faire' : 'OK';

                return (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="rounded-xl bg-white p-4 ring-1 ring-black/5 hover:bg-sable/30 transition"
                  >
                    <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_2fr]">
                      <div>
                        <p className="font-medium text-charcoal">{patient.name}</p>
                        <p className="text-sm text-warmgray">
                          {[patient.age ? `${patient.age} ans` : null, patient.city].filter(Boolean).join(' • ') || '—'}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Badge variant={patient.status === 'premium' ? 'premium' : 'info'}>
                          {patient.status === 'premium' ? 'Premium' : 'Standard'}
                        </Badge>
                      </div>
                      <div className="text-sm text-marine">{formatDate(patient.lastConsultationAt)}</div>
                      <div className="text-sm text-marine">{formatDate(patient.nextAppointmentAt)}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {hasCircular ? (
                          <Badge variant={circularActive ? 'success' : 'attention'}>
                            Circular · {circularActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        ) : null}
                        {patient.unreadMessages > 0 ? (
                          <Badge variant="new">{patient.unreadMessages} msg</Badge>
                        ) : null}
                        <span className="text-xs text-warmgray">Etat client : {anamneseState}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
