'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Textarea } from '../../../components/ui/Textarea';
import { submitAnamnese } from '../../../services/anamnese';

const QUESTIONS = [
  { key: 'motif', label: 'Motif de consultation' },
  { key: 'objectifs', label: 'Objectifs' },
  { key: 'alimentation', label: 'Habitudes alimentaires' },
  { key: 'digestion', label: 'Digestion' },
  { key: 'sommeil', label: 'Sommeil' },
  { key: 'stress', label: 'Stress' },
  { key: 'complement', label: 'Compléments' },
  { key: 'allergies', label: 'Allergies' }
];

type AnamneseStatus = 'PENDING' | 'COMPLETED' | null;

export default function AnamnesePage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [status, setStatus] = useState<AnamneseStatus>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isPending = useMemo(() => status === 'PENDING', [status]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!sessionData.session) {
        setError('Merci de vous connecter via votre lien d’invitation.');
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;
      const { data: membership, error: membershipError } = await supabase
        .from('patient_memberships')
        .select('patient_id')
        .eq('patient_user_id', userId)
        .single();

      if (!mounted) return;

      if (membershipError || !membership) {
        setError('Nous ne retrouvons pas votre dossier patient.');
        setLoading(false);
        return;
      }

      setPatientId(membership.patient_id);

      const { data: anamnese, error: anamneseError } = await supabase
        .from('anamnese_instances')
        .select('status, answers')
        .eq('patient_id', membership.patient_id)
        .maybeSingle();

      if (!mounted) return;

      if (anamneseError) {
        setError('Impossible de charger votre anamnèse.');
        setLoading(false);
        return;
      }

      setStatus(anamnese?.status ?? null);
      if (anamnese?.answers) {
        setAnswers(anamnese.answers as Record<string, string>);
      }
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!patientId) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await submitAnamnese(patientId, answers);
      setStatus('COMPLETED');
      setMessage('Merci ! Votre anamnèse est bien enregistrée.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-sable flex items-center justify-center p-6">
        <div className="text-warmgray">Chargement...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sable flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Image src="/afeia_symbol.svg" alt="AFEIA" width={36} height={36} />
          <div>
            <div className="text-2xl font-semibold tracking-tight">Afeia</div>
            <div className="text-sm text-warmgray">Anamnèse obligatoire</div>
          </div>
        </div>

        <Card className="p-6">
          {error ? (
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-marine">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-sm text-marine">
              {message}
            </div>
          ) : null}

          {status === null ? (
            <div className="text-sm text-warmgray">Aucune anamnèse en attente.</div>
          ) : null}

          {status === 'COMPLETED' ? (
            <div className="text-sm text-warmgray">Votre anamnèse est déjà complétée.</div>
          ) : null}

          {isPending ? (
            <form onSubmit={onSubmit} className="space-y-4">
              {QUESTIONS.map((question) => (
                <label key={question.key} className="block text-sm text-charcoal">
                  <span className="font-medium">{question.label}</span>
                  <Textarea
                    value={answers[question.key] ?? ''}
                    onChange={(event) => updateAnswer(question.key, event.target.value)}
                    placeholder="Votre réponse..."
                    className="mt-2"
                  />
                </label>
              ))}

              <Button type="submit" className="w-full" loading={submitting}>
                Envoyer l’anamnèse
              </Button>
            </form>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
