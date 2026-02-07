'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getConsultationById, getConsultantById } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import type { Consultation, ConsultantWithDetails } from '@/lib/types';

function fakeAiSummary(notes: string) {
  const trimmed = notes.trim();
  if (!trimmed) return '';
  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const keyPoints = lines.slice(0, 6).map((l) => `• ${l.replace(/^[-*•]\s*/, '')}`);
  return [
    'Résumé (proposition IA — à valider) :',
    ...keyPoints,
    '',
    '⚠️ Note : aucune interprétation médicale, uniquement un résumé des éléments saisis.'
  ].join('\n');
}

export default function ConsultationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const consultationId = params.id;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [consultant, setConsultant] = useState<ConsultantWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [ai, setAi] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  // Load consultation and consultant data
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);

      // Fetch consultation
      const consultationData = await getConsultationById(consultationId);
      if (!active) return;

      if (!consultationData) {
        setLoading(false);
        return;
      }

      setConsultation(consultationData);
      setNotes(consultationData.notes ?? '');

      // Fetch full consultant details
      if (consultationData.consultant_id) {
        const consultantData = await getConsultantById(consultationData.consultant_id);
        if (!active) return;
        setConsultant(consultantData);
      }

      setLoading(false);
    }

    if (consultationId) {
      loadData();
    }

    return () => {
      active = false;
    };
  }, [consultationId]);

  // Save consultation notes
  async function handleSaveNotes() {
    if (!consultation) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({
          notes: notes.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', consultation.id);

      if (error) {
        throw error;
      }

      setToast({
        title: 'Notes enregistrées',
        description: 'Les notes de consultation ont été mises à jour.',
        variant: 'success'
      });
    } catch (err) {
      console.error('Error saving notes:', err);
      setToast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les notes.',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warmgray">
        Chargement de la consultation…
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Consultation introuvable</h1>
        <p className="text-sm text-warmgray">Vérifiez l&apos;identifiant ou revenez à la liste des consultants.</p>
        <Button variant="secondary" onClick={() => router.push('/consultants')}>Retour consultants</Button>
      </div>
    );
  }

  // Get anamnesis data from consultant_anamnesis or anamnese
  const anamnesisAnswers = consultant?.consultant_anamnesis?.answers ?? {};
  const motif = (typeof anamnesisAnswers === 'object' && 'motif' in anamnesisAnswers)
    ? (anamnesisAnswers as Record<string, string>).motif
    : consultant?.anamnese?.motif ?? consultant?.consultation_reason ?? '—';
  const objectifs = (typeof anamnesisAnswers === 'object' && 'objectifs' in anamnesisAnswers)
    ? (anamnesisAnswers as Record<string, string>).objectifs
    : consultant?.anamnese?.objectifs ?? '—';

  // Get last journal entry
  const lastJournalEntry = consultant?.journal_entries?.[0]?.text ?? '—';

  // Get first consultant plan ID for navigation
  const firstPlanId = consultant?.consultant_plans?.[0]?.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Consultation</h1>
          <div className="mt-1 text-sm text-warmgray">
            {consultant ? (
              <Link className="text-teal hover:underline" href={`/consultants/${consultant.id}`}>{consultant.name}</Link>
            ) : (
              <span>Consultant inconnu</span>
            )}
            <span className="mx-2">•</span>
            <span>{new Date(consultation.date).toLocaleString('fr-FR')}</span>
            {consultant?.is_premium ? (
              <>
                <span className="mx-2">•</span>
                <Badge variant="premium">Premium</Badge>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {firstPlanId && (
            <Button variant="primary" onClick={() => router.push(`/consultants/${consultant?.id}?tab=Plan%20de%20naturopathie`)}>
              Ouvrir le plan
            </Button>
          )}
          <Button variant="secondary" onClick={() => setToast({ title: 'Export PDF', description: 'Fonctionnalité en cours de développement.', variant: 'info' })}>
            Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Notes de séance</h2>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setAi(fakeAiSummary(notes))}>Générer résumé IA</Button>
                  <Button onClick={handleSaveNotes} loading={saving}>Enregistrer</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[280px] w-full rounded-2xl border border-black/10 bg-white p-3 text-sm text-charcoal placeholder:text-warmgray focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                placeholder="Saisissez vos observations, questions clés, hypothèses (non médicales), et éléments validés avec le client..."
              />
              <p className="mt-2 text-xs text-warmgray">
                Rappel éthique : pas de diagnostic, pas d&apos;interprétation médicale. Utilisez un ton neutre et factuel.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Résumé (IA)</h2>
            </CardHeader>
            <CardContent>
              {ai ? (
                <pre className="whitespace-pre-wrap rounded-2xl bg-sable p-3 text-sm text-marine ring-1 ring-black/5">{ai}</pre>
              ) : (
                <div className="rounded-2xl bg-sable p-3 text-sm text-warmgray ring-1 ring-black/5">
                  Cliquez sur « Générer résumé IA » pour obtenir une proposition. Vous gardez toujours le contrôle.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Contexte consultant</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-warmgray">Motif</div>
                <div className="text-sm text-charcoal">{motif}</div>
              </div>
              <div>
                <div className="text-xs text-warmgray">Objectifs</div>
                <div className="text-sm text-charcoal">{objectifs}</div>
              </div>
              <div>
                <div className="text-xs text-warmgray">Dernière entrée journal</div>
                <div className="text-sm text-charcoal">{lastJournalEntry}</div>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-black/5 p-3">
                <div className="text-xs text-warmgray">Prochaine action</div>
                <div className="mt-1 text-sm text-charcoal">
                  {consultant?.is_premium ? 'Analyser la semaine Circular et ajuster le plan.' : 'Finaliser les objectifs mesurables.'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Actions rapides</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {consultant && (
                <>
                  <Button variant="primary" onClick={() => router.push(`/consultants/${consultant.id}?tab=Plan%20de%20naturopathie`)}>
                    Créer / ajuster le plan
                  </Button>
                  <Button variant="secondary" onClick={() => router.push(`/consultants/${consultant.id}?tab=Messages`)}>
                    Envoyer un message au consultant
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setToast({ title: 'Orientation médicale', description: 'Fonctionnalité en cours de développement.', variant: 'info' })}>
                Proposer une orientation médicale (si nécessaire)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

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
