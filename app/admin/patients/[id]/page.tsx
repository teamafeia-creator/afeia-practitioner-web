'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { showToast } from '@/components/ui/Toaster';

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
  const patientId = params?.id as string;
  const [patient, setPatient] = useState<PatientIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPatient() {
      const { data, error } = await supabase
        .from('patients_identity')
        .select(
          'id, practitioner_id, full_name, email, phone, age, city, status, is_premium, circular_enabled, last_circular_sync_at, last_circular_sync_status'
        )
        .eq('id', patientId)
        .single();

      if (!isMounted) return;

      if (error) {
        showToast.error('Patient introuvable.');
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
      isMounted = false;
    };
  }, [patientId]);

  async function saveChanges() {
    if (!patient) return;
    setSaving(true);

    const { error } = await supabase
      .from('patients_identity')
      .update({
        full_name: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        age: patient.age,
        city: patient.city,
        status: patient.status,
        is_premium: patient.is_premium,
        circular_enabled: patient.circular_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', patient.id);

    if (error) {
      showToast.error('Erreur lors de la mise a jour.');
    } else {
      showToast.success('Patient mis a jour.');
    }

    setSaving(false);
  }

  async function triggerCircularSync() {
    if (!patient) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      showToast.error('Session invalide.');
      return;
    }

    const response = await fetch('/api/admin/circular-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
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
  }

  if (loading || !patient) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient" subtitle="Chargement..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.full_name}
        subtitle="Identite uniquement (sans donnees de sante)."
        actions={
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
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
          <div className="text-xs text-warmgray">Statut actuel : {statusLabels[patient.status ?? 'standard']}</div>
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
