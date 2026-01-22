'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { SmallLineChart } from '../charts/SmallLineChart';
import { createAnamneseInstance } from '../../services/anamnese';
import { sendQuestionnaireCode, type SendQuestionnaireCodeResponse } from '../../services/questionnaire';
import type { PatientDetail } from '../../services/patients';

const TABS = ['Infos', 'Questionnaire', 'Messages', 'Rendez-vous', 'Circular'] as const;

type Tab = (typeof TABS)[number];

type AnswerEntry = {
  key: string;
  label: string;
  value: string;
};

const QUESTION_LABELS: Record<string, string> = {
  motif: 'Motif de consultation',
  objectifs: 'Objectifs',
  alimentation: 'Habitudes alimentaires',
  digestion: 'Digestion',
  sommeil: 'Sommeil',
  stress: 'Stress',
  complement: 'Compléments',
  allergies: 'Allergies'
};

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  return withTime ? DATE_TIME_FORMATTER.format(date) : DATE_FORMATTER.format(date);
}

export function PatientTabs({ patient }: { patient: PatientDetail }) {
  const [tab, setTab] = useState<Tab>('Infos');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [anamneseStatus, setAnamneseStatus] = useState(patient.anamnese.status);

  const isPremium = patient.status === 'premium' || patient.isPremium;
  const answerEntries = useMemo<AnswerEntry[]>(() => {
    const answers = patient.anamnese.answers ?? {};
    return Object.entries(answers)
      .map(([key, value]) => ({
        key,
        label: QUESTION_LABELS[key] ?? key,
        value
      }))
      .filter((entry) => entry.value?.trim());
  }, [patient.anamnese.answers]);

  const hasAnswers = answerEntries.length > 0;

  const wearableSummaries = patient.wearableSummaries;
  const sleepSeries = wearableSummaries.map((summary) => summary.sleepDuration ?? 0);
  const hrvSeries = wearableSummaries.map((summary) => summary.hrvAvg ?? 0);

  async function handleSendAnamnese() {
    setInviteError(null);
    setInviteSuccess(null);

    if (!patient.email) {
      setInviteError('Email requis pour envoyer le questionnaire.');
      return;
    }

    setInviteLoading(true);
    try {
      await createAnamneseInstance(patient.id);
      const result: SendQuestionnaireCodeResponse = await sendQuestionnaireCode(patient.id);
      setInviteSuccess(`Code envoyé à ${result.sentToEmail}.`);
      setCodeExpiresAt(result.expiresAt);
      setAnamneseStatus('PENDING');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Impossible d\'envoyer le questionnaire.');
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-charcoal">{patient.name}</h1>
            <Badge variant={isPremium ? 'premium' : 'info'}>
              {isPremium ? 'Premium' : 'Standard'}
            </Badge>
            {patient.circularEnabled ? <Badge variant="success">Circular actif</Badge> : null}
          </div>
          <p className="text-sm text-warmgray">
            {[patient.age ? `${patient.age} ans` : null, patient.city].filter(Boolean).join(' • ') || '—'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/plans" className="text-sm text-teal hover:underline">
            Voir les plans
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10 transition',
              tab === t ? 'bg-teal text-white ring-teal/30' : 'bg-white hover:bg-sable'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Infos' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fiche patient</h2>
              <div className="flex flex-wrap gap-2">
                {anamneseStatus === 'PENDING' ? <Badge variant="new">Questionnaire</Badge> : null}
                {patient.messages.length > 0 ? (
                  <Badge variant="attention">{patient.messages.length} msg</Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-sable p-4 ring-1 ring-black/5">
                <p className="text-xs uppercase tracking-wide text-warmgray">Contact</p>
                <p className="mt-2 text-sm text-marine">Email : {patient.email ?? '—'}</p>
                <p className="mt-1 text-sm text-marine">Ville : {patient.city ?? '—'}</p>
                <p className="mt-1 text-sm text-marine">Âge : {patient.age ?? '—'}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="text-xs uppercase tracking-wide text-warmgray">Suivi</p>
                <p className="mt-2 text-sm text-marine">
                  Dernière synchro Circular : {formatDate(patient.lastCircularSyncAt)}
                </p>
                <p className="mt-1 text-sm text-marine">Créé le : {formatDate(patient.createdAt)}</p>
                <p className="mt-1 text-sm text-marine">Mis à jour : {formatDate(patient.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'Questionnaire' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold">Anamnèse</h2>
              <Button variant="secondary" onClick={handleSendAnamnese} loading={inviteLoading}>
                {codeExpiresAt || anamneseStatus === 'PENDING'
                  ? 'Renvoyer un code'
                  : 'Envoyer le code questionnaire'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-warmgray">
              Statut :{' '}
              <span className="font-medium text-marine">
                {anamneseStatus === 'PENDING'
                  ? 'À compléter'
                  : anamneseStatus === 'COMPLETED'
                    ? 'Complétée'
                    : 'Non envoyée'}
              </span>
            </div>

            {inviteError ? (
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-marine">
                {inviteError}
              </div>
            ) : null}

            {inviteSuccess ? (
              <div className="rounded-xl border border-teal/20 bg-teal/5 p-3 text-sm text-marine">
                <p>{inviteSuccess}</p>
                {codeExpiresAt ? (
                  <p className="mt-1 text-xs text-warmgray">
                    Expire à {formatDate(codeExpiresAt, true)}.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl border border-warmgray/20 bg-sable/40 p-3 text-sm text-marine">
              Le code est valable 30 minutes et utilisable une seule fois.
            </div>

            {hasAnswers ? (
              <div className="grid gap-4 md:grid-cols-2">
                {answerEntries.map((entry) => (
                  <div key={entry.key} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <p className="text-xs uppercase tracking-wide text-warmgray">{entry.label}</p>
                    <p className="mt-2 text-sm text-marine whitespace-pre-line">{entry.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucun détail d&apos;anamnèse disponible pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Messages' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Messagerie</h2>
          </CardHeader>
          <CardContent>
            {patient.messages.length === 0 ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucun message pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {patient.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[78%] rounded-2xl px-4 py-2 text-sm ring-1 ring-black/5',
                      message.senderRole === 'patient'
                        ? 'bg-sable text-marine'
                        : 'ml-auto bg-teal text-white'
                    )}
                  >
                    <p>{message.text || '—'}</p>
                    <p
                      className={cn(
                        'mt-1 text-[11px] opacity-80',
                        message.senderRole === 'patient' ? 'text-warmgray' : 'text-white/80'
                      )}
                    >
                      {formatDate(message.sentAt, true)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Rendez-vous' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Rendez-vous</h2>
          </CardHeader>
          <CardContent>
            {patient.appointments.length === 0 ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucun rendez-vous planifié.
              </div>
            ) : (
              <div className="space-y-3">
                {patient.appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-charcoal">
                        {formatDate(appointment.startAt, true)}
                      </p>
                      <Badge variant={appointment.status === 'done' ? 'success' : 'info'}>
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Circular' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Circular</h2>
              {patient.circularEnabled ? (
                <Badge variant="premium">Actif</Badge>
              ) : (
                <Badge variant="attention">Non activé</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!patient.circularEnabled ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Option Premium : sommeil, HRV, activité. Synchronisation 1×/jour + à l’ouverture.
              </div>
            ) : wearableSummaries.length === 0 ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucune donnée Circular disponible.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <p className="text-xs uppercase tracking-wide text-warmgray">Sommeil (h)</p>
                    <p className="mt-2 text-sm text-marine">
                      Dernière valeur : {wearableSummaries[0]?.sleepDuration?.toFixed(1) ?? '—'}
                    </p>
                    <SmallLineChart values={sleepSeries} />
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <p className="text-xs uppercase tracking-wide text-warmgray">HRV (ms)</p>
                    <p className="mt-2 text-sm text-marine">Dernière valeur : {wearableSummaries[0]?.hrvAvg ?? '—'}</p>
                    <SmallLineChart values={hrvSeries} />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-warmgray">
                        <th className="py-2">Date</th>
                        <th className="py-2">Sommeil</th>
                        <th className="py-2">Score</th>
                        <th className="py-2">HRV</th>
                        <th className="py-2">Activité</th>
                        <th className="py-2">Complétude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wearableSummaries.map((summary) => (
                        <tr key={summary.date} className="border-t border-black/5">
                          <td className="py-2">{summary.date}</td>
                          <td className="py-2">
                            {summary.sleepDuration !== null ? `${summary.sleepDuration.toFixed(1)} h` : '—'}
                          </td>
                          <td className="py-2">{summary.sleepScore ?? '—'}</td>
                          <td className="py-2">{summary.hrvAvg ?? '—'}</td>
                          <td className="py-2">{summary.activityLevel ?? '—'}</td>
                          <td className="py-2">
                            {summary.completeness !== null
                              ? `${Math.round(summary.completeness * 100)}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {patient.wearableInsights.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {patient.wearableInsights.map((insight) => (
                      <div key={insight.id} className="rounded-2xl bg-sable p-4 ring-1 ring-black/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wide text-warmgray">Insight</span>
                          <Badge variant={insight.level === 'attention' ? 'attention' : 'info'}>
                            {insight.level ?? 'info'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-marine">{insight.message ?? '—'}</p>
                        <p className="mt-2 text-xs text-warmgray">
                          Suggestion : {insight.suggestedAction ?? '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
