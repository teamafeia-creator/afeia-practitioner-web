'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { SmallLineChart } from '../charts/SmallLineChart';
import { CalendlyButton } from '../calendly/CalendlyButton';
import {
  getPractitionerCalendlyUrl,
  markMessagesAsRead,
  sendMessage,
  updateAnamnese
} from '../../lib/queries';
import type {
  JournalEntry,
  Message,
  PatientWithDetails,
  WearableInsight,
  WearableSummary
} from '../../lib/types';

const TABS = ['Profil', 'Anamnèse', 'Circular', 'Journal', 'Messages'] as const;

type Tab = (typeof TABS)[number];

type AnamneseField = {
  key: keyof NonNullable<PatientWithDetails['anamnese']>;
  label: string;
};

const ANAMNESE_FIELDS: AnamneseField[] = [
  { key: 'alimentation', label: 'Habitudes alimentaires' },
  { key: 'digestion', label: 'Digestion' },
  { key: 'sommeil', label: 'Sommeil' },
  { key: 'stress', label: 'Stress' },
  { key: 'complement', label: 'Compléments' },
  { key: 'allergies', label: 'Allergies' }
];

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

function getLastSevenDays(summaries: WearableSummary[]): WearableSummary[] {
  const sorted = [...summaries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return sorted.slice(-7);
}

function renderAdherence(entry: JournalEntry) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-warmgray">
      <span>
        Hydratation : <strong className="text-marine">{entry.adherence_hydratation ? 'Oui' : 'Non'}</strong>
      </span>
      <span>
        Respiration : <strong className="text-marine">{entry.adherence_respiration ? 'Oui' : 'Non'}</strong>
      </span>
      <span>
        Mouvement : <strong className="text-marine">{entry.adherence_mouvement ? 'Oui' : 'Non'}</strong>
      </span>
      <span>
        Plantes : <strong className="text-marine">{entry.adherence_plantes ? 'Oui' : 'Non'}</strong>
      </span>
    </div>
  );
}

function renderInsight(insight: WearableInsight) {
  return (
    <div key={insight.id} className="rounded-2xl bg-sable p-4 ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-warmgray">Insight {insight.type ?? ''}</span>
        <Badge variant={insight.level === 'attention' ? 'attention' : 'info'}>
          {insight.level ?? 'info'}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-marine">{insight.message ?? '—'}</p>
      <p className="mt-2 text-xs text-warmgray">
        Suggestion : {insight.suggested_action ?? '—'}
      </p>
    </div>
  );
}

