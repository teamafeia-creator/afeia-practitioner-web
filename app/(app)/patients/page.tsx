'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getPatientsWithUnreadCounts } from '../../../lib/queries';
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

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPatientsWithUnreadCounts();
        if (!isMounted) return;
        setPatients(data);
      } catch (err) {
        if (!isMounted) return;
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
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="rounded-xl bg-white p-4 ring-1 ring-black/5 hover:bg-sable/30 transition"
                >
                  <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                    <div>
                      <p className="font-medium text-charcoal">{patient.name}</p>
                      <p className="text-sm text-warmgray">
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
