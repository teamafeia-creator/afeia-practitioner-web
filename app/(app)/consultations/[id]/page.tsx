'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockPatients } from '../../../../lib/mock';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';

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

  const patient = useMemo(() => {
    return mockPatients.find((p) => p.consultations.some((c) => c.id === consultationId));
  }, [consultationId]);

  const consultation = useMemo(() => {
    return patient?.consultations.find((c) => c.id === consultationId);
  }, [patient, consultationId]);

  const [notes, setNotes] = useState(consultation?.notes ?? '');
  const [ai, setAi] = useState('');

  if (!patient || !consultation) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Consultation introuvable</h1>
        <p className="text-sm text-warmgray">Vérifiez l’identifiant ou revenez à la liste des patients.</p>
        <Button variant="secondary" onClick={() => router.push('/patients')}>Retour patients</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Consultation</h1>
          <div className="mt-1 text-sm text-warmgray">
            <Link className="text-teal hover:underline" href={`/patients/${patient.id}`}>{patient.name}</Link>
            <span className="mx-2">•</span>
            <span>{new Date(consultation.date).toLocaleString('fr-FR')}</span>
            {patient.isPremium ? (
              <>
                <span className="mx-2">•</span>
                <Badge variant="premium">Premium</Badge>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => router.push(`/plans/${patient.plan.id}`)}>Ouvrir le plan</Button>
          <Button variant="secondary" onClick={() => alert('🧾 Export PDF (à brancher)')}>Exporter</Button>
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
                  <Button onClick={() => alert('✅ Enregistré (mock)')}>Enregistrer</Button>
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
                Rappel éthique : pas de diagnostic, pas d’interprétation médicale. Utilisez un ton neutre et factuel.
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
              <h2 className="text-sm font-semibold">Contexte patient</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-warmgray">Motif</div>
                <div className="text-sm text-charcoal">{patient.anamnese.motif}</div>
              </div>
              <div>
                <div className="text-xs text-warmgray">Objectifs</div>
                <div className="text-sm text-charcoal">{patient.anamnese.objectifs}</div>
              </div>
              <div>
                <div className="text-xs text-warmgray">Dernière entrée journal</div>
                <div className="text-sm text-charcoal">{patient.journal[0]?.text ?? '—'}</div>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-black/5 p-3">
                <div className="text-xs text-warmgray">Prochaine action</div>
                <div className="mt-1 text-sm text-charcoal">
                  {patient.isPremium ? 'Analyser la semaine Circular et ajuster le plan.' : 'Finaliser les objectifs mesurables.'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Actions rapides</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="primary" onClick={() => router.push(`/plans/${patient.plan.id}`)}>Créer / ajuster le plan</Button>
              <Button variant="secondary" onClick={() => alert('📩 Message envoyé (mock)')}>Envoyer un message au patient</Button>
              <Button variant="ghost" onClick={() => alert('🩺 Orientation médecin (template)')}>
                Proposer une orientation médicale (si nécessaire)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