export function PatientTabs({ patient }: { patient: PatientWithDetails }) {
  const [tab, setTab] = useState<Tab>('Profil');
  const [motif, setMotif] = useState(patient.anamnese?.motif ?? '');
  const [objectifs, setObjectifs] = useState(patient.anamnese?.objectifs ?? '');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>(patient.messages ?? []);
  const [messageText, setMessageText] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [calendlyError, setCalendlyError] = useState<string | null>(null);

  const isPremium = patient.is_premium;
  const wearableSummaries = useMemo(
    () => patient.wearable_summaries ?? [],
    [patient.wearable_summaries]
  );
  const wearableInsights = patient.wearable_insights ?? [];
  const journalEntries = patient.journal_entries ?? [];
  const lastConsultation = patient.consultations?.[0]?.date ?? null;

  const lastSevenSummaries = useMemo(
    () => getLastSevenDays(wearableSummaries),
    [wearableSummaries]
  );

  const sleepSeries = lastSevenSummaries.map((summary) => summary.sleep_duration ?? 0);
  const hrvSeries = lastSevenSummaries.map((summary) => summary.hrv_avg ?? 0);
  const activitySeries = lastSevenSummaries.map((summary) => summary.activity_level ?? 0);

  useEffect(() => {
    setMessages(patient.messages ?? []);
  }, [patient.messages]);

  useEffect(() => {
    let active = true;
    async function loadCalendly() {
      try {
        console.log('[patient-tabs] loading calendly url');
        const url = await getPractitionerCalendlyUrl();
        if (!active) return;
        setCalendlyUrl(url);
        setCalendlyError(null);
      } catch (error) {
        if (!active) return;
        console.error('[patient-tabs] failed to load calendly url', error);
        setCalendlyError(error instanceof Error ? error.message : 'Erreur inconnue.');
      }
    }
    loadCalendly();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function markRead() {
      const success = await markMessagesAsRead(patient.id);
      if (!active || !success) return;
      setMessages((prev) =>
        prev.map((message) =>
          message.sender === 'patient' && !message.read_at
            ? { ...message, read_at: new Date().toISOString() }
            : message
        )
      );
    }
    markRead();
    return () => {
      active = false;
    };
  }, [patient.id]);

  async function handleSaveAnamnese() {
    setSaveStatus(null);
    setSaving(true);
    const updated = await updateAnamnese(patient.id, {
      motif: motif.trim() || null,
      objectifs: objectifs.trim() || null
    });
    if (updated) {
      setSaveStatus('Modifications enregistrées.');
    } else {
      setSaveStatus('Impossible d\'enregistrer les modifications.');
    }
    setSaving(false);
  }

  async function handleSendMessage() {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    setMessageLoading(true);
    const created = await sendMessage(patient.id, trimmed, 'praticien');
    if (created) {
      setMessages((prev) => [...prev, created]);
      setMessageText('');
    }
    setMessageLoading(false);
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
          </div>
          <p className="text-sm text-warmgray">
            {[patient.age ? `${patient.age} ans` : null, patient.city].filter(Boolean).join(' • ') || '—'}
          </p>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-nowrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10 transition',
                tab === t ? 'bg-teal text-white ring-teal/30' : 'bg-white hover:bg-sable'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Profil' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Rendez-vous</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-warmgray">Dernier RDV</p>
                  <p className="mt-1 text-sm text-marine">{formatDate(lastConsultation)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-warmgray">Prochain RDV</p>
                  <p className="mt-1 text-sm text-marine">À planifier</p>
                </div>
              </div>
              <CalendlyButton patient={patient} calendlyUrl={calendlyUrl} />
              {calendlyError ? (
                <p className="text-xs text-aubergine">Erreur Calendly : {calendlyError}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Profil</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-warmgray">Motif</p>
                <Textarea
                  className="mt-2"
                  value={motif}
                  onChange={(event) => setMotif(event.target.value)}
                  placeholder="Motif de consultation"
                  rows={3}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-warmgray">Objectifs</p>
                <Textarea
                  className="mt-2"
                  value={objectifs}
                  onChange={(event) => setObjectifs(event.target.value)}
                  placeholder="Objectifs du patient"
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleSaveAnamnese}
                  loading={saving}
                  className="w-full sm:w-auto"
                >
                  Enregistrer les modifications
                </Button>
                {saveStatus ? <span className="text-sm text-marine">{saveStatus}</span> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Tendances Circular (7 derniers jours)</h2>
            </CardHeader>
            <CardContent>
              {lastSevenSummaries.length === 0 ? (
                <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                  Aucune donnée Circular disponible.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <p className="text-xs uppercase tracking-wide text-warmgray">Sommeil (h)</p>
                    <p className="mt-2 text-sm text-marine">
                      Dernière valeur : {lastSevenSummaries.at(-1)?.sleep_duration?.toFixed(1) ?? '—'}
                    </p>
                    <SmallLineChart values={sleepSeries} />
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <p className="text-xs uppercase tracking-wide text-warmgray">HRV (ms)</p>
                    <p className="mt-2 text-sm text-marine">
                      Dernière valeur : {lastSevenSummaries.at(-1)?.hrv_avg ?? '—'}
                    </p>
                    <SmallLineChart values={hrvSeries} />
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <p className="text-xs uppercase tracking-wide text-warmgray">Activité (score)</p>
                    <p className="mt-2 text-sm text-marine">
                      Dernière valeur : {lastSevenSummaries.at(-1)?.activity_level ?? '—'}
                    </p>
                    <SmallLineChart values={activitySeries} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Anamnèse' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Anamnèse</h2>
          </CardHeader>
          <CardContent>
            {ANAMNESE_FIELDS.every((field) => !patient.anamnese?.[field.key]) ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucun détail d&apos;anamnèse disponible pour le moment.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {ANAMNESE_FIELDS.map((field) => (
                  <div key={field.key} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <p className="text-xs uppercase tracking-wide text-warmgray">{field.label}</p>
                    <p className="mt-2 text-sm text-marine whitespace-pre-line break-words">
                      {patient.anamnese?.[field.key] || '—'}
                    </p>
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
              {isPremium ? <Badge variant="premium">Actif</Badge> : <Badge variant="attention">Non activé</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {!isPremium ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Données Circular non activées.
              </div>
            ) : wearableSummaries.length === 0 ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucune donnée Circular disponible.
              </div>
            ) : (
              <div className="space-y-4">
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
                        <tr key={summary.id} className="border-t border-black/5">
                          <td className="py-2">{formatDate(summary.date)}</td>
                          <td className="py-2">
                            {summary.sleep_duration != null
                              ? `${summary.sleep_duration.toFixed(1)} h`
                              : '—'}
                          </td>
                          <td className="py-2">{summary.sleep_score ?? '—'}</td>
                          <td className="py-2">{summary.hrv_avg ?? '—'}</td>
                          <td className="py-2">{summary.activity_level ?? '—'}</td>
                          <td className="py-2">
                            {summary.completeness != null
                              ? `${Math.round(summary.completeness * 100)}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {wearableInsights.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {wearableInsights.map((insight) => renderInsight(insight))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                    Aucun insight Circular disponible.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Journal' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Journal</h2>
          </CardHeader>
          <CardContent>
            {journalEntries.length === 0 ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucune entrée de journal.
              </div>
            ) : (
              <div className="space-y-3">
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-charcoal">{formatDate(entry.date)}</p>
                      <div className="flex items-center gap-2 text-sm text-marine">
                        <span>{entry.mood ?? '—'}</span>
                        <span>{entry.energy ?? '—'}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-marine whitespace-pre-line break-words">{entry.text || '—'}</p>
                    <div className="mt-3">{renderAdherence(entry)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Messages' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Messages</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                Aucun message pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[90%] rounded-2xl px-4 py-2 text-sm ring-1 ring-black/5 sm:max-w-[78%]',
                      message.sender === 'patient'
                        ? 'bg-sable text-marine'
                        : 'ml-auto bg-teal text-white'
                    )}
                  >
                    <p className="break-words">{message.text || '—'}</p>
                    <p
                      className={cn(
                        'mt-1 text-[11px] opacity-80',
                        message.sender === 'patient' ? 'text-warmgray' : 'text-white/80'
                      )}
                    >
                      {formatDate(message.sent_at, true)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Textarea
                placeholder="Écrire un message au patient..."
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                rows={4}
              />
              <Button
                variant="primary"
                onClick={handleSendMessage}
                loading={messageLoading}
                className="w-full sm:w-auto"
              >
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
