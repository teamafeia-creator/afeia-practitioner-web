'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Toast } from '../../../../components/ui/Toast';
import { createPatientRecord } from '../../../../services/patients';
import { createAnamneseInstance } from '../../../../services/anamnese';
import { sendQuestionnaireCode } from '../../../../services/questionnaire';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewPatientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [circularEnabled, setCircularEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Le nom du patient est obligatoire.');
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Merci de renseigner un email valide.');
      return;
    }

    const parsedAge = age ? Number(age) : undefined;
    if (parsedAge !== undefined && (Number.isNaN(parsedAge) || parsedAge < 0)) {
      setError('Merci de renseigner un âge valide.');
      return;
    }

    setLoading(true);
    try {
      const { patientId } = await createPatientRecord({
        name: name.trim(),
        email: trimmedEmail || undefined,
        city: city.trim() || undefined,
        age: parsedAge !== undefined && !Number.isNaN(parsedAge) ? parsedAge : null,
        status: isPremium ? 'premium' : 'standard',
        isPremium,
        circularEnabled
      });

      // ✅ TOUJOURS envoyer l'email si un email est fourni
      if (trimmedEmail) {
        try {
          await createAnamneseInstance(patientId);
          await sendQuestionnaireCode(patientId);
          setToast({
            title: '✅ Email envoyé avec succès',
            description: `Le code questionnaire a été envoyé à ${trimmedEmail}`,
            variant: 'success'
          });
          console.log(`✅✅✅ Email envoyé avec succès à ${trimmedEmail}`);
        } catch (emailErr) {
          const errorMessage = emailErr instanceof Error ? emailErr.message : 'Erreur inconnue';
          setToast({
            title: '❌ Erreur lors de l\'envoi',
            description: errorMessage,
            variant: 'error'
          });
          console.error('❌❌❌ Erreur envoi email:', emailErr);
          // Ne pas bloquer la création, continuer vers la page patient
        }
      }

      // Redirect to patient detail page with created flag
      router.push(`/patients/${patientId}?created=1`);
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
              label="Âge"
              type="number"
              min={0}
              value={age}
              onChange={(event) => setAge(event.target.value)}
              placeholder="35"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={(event) => setIsPremium(event.target.checked)}
                  className="h-4 w-4 rounded border-warmgray/40 text-teal focus:ring-teal/40"
                />
                Statut Premium
              </label>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={circularEnabled}
                  onChange={(event) => setCircularEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-warmgray/40 text-teal focus:ring-teal/40"
                />
                Circular activé
              </label>
            </div>

            {error ? (
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
                {error}
              </div>
            ) : null}

            <Button type="submit" loading={loading} className="w-full">
              Créer le patient
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
