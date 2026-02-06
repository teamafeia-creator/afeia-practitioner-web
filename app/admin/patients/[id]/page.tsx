'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { showToast } from '@/components/ui/Toaster';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusLabels: Record<string, string> = {
  standard: 'Standard',
  premium: 'Premium'
};

type PatientIdentity = {
  id: string;
  practitioner_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  city: string | null;
  status: string | null;
  is_premium: boolean | null;
  circular_enabled: boolean | null;
  last_circular_sync_at: string | null;
  last_circular_sync_status: string | null;
};

export default function AdminPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id as string;
  const [patient, setPatient] = useState<PatientIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPatient() {
      if (!UUID_REGEX.test(patientId)) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/patients/${patientId}`, { credentials: 'include' });

        if (!isMounted) return;

        if (!response.ok) {
          showToast.error('Patient introuvable.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setPatient(data.patient ?? null);
      } catch (err) {
        console.error('[admin] loadPatient error:', err);
        if (!isMounted) return;
        showToast.error('Erreur réseau lors du chargement du patient.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (patientId) {
      loadPatient();
    }

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  async function saveChanges() {
    if (!patient) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/patients/${patient.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: patient.full_name,
          email: patient.email,
          phone: patient.phone,
          age: patient.age,
          city: patient.city,
          status: patient.status,
          is_premium: patient.is_premium,
          circular_enabled: patient.circular_enabled
        })
      });

      if (!response.ok) {
        showToast.error('Erreur lors de la mise a jour.');
      } else {
        showToast.success('Patient mis a jour.');
      }
    } catch (err) {
      console.error('[admin] saveChanges error:', err);
      showToast.error('Erreur réseau lors de la mise a jour.');
    } finally {
      setSaving(false);
    }
  }

  async function triggerCircularSync() {
    if (!patient) return;

    try {
      const response = await fetch('/api/admin/circular-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ patient_id: patient.id })
      });

      if (!response.ok) {
        showToast.error('Erreur lors de la synchronisation.');
        return;
      }

      showToast.success('Synchronisation lancee.');
      setPatient({
        ...patient,
        last_circular_sync_at: new Date().toISOString(),
        last_circular_sync_status: 'queued'
      });
    } catch (err) {
      console.error('[admin] triggerCircularSync error:', err);
      showToast.error('Erreur réseau lors de la synchronisation.');
    }
  }

  if (loading || !patient) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient" subtitle={loading ? 'Chargement...' : 'Patient introuvable.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.full_name}
        subtitle="Identite uniquement (sans donnees de sante)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              ← Retour au dashboard admin
            </Button>
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 space-y-4 lg:col-span-2">
          <h3 className="text-base font-semibold text-charcoal">Identite</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-warmgray">Nom complet</label>
              <Input
                value={patient.full_name}
                onChange={(event) => setPatient({ ...patient, full_name: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Email</label>
              <Input
                value={patient.email ?? ''}
                onChange={(event) => setPatient({ ...patient, email: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Telephone</label>
              <Input
                value={patient.phone ?? ''}
                onChange={(event) => setPatient({ ...patient, phone: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Age</label>
              <Input
                type="number"
                value={patient.age ?? ''}
                onChange={(event) => setPatient({ ...patient, age: Number(event.target.value) || null })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Ville</label>
              <Input
                value={patient.city ?? ''}
                onChange={(event) => setPatient({ ...patient, city: event.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-base font-semibold text-charcoal">Statut</h3>
          <div>
            <label className="text-xs font-medium text-warmgray">Abonnement</label>
            <Select
              value={patient.status ?? 'standard'}
              onChange={(event) =>
                setPatient({
                  ...patient,
                  status: event.target.value,
                  is_premium: event.target.value === 'premium'
                })
              }
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-warmgray">Premium actif</label>
            <Select
              value={patient.is_premium ? 'yes' : 'no'}
              onChange={(event) =>
                setPatient({
                  ...patient,
                  is_premium: event.target.value === 'yes',
                  status: event.target.value === 'yes' ? 'premium' : 'standard'
                })
              }
            >
              <option value="no">Non</option>
              <option value="yes">Oui</option>
            </Select>
          </div>
          <div className="text-xs text-warmgray">
            Statut actuel : {statusLabels[patient.status ?? 'standard']}
          </div>
        </Card>
      </div>

      <Card className="p-5 space-y-3">
        <h3 className="text-base font-semibold text-charcoal">Circular</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={patient.circular_enabled ? 'enabled' : 'disabled'}
            onChange={(event) =>
              setPatient({
                ...patient,
                circular_enabled: event.target.value === 'enabled'
              })
            }
          >
            <option value="enabled">Active</option>
            <option value="disabled">Desactive</option>
          </Select>
          <Button variant="outline" onClick={triggerCircularSync}>
            Sync now
          </Button>
        </div>
        <p className="text-xs text-warmgray">
          Derniere synchro :{' '}
          {patient.last_circular_sync_at
            ? new Date(patient.last_circular_sync_at).toLocaleString('fr-FR')
            : 'Jamais'}
          {patient.last_circular_sync_status ? ` (${patient.last_circular_sync_status})` : ''}
        </p>
      </Card>
    </div>
  );
}
