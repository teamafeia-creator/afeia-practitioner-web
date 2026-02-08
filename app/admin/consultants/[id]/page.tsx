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

type ConsultantIdentity = {
  id: string;
  practitioner_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  city: string | null;
  status: string | null;
  is_premium: boolean | null;
  bague_connectee_enabled: boolean | null;
  last_bague_connectee_sync_at: string | null;
  last_bague_connectee_sync_status: string | null;
};

export default function AdminConsultantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultantId = params?.id as string;
  const [consultant, setConsultant] = useState<ConsultantIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadConsultant() {
      if (!UUID_REGEX.test(consultantId)) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/consultants/${consultantId}`, { credentials: 'include' });

        if (!isMounted) return;

        if (!response.ok) {
          showToast.error('Consultant introuvable.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setConsultant(data.consultant ?? null);
      } catch (err) {
        console.error('[admin] loadConsultant error:', err);
        if (!isMounted) return;
        showToast.error('Erreur réseau lors du chargement du consultant.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (consultantId) {
      loadConsultant();
    }

    return () => {
      isMounted = false;
    };
  }, [consultantId]);

  async function saveChanges() {
    if (!consultant) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/consultants/${consultant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: consultant.full_name,
          email: consultant.email,
          phone: consultant.phone,
          age: consultant.age,
          city: consultant.city,
          status: consultant.status,
          is_premium: consultant.is_premium,
          bague_connectee_enabled: consultant.bague_connectee_enabled
        })
      });

      if (!response.ok) {
        showToast.error('Erreur lors de la mise a jour.');
      } else {
        showToast.success('Consultant mis a jour.');
      }
    } catch (err) {
      console.error('[admin] saveChanges error:', err);
      showToast.error('Erreur réseau lors de la mise a jour.');
    } finally {
      setSaving(false);
    }
  }

  async function triggerBagueConnecteeSync() {
    if (!consultant) return;

    try {
      const response = await fetch('/api/admin/bague-connectee-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ consultant_id: consultant.id })
      });

      if (!response.ok) {
        showToast.error('Erreur lors de la synchronisation.');
        return;
      }

      showToast.success('Synchronisation lancee.');
      setConsultant({
        ...consultant,
        last_bague_connectee_sync_at: new Date().toISOString(),
        last_bague_connectee_sync_status: 'queued'
      });
    } catch (err) {
      console.error('[admin] triggerBagueConnecteeSync error:', err);
      showToast.error('Erreur réseau lors de la synchronisation.');
    }
  }

  if (loading || !consultant) {
    return (
      <div className="space-y-6">
        <PageHeader title="Consultant" subtitle={loading ? 'Chargement...' : 'Consultant introuvable.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={consultant.full_name}
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
                value={consultant.full_name}
                onChange={(event) => setConsultant({ ...consultant, full_name: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Email</label>
              <Input
                value={consultant.email ?? ''}
                onChange={(event) => setConsultant({ ...consultant, email: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Telephone</label>
              <Input
                value={consultant.phone ?? ''}
                onChange={(event) => setConsultant({ ...consultant, phone: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Age</label>
              <Input
                type="number"
                value={consultant.age ?? ''}
                onChange={(event) => setConsultant({ ...consultant, age: Number(event.target.value) || null })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Ville</label>
              <Input
                value={consultant.city ?? ''}
                onChange={(event) => setConsultant({ ...consultant, city: event.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-base font-semibold text-charcoal">Statut</h3>
          <div>
            <label className="text-xs font-medium text-warmgray">Abonnement</label>
            <Select
              value={consultant.status ?? 'standard'}
              onChange={(event) =>
                setConsultant({
                  ...consultant,
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
              value={consultant.is_premium ? 'yes' : 'no'}
              onChange={(event) =>
                setConsultant({
                  ...consultant,
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
            Statut actuel : {statusLabels[consultant.status ?? 'standard']}
          </div>
        </Card>
      </div>

      <Card className="p-5 space-y-3">
        <h3 className="text-base font-semibold text-charcoal">Bague connectée</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={consultant.bague_connectee_enabled ? 'enabled' : 'disabled'}
            onChange={(event) =>
              setConsultant({
                ...consultant,
                bague_connectee_enabled: event.target.value === 'enabled'
              })
            }
          >
            <option value="enabled">Activée</option>
            <option value="disabled">Désactivée</option>
          </Select>
          <Button variant="outline" onClick={triggerBagueConnecteeSync}>
            Sync now
          </Button>
        </div>
        <p className="text-xs text-warmgray">
          Dernière synchro :{' '}
          {consultant.last_bague_connectee_sync_at
            ? new Date(consultant.last_bague_connectee_sync_at).toLocaleString('fr-FR')
            : 'Jamais'}
          {consultant.last_bague_connectee_sync_status ? ` (${consultant.last_bague_connectee_sync_status})` : ''}
        </p>
      </Card>
    </div>
  );
}
