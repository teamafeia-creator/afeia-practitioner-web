'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { createPatientRecord } from '../../../../services/patients';
import { createPatientInvite, generateInviteToken } from '../../../../services/invites';
import { createAnamneseInstance } from '../../../../services/anamnese';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasInvite = useMemo(() => Boolean(inviteLink), [inviteLink]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCopied(false);
    setInviteLink(null);

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

    const parsedAge = age ? Number(age) : null;
    if (age) {
      if (Number.isNaN(parsedAge) || parsedAge < 0) {
        setError('Merci de renseigner un âge valide.');
        return;
      }
    }

    setLoading(true);
    try {
      const { patientId, practitionerId } = await createPatientRecord({
        name: name.trim(),
        email: trimmedEmail || undefined,
        city: city.trim() || undefined,
        age: parsedAge !== null && !Number.isNaN(parsedAge) ? parsedAge : null,
        status: isPremium ? 'premium' : 'standard',
        isPremium,
        circularEnabled
      });

      if (sendAnamnese) {
        await createAnamneseInstance(patientId);
        const token = await generateInviteToken();

        await createPatientInvite({
          practitionerId,
          patientId,
          token,
          email: trimmedEmail
        });

        const link = `${window.location.origin}/invite?token=${token}`;
        setInviteLink(link);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function copyInvite() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch (err) {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Ajouter un patient</h1>
          <p className="text-sm text-warmgray">Créez le dossier et partagez un lien unique.</p>
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
              Envoyer questionnaire Anamnèse (obligatoire à la première connexion)
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
            <h2 className="text-sm font-semibold">Lien d&apos;invitation</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-warmgray">Envoyez ce lien au patient.</p>
            <div className="rounded-xl border border-warmgray/30 bg-white px-4 py-3 text-sm text-marine break-all">
              {inviteLink}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={copyInvite}>
                Copier le lien
              </Button>
              {copied ? <span className="text-sm text-teal">Lien copié.</span> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
