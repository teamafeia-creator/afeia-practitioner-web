'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Toast } from '../../../../components/ui/Toast';
import { ActivationCodeModal } from '../../../../components/patients/ActivationCodeModal';
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
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
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

      // Afficher le code dans la modale
      if (result.code) {
        setActivationCode(result.code);
        setCreatedPatientId(result.patientId || null);
        setShowCodeModal(true);
        setLoading(false);
        console.log('Code d\'activation:', result.code);
      } else {
        // Pas de code, rediriger directement
        setToast({
          title: 'Patient cree',
          description: `Un email a ete envoye a ${trimmedEmail}.`,
          variant: 'success'
        });
        if (result.patientId) {
          setTimeout(() => {
            router.push(`/patients/${result.patientId}?created=1`);
          }, 1000);
        } else {
          setTimeout(() => {
            router.push('/patients?created=1');
          }, 1000);
        }
      }

      console.log('Patient cree avec ID:', result.patientId);
      console.log('Invitation creee avec ID:', result.invitationId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setLoading(false);
    }
  }

  // Fermeture de la modale et redirection vers la fiche patient
  const handleModalClose = () => {
    setShowCodeModal(false);
    if (createdPatientId) {
      router.push(`/patients/${createdPatientId}`);
    } else {
      router.push('/patients');
    }
  };

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

            <Button type="submit" loading={loading} className="w-full">
              Envoyer le code d&apos;activation
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Modale d'affichage du code d'activation */}
      {activationCode && email && (
        <ActivationCodeModal
          isOpen={showCodeModal}
          onClose={handleModalClose}
          code={activationCode}
          patientEmail={email}
          patientName={name}
        />
      )}

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
