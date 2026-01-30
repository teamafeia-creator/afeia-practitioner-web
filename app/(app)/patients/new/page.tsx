'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Toast } from '../../../../components/ui/Toast';
import { invitationService } from '../../../../services/invitation.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewPatientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setActivationCode(null);

    if (!name.trim()) {
      setError('Le nom du patient est obligatoire.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('L\'email du patient est obligatoire pour envoyer le code d\'activation.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Merci de renseigner un email valide.');
      return;
    }

    setLoading(true);
    try {
      // Crée une invitation et un patient avec activated=false
      const result = await invitationService.createInvitation({
        email: trimmedEmail,
        name: name.trim(),
        city: city.trim() || undefined,
        phone: phone.trim() || undefined
      });

      if (!result.success) {
        setError(result.error || 'Une erreur est survenue.');
        setLoading(false);
        return;
      }

      // Afficher le code
      if (result.code) {
        setActivationCode(result.code);
        console.log('Code d\'activation:', result.code);
      }

      console.log('Patient créé avec ID:', result.patientId);
      console.log('Invitation créée avec ID:', result.invitationId);

      setToast({
        title: 'Patient créé',
        description: `Un email a été envoyé à ${trimmedEmail} avec le code d'activation.`,
        variant: 'success'
      });

      // Rediriger vers la fiche du patient avec le code d'activation
      if (result.patientId) {
        setTimeout(() => {
          const params = new URLSearchParams();
          params.set('created', '1');
          if (result.code) {
            params.set('activation_code', result.code);
          }
          router.push(`/patients/${result.patientId}?${params.toString()}`);
        }, 1000);
      } else {
        // Fallback vers la liste si pas de patient ID
        setTimeout(() => {
          router.push('/patients?created=1');
        }, 2000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Ajouter un patient</h1>
          <p className="text-sm text-warmgray">Créez le dossier et envoyez un code sécurisé.</p>
        </div>
        <Link href="/patients">
          <Button variant="secondary">Retour</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Informations patient</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Nom complet"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Camille Dupont"
              required
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom@exemple.com"
              />
              <Input
                label="Ville"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Lyon"
              />
            </div>
            <Input
              label="Téléphone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="06 12 34 56 78"
            />

            {error ? (
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
                {error}
              </div>
            ) : null}

            {activationCode ? (
              <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-sm">
                <p className="font-semibold text-teal">Code d&apos;activation :</p>
                <p className="font-mono text-2xl font-bold tracking-widest mt-2 text-charcoal">{activationCode}</p>
                <p className="text-xs text-warmgray mt-2">
                  Ce code a été envoyé par email au patient. Vous pouvez le lui transmettre directement si besoin.
                </p>
              </div>
            ) : null}

            <Button type="submit" loading={loading} className="w-full">
              Envoyer le code d&apos;activation
            </Button>
          </form>
        </CardContent>
      </Card>

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
