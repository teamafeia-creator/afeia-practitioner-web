'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { showToast } from '@/components/ui/Toaster';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PractitionerDetail = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string | null;
  calendly_url: string | null;
  subscription_status: string | null;
  created_at: string | null;
};

export default function AdminPractitionerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const practitionerId = params?.id as string;
  const [practitioner, setPractitioner] = useState<PractitionerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPractitioner() {
      if (!UUID_REGEX.test(practitionerId)) {
        setLoading(false);
        setPractitioner(null);
        return;
      }

      const response = await fetch(`/api/admin/practitioners/${practitionerId}`, {
        credentials: 'include'
      });

      if (!isMounted) return;

      if (!response.ok) {
        showToast.error('Praticien introuvable.');
        router.replace('/admin/practitioners');
        return;
      }

      const data = await response.json();
      setPractitioner(data.practitioner ?? null);
      setLoading(false);
    }

    if (practitionerId) {
      loadPractitioner();
    }

    return () => {
      isMounted = false;
    };
  }, [practitionerId, router]);

  async function saveChanges() {
    if (!practitioner) return;
    setSaving(true);

    const response = await fetch(`/api/admin/practitioners/${practitioner.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: practitioner.email,
        full_name: practitioner.full_name,
        status: practitioner.status,
        calendly_url: practitioner.calendly_url,
        subscription_status: practitioner.subscription_status
      })
    });

    if (!response.ok) {
      showToast.error('Erreur lors de la mise a jour.');
    } else {
      showToast.success('Infos mises a jour.');
    }

    setSaving(false);
  }

  async function triggerPasswordReset() {
    if (!practitioner?.email) return;

    const response = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email: practitioner.email })
    });

    if (!response.ok) {
      showToast.error('Erreur lors de la reinitialisation.');
      return;
    }

    showToast.success('Email de reinitialisation envoye.');
  }

  async function resendInvite() {
    if (!practitioner?.email) return;

    const response = await fetch('/api/admin/invite-practitioner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: practitioner.email,
        full_name: practitioner.full_name ?? '',
        calendly_url: practitioner.calendly_url ?? ''
      })
    });

    if (!response.ok) {
      showToast.error("Erreur lors de l'invitation.");
      return;
    }

    showToast.success('Invitation envoyee.');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Praticien" subtitle="Chargement..." />
      </div>
    );
  }

  if (!practitioner) {
    return (
      <div className="space-y-6">
        <PageHeader title="Praticien" subtitle="Praticien introuvable." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={practitioner.full_name ?? 'Praticien'}
        subtitle="Gestion de l'identite et des actions admin."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resendInvite}>
              Reinviter
            </Button>
            <Button variant="outline" onClick={triggerPasswordReset}>
              Reinitialiser mot de passe
            </Button>
            <Button onClick={() => router.push(`/admin/patients?practitioner=${practitioner.id}`)}>
              Voir patients
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold text-charcoal">Identite</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-warmgray">Email</label>
              <Input
                value={practitioner.email ?? ''}
                onChange={(event) =>
                  setPractitioner({
                    ...practitioner,
                    email: event.target.value
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warmgray">Nom complet</label>
              <Input
                value={practitioner.full_name ?? ''}
                onChange={(event) =>
                  setPractitioner({
                    ...practitioner,
                    full_name: event.target.value
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-warmgray">Calendly</label>
              <Input
                value={practitioner.calendly_url ?? ''}
                onChange={(event) =>
                  setPractitioner({
                    ...practitioner,
                    calendly_url: event.target.value
                  })
                }
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-base font-semibold text-charcoal">Statut</h3>
          <div>
            <label className="text-xs font-medium text-warmgray">Etat</label>
            <Select
              value={practitioner.status ?? 'active'}
              onChange={(event) =>
                setPractitioner({
                  ...practitioner,
                  status: event.target.value
                })
              }
            >
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-warmgray">Abonnement</label>
            <Select
              value={practitioner.subscription_status ?? ''}
              onChange={(event) =>
                setPractitioner({
                  ...practitioner,
                  subscription_status: event.target.value
                })
              }
            >
              <option value="">—</option>
              <option value="active">Actif</option>
              <option value="past_due">En retard</option>
              <option value="canceled">Annule</option>
            </Select>
          </div>
          <div className="text-xs text-warmgray">
            Cree le{' '}
            {practitioner.created_at
              ? new Date(practitioner.created_at).toLocaleDateString('fr-FR')
              : '—'}
          </div>
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Card>
      </div>

      <PageShell className="space-y-2">
        <h3 className="text-base font-semibold text-charcoal">Acces Billing</h3>
        <p className="text-sm text-warmgray">
          Consultez les informations Stripe associees a ce praticien.
        </p>
        <Button variant="outline" onClick={() => router.push(`/admin/billing?practitioner=${practitioner.id}`)}>
          Ouvrir la vue billing
        </Button>
      </PageShell>
    </div>
  );
}
