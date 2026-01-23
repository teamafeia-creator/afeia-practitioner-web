'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { createPatientRecord } from '../../../../services/patients';
import { createAnamneseInstance } from '../../../../services/anamnese';
import { sendQuestionnaireCode, type SendQuestionnaireCodeResponse } from '../../../../services/questionnaire';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return DATE_TIME_FORMATTER.format(date);
}

export default function NewPatientPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [circularEnabled, setCircularEnabled] = useState(false);
  const [sendAnamnese, setSendAnamnese] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const hasInvite = useMemo(() => Boolean(inviteSuccess), [inviteSuccess]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInviteSuccess(null);
    setCodeExpiresAt(null);

    if (!name.trim()) {
      setError('Le nom du patient est obligatoire.');
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Merci de renseigner un email valide.');
      return;
    }

    if (sendAnamnese && !trimmedEmail) {
      setError('Email requis pour envoyer le questionnaire.');
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

      if (sendAnamnese) {
        await createAnamneseInstance(patientId);
        const { sentToEmail, expiresAt } =
          (await sendQuestionnaireCode(patientId)) as SendQuestionnaireCodeResponse;
        setInviteSuccess(`Code envoyé à ${sentToEmail}.`);
        setCodeExpiresAt(expiresAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
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

            <label className="flex items-center gap-3 rounded-xl border border-warmgray/20 bg-sable/40 px-4 py-3 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={sendAnamnese}
                onChange={(event) => setSendAnamnese(event.target.checked)}
                className="h-4 w-4 rounded border-warmgray/40 text-teal focus:ring-teal/40"
              />
              Envoyer le code questionnaire Anamnèse (obligatoire à la première connexion)
            </label>

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

      {hasInvite ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Code envoyé</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-warmgray">{inviteSuccess}</p>
            {codeExpiresAt ? (
              <p className="text-xs text-warmgray">Expire à {formatDate(codeExpiresAt, true)}.</p>
            ) : null}
            <div className="rounded-xl border border-warmgray/20 bg-sable/40 p-3 text-sm text-marine">
              Le code est valable 30 minutes et utilisable une seule fois.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
