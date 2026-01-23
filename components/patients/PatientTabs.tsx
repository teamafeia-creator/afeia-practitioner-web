'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Toast } from '../ui/Toast';
import { SmallLineChart } from '../charts/SmallLineChart';
import {
  createAppointment,
  markMessagesAsRead,
  sendMessage,
  updatePatient,
  getAppointmentsForPatient,
  upsertJournalEntry,
  upsertPatientAnamnesis,
  upsertPractitionerNote
} from '../../lib/queries';
import { ANAMNESIS_SECTIONS } from '../../lib/anamnesis';
import type {
  JournalEntry,
  Message,
  Appointment,
  PatientWithDetails,
  WearableInsight,
  WearableSummary
} from '../../lib/types';

const TABS = ['Profil', 'Rendez-vous', 'Anamnèse', 'Circular', 'Journal', 'Notes consultation', 'Messages'] as const;

type Tab = (typeof TABS)[number];

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

function formatAnswer(value?: string) {
  if (!value) return 'Non renseigné';
  return value;
}

function formatValue(value?: string | number | null, emptyLabel = 'Non renseigné') {
  if (value === null || value === undefined || value === '') {
    return emptyLabel;
  }
  return String(value);
}

function buildJournalForm(entry?: JournalEntry): Partial<JournalEntry> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: entry?.id,
    date: entry?.date ?? today,
    mood: entry?.mood ?? undefined,
    energy: entry?.energy ?? undefined,
    text: entry?.text ?? '',
    adherence_hydratation: entry?.adherence_hydratation ?? false,
    adherence_respiration: entry?.adherence_respiration ?? false,
    adherence_mouvement: entry?.adherence_mouvement ?? false,
    adherence_plantes: entry?.adherence_plantes ?? false
  };
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
  const [patientState, setPatientState] = useState<PatientWithDetails>(patient);
  const [tab, setTab] = useState<Tab>('Profil');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: patient.name ?? '',
    email: patient.email ?? '',
    age: patient.age?.toString() ?? '',
    city: patient.city ?? '',
    consultationReason: patient.consultation_reason ?? ''
  });
  const [messages, setMessages] = useState<Message[]>(patient.messages ?? []);
  const [messageText, setMessageText] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [anamnesisEditing, setAnamnesisEditing] = useState(false);
  const [anamnesisSaving, setAnamnesisSaving] = useState(false);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, string>>(
    patient.patient_anamnesis?.answers ?? {}
  );
  const [journalEditing, setJournalEditing] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalForm, setJournalForm] = useState<Partial<JournalEntry>>({});
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteContent, setNoteContent] = useState(patient.practitioner_note?.content ?? '');
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentSaving, setAppointmentSaving] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    startsAt: '',
    durationMinutes: '60',
    notes: ''
  });
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: 'success' | 'error' | 'info';
  } | null>(null);

  const isPremium = patientState.is_premium;
  const wearableSummaries = useMemo(
    () => patientState.wearable_summaries ?? [],
    [patientState.wearable_summaries]
  );
  const wearableInsights = patientState.wearable_insights ?? [];
  const journalEntries = patientState.journal_entries ?? [];

  const lastSevenSummaries = useMemo(
    () => getLastSevenDays(wearableSummaries),
    [wearableSummaries]
  );

  const profileSnapshot = useMemo(
    () => ({
      name: patientState.name ?? '',
      email: patientState.email ?? '',
      age: patientState.age?.toString() ?? '',
      city: patientState.city ?? '',
      consultationReason: patientState.consultation_reason ?? ''
    }),
    [patientState]
  );

  const normalizedProfileForm = useMemo(
    () => ({
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      age: profileForm.age.trim(),
      city: profileForm.city.trim(),
      consultationReason: profileForm.consultationReason.trim()
    }),
    [profileForm]
  );

  const normalizedProfileSnapshot = useMemo(
    () => ({
      name: profileSnapshot.name.trim(),
      email: profileSnapshot.email.trim(),
      age: profileSnapshot.age.trim(),
      city: profileSnapshot.city.trim(),
      consultationReason: profileSnapshot.consultationReason.trim()
    }),
    [profileSnapshot]
  );

  const isProfileDirty = useMemo(
    () => JSON.stringify(normalizedProfileForm) !== JSON.stringify(normalizedProfileSnapshot),
    [normalizedProfileForm, normalizedProfileSnapshot]
  );

  const upcomingAppointment = useMemo(() => {
    const now = Date.now();
    return [...appointments]
      .filter((appointment) => appointment.status === 'scheduled')
      .filter((appointment) => new Date(appointment.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  }, [appointments]);

  const sleepSeries = lastSevenSummaries.map((summary) => summary.sleep_duration ?? 0);
  const hrvSeries = lastSevenSummaries.map((summary) => summary.hrv_avg ?? 0);
  const activitySeries = lastSevenSummaries.map((summary) => summary.activity_level ?? 0);

  useEffect(() => {
    setPatientState(patient);
    setProfileForm({
      name: patient.name ?? '',
      email: patient.email ?? '',
      age: patient.age?.toString() ?? '',
      city: patient.city ?? '',
      consultationReason: patient.consultation_reason ?? ''
    });
    setProfileEditing(false);
    setMessages(patient.messages ?? []);
    setAnamnesisAnswers(patient.patient_anamnesis?.answers ?? {});
    setNoteContent(patient.practitioner_note?.content ?? '');
    setJournalForm(buildJournalForm(patient.journal_entries?.[0]));
    setAppointments([]);
    setAppointmentsError(null);
  }, [patient]);

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

  useEffect(() => {
    if (tab !== 'Rendez-vous') return;
    let active = true;
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    getAppointmentsForPatient(patient.id)
      .then((data) => {
        if (!active) return;
        setAppointments(data);
      })
      .catch((error) => {
        if (!active) return;
        console.error('[patient-tabs] failed to load appointments', error);
        setAppointmentsError(
          error instanceof Error ? error.message : 'Impossible de charger les rendez-vous.'
        );
      })
      .finally(() => {
        if (active) {
          setAppointmentsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [patient.id, tab]);

  async function handleSaveProfile() {
    if (!isProfileDirty) return;
    const trimmedName = profileForm.name.trim();
    if (!trimmedName) {
      setToast({
        title: 'Nom requis',
        description: 'Veuillez renseigner le nom du patient avant d’enregistrer.',
        variant: 'error'
      });
      return;
    }

    const ageValue = profileForm.age.trim();
    const parsedAge = ageValue ? Number(ageValue) : null;
    if (ageValue && Number.isNaN(parsedAge)) {
      setToast({
        title: 'Âge invalide',
        description: 'Merci de saisir un âge valide (nombre).',
        variant: 'error'
      });
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await updatePatient(patient.id, {
        name: trimmedName,
        email: profileForm.email.trim() || null,
        age: parsedAge ?? null,
        city: profileForm.city.trim() || null,
        consultation_reason: profileForm.consultationReason.trim() || null
      });
      setPatientState((prev) => ({ ...prev, ...updated }));
      setProfileForm({
        name: updated.name ?? '',
        email: updated.email ?? '',
        age: updated.age?.toString() ?? '',
        city: updated.city ?? '',
        consultationReason: updated.consultation_reason ?? ''
      });
      setProfileEditing(false);
      setToast({
        title: 'Profil mis à jour',
        description: 'Les informations patient ont été enregistrées.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de sauvegarde',
        description: error instanceof Error ? error.message : 'Impossible d’enregistrer le profil.',
        variant: 'error'
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleScheduleAppointment() {
    if (!appointmentForm.startsAt) {
      setToast({
        title: 'Date requise',
        description: 'Merci de sélectionner une date et une heure pour le rendez-vous.',
        variant: 'error'
      });
      return;
    }

    const startsAtDate = new Date(appointmentForm.startsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      setToast({
        title: 'Date invalide',
        description: 'La date de rendez-vous est invalide.',
        variant: 'error'
      });
      return;
    }

    const durationValue = appointmentForm.durationMinutes.trim();
    const durationMinutes = durationValue ? Number(durationValue) : null;
    if (durationValue && (!durationMinutes || durationMinutes <= 0)) {
      setToast({
        title: 'Durée invalide',
        description: 'Merci d’indiquer une durée valide en minutes.',
        variant: 'error'
      });
      return;
    }

    const endsAt = durationMinutes
      ? new Date(startsAtDate.getTime() + durationMinutes * 60000).toISOString()
      : null;

    setAppointmentSaving(true);
    try {
      const created = await createAppointment({
        patientId: patient.id,
        startsAt: startsAtDate.toISOString(),
        endsAt,
        notes: appointmentForm.notes.trim() || null
      });
      setAppointments((prev) =>
        [...prev, created].sort(
          (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
        )
      );
      setShowAppointmentModal(false);
      setAppointmentForm({ startsAt: '', durationMinutes: '60', notes: '' });
      setToast({
        title: 'Rendez-vous planifié',
        description: 'Le rendez-vous a été enregistré avec succès.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de planification',
        description: error instanceof Error ? error.message : 'Impossible de planifier le rendez-vous.',
        variant: 'error'
      });
    } finally {
      setAppointmentSaving(false);
    }
  }

  async function handleSaveAnamnesisQuestionnaire() {
    setAnamnesisSaving(true);
    try {
      const updated = await upsertPatientAnamnesis(patient.id, anamnesisAnswers);
      if (!updated) {
        throw new Error('Impossible d’enregistrer l’anamnèse.');
      }
      setPatientState((prev) => ({ ...prev, patient_anamnesis: updated }));
      setAnamnesisEditing(false);
      setToast({
        title: 'Anamnèse enregistrée',
        description: 'Les réponses ont été mises à jour.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de sauvegarde',
        description: error instanceof Error ? error.message : 'Impossible d’enregistrer l’anamnèse.',
        variant: 'error'
      });
    } finally {
      setAnamnesisSaving(false);
    }
  }

  async function handleSaveJournal() {
    if (!journalForm.date) return;
    setJournalSaving(true);
    try {
      const saved = await upsertJournalEntry(patient.id, {
        ...journalForm,
        date: journalForm.date
      });
      if (!saved) {
        throw new Error('Impossible d’enregistrer le journal.');
      }
      setPatientState((prev) => {
        const otherEntries = (prev.journal_entries ?? []).filter((entry) => entry.id !== saved.id);
        return {
          ...prev,
          journal_entries: [saved, ...otherEntries].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        };
      });
      setJournalForm(buildJournalForm(saved));
      setJournalEditing(false);
      setToast({
        title: 'Journal enregistré',
        description: 'Les informations ont été mises à jour.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de sauvegarde',
        description: error instanceof Error ? error.message : 'Impossible d’enregistrer le journal.',
        variant: 'error'
      });
    } finally {
      setJournalSaving(false);
    }
  }

  async function handleSaveNote() {
    setNoteSaving(true);
    try {
      const saved = await upsertPractitionerNote(patient.id, noteContent.trim());
      if (!saved) {
        throw new Error('Impossible d’enregistrer la note.');
      }
      setPatientState((prev) => ({ ...prev, practitioner_note: saved }));
      setNoteEditing(false);
      setToast({
        title: 'Note enregistrée',
        description: 'La note privée est à jour.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de sauvegarde',
        description: error instanceof Error ? error.message : 'Impossible d’enregistrer la note.',
        variant: 'error'
      });
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleUpgradePremium() {
    setPremiumLoading(true);
    try {
      const updated = await updatePatient(patient.id, { is_premium: true, status: 'premium' });
      setPatientState((prev) => ({ ...prev, ...updated }));
      setToast({
        title: 'Patient Premium',
        description: 'Le statut premium est actif.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Action impossible',
        description: error instanceof Error ? error.message : 'Impossible de passer en Premium.',
        variant: 'error'
      });
    } finally {
      setPremiumLoading(false);
    }
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
            <h1 className="text-2xl font-semibold text-charcoal">{patientState.name}</h1>
            <Badge variant={isPremium ? 'premium' : 'info'}>
              {isPremium ? 'Premium' : 'Standard'}
            </Badge>
          </div>
          <p className="text-sm text-warmgray">
            {[patientState.age ? `${patientState.age} ans` : null, patientState.city]
              .filter(Boolean)
              .join(' • ') || '—'}
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
          <Card className={profileEditing ? 'border-2 border-teal/30 bg-teal/5' : undefined}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Informations patient</h2>
                {!profileEditing ? (
                  <Button variant="secondary" onClick={() => setProfileEditing(true)}>
                    ✏️ Modifier le profil
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileEditing ? (
                <div className="rounded-xl border border-teal/20 bg-teal/10 px-3 py-2 text-xs text-teal">
                  ✏️ Mode édition activé — Pensez à enregistrer vos modifications.
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-warmgray">Nom</p>
                  {profileEditing ? (
                    <Input
                      className="mt-2"
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Nom du patient"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-marine">{formatValue(patientState.name, '—')}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-warmgray">Email</p>
                  {profileEditing ? (
                    <Input
                      className="mt-2"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="email@exemple.com"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-marine">{formatValue(patientState.email, 'Non renseigné')}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-warmgray">Âge</p>
                  {profileEditing ? (
                    <Input
                      className="mt-2"
                      type="number"
                      min={0}
                      value={profileForm.age}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, age: event.target.value }))
                      }
                      placeholder="Âge"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-marine">{formatValue(patientState.age, '—')}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-warmgray">Ville</p>
                  {profileEditing ? (
                    <Input
                      className="mt-2"
                      value={profileForm.city}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, city: event.target.value }))
                      }
                      placeholder="Ville"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-marine">{formatValue(patientState.city, 'Non renseigné')}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-warmgray">Statut</p>
                  <div className="mt-2">
                    <Badge variant={isPremium ? 'premium' : 'info'}>
                      {isPremium ? 'Premium' : 'Standard'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={profileEditing ? 'border-2 border-teal/30 bg-teal/5' : undefined}>
            <CardHeader>
              <h2 className="text-sm font-semibold">Motif de consultation</h2>
            </CardHeader>
            <CardContent>
              {profileEditing ? (
                <Textarea
                  className="mt-1"
                  value={profileForm.consultationReason}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, consultationReason: event.target.value }))
                  }
                  placeholder="Motif principal, contexte, attentes..."
                  rows={4}
                />
              ) : (
                <p className="text-sm text-marine whitespace-pre-line break-words">
                  {formatValue(patientState.consultation_reason, 'Non renseigné')}
                </p>
              )}
            </CardContent>
          </Card>

          {profileEditing ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={handleSaveProfile}
                loading={profileSaving}
                disabled={!isProfileDirty}
              >
                Enregistrer
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setProfileForm(profileSnapshot);
                  setProfileEditing(false);
                }}
                disabled={profileSaving}
              >
                Annuler
              </Button>
            </div>
          ) : null}

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

      {tab === 'Rendez-vous' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-charcoal">Rendez-vous</h2>
            <Button
              variant="primary"
              onClick={() => {
                setAppointmentForm({ startsAt: '', durationMinutes: '60', notes: '' });
                setShowAppointmentModal(true);
              }}
            >
              📅 Planifier un rendez-vous
            </Button>
          </div>

          {appointmentsError ? (
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-marine">
              {appointmentsError}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">Prochain rendez-vous</h3>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <p className="text-sm text-warmgray">Chargement...</p>
              ) : upcomingAppointment ? (
                <div className="space-y-2 text-sm text-marine">
                  <p className="font-medium text-charcoal">
                    {formatDate(upcomingAppointment.starts_at, true)}
                  </p>
                  {upcomingAppointment.ends_at ? (
                    <p className="text-xs text-warmgray">
                      Fin prévue : {formatDate(upcomingAppointment.ends_at, true)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-marine">À planifier</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">Historique</h3>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <p className="text-sm text-warmgray">Chargement...</p>
              ) : appointments.length === 0 ? (
                <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                  Aucun rendez-vous enregistré.
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 ring-1 ring-black/5"
                    >
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {formatDate(appointment.starts_at, true)}
                        </p>
                        {appointment.notes ? (
                          <p className="mt-1 text-xs text-warmgray whitespace-pre-line">
                            {appointment.notes}
                          </p>
                          ) : null}
                      </div>
                      <Badge
                        variant={
                          appointment.status === 'scheduled'
                            ? 'info'
                            : appointment.status === 'completed'
                              ? 'success'
                              : 'attention'
                        }
                      >
                        {appointment.status === 'scheduled'
                          ? 'À venir'
                          : appointment.status === 'completed'
                            ? 'Terminé'
                            : 'Annulé'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Anamnèse' && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Anamnèse</h2>
              {!anamnesisEditing ? (
                <Button variant="secondary" onClick={() => setAnamnesisEditing(true)}>
                  Modifier
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {ANAMNESIS_SECTIONS.map((section) => (
                <div key={section.id} className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal">{section.title}</h3>
                    {section.description ? (
                      <p className="text-xs text-warmgray">{section.description}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {section.questions.map((question) => (
                      <div key={question.key} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                        <p className="text-xs uppercase tracking-wide text-warmgray">{question.label}</p>
                        {anamnesisEditing ? (
                          question.type === 'choice' ? (
                            <select
                              value={anamnesisAnswers[question.key] ?? ''}
                              onChange={(event) =>
                                setAnamnesisAnswers((prev) => ({
                                  ...prev,
                                  [question.key]: event.target.value
                                }))
                              }
                              className="mt-2 w-full rounded-xl border border-warmgray/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                            >
                              <option value="">Sélectionner</option>
                              {question.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Textarea
                              className="mt-2"
                              value={anamnesisAnswers[question.key] ?? ''}
                              onChange={(event) =>
                                setAnamnesisAnswers((prev) => ({
                                  ...prev,
                                  [question.key]: event.target.value
                                }))
                              }
                              placeholder={question.placeholder ?? 'Votre réponse'}
                              rows={3}
                            />
                          )
                        ) : (
                          <p className="mt-2 text-sm text-marine whitespace-pre-line break-words">
                            {formatAnswer(anamnesisAnswers[question.key])}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {anamnesisEditing ? (
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="primary" onClick={handleSaveAnamnesisQuestionnaire} loading={anamnesisSaving}>
                  Enregistrer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAnamnesisAnswers(patientState.patient_anamnesis?.answers ?? {});
                    setAnamnesisEditing(false);
                  }}
                  disabled={anamnesisSaving}
                >
                  Annuler
                </Button>
              </div>
            ) : null}
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
              <div className="space-y-3 rounded-2xl bg-sable p-5 text-sm text-marine ring-1 ring-black/5">
                <p className="text-sm font-medium text-charcoal">Fonctionnalité Premium</p>
                <p>
                  Proposez l’offre Premium à votre client afin d’avoir accès à cette fonctionnalité.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="cta" onClick={handleUpgradePremium} loading={premiumLoading}>
                    Passer ce patient en Premium
                  </Button>
                  <Button variant="secondary" onClick={() => setTab('Profil')}>
                    En savoir plus
                  </Button>
                </div>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Journal</h2>
              {!journalEditing ? (
                <Button variant="secondary" onClick={() => setJournalEditing(true)}>
                  Modifier
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-charcoal">Dernière entrée</p>
                  <span className="text-xs text-warmgray">
                    {journalForm.date ? formatDate(journalForm.date) : '—'}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Humeur</p>
                    {journalEditing ? (
                      <select
                        value={journalForm.mood ?? ''}
                        onChange={(event) =>
                          setJournalForm((prev) => ({ ...prev, mood: event.target.value as JournalEntry['mood'] }))
                        }
                        className="mt-2 w-full rounded-xl border border-warmgray/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                      >
                        <option value="">Sélectionner</option>
                        <option value="🙂">🙂</option>
                        <option value="😐">😐</option>
                        <option value="🙁">🙁</option>
                      </select>
                    ) : (
                      <p className="mt-2 text-sm text-marine">{journalForm.mood ?? 'Non renseigné'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Énergie</p>
                    {journalEditing ? (
                      <select
                        value={journalForm.energy ?? ''}
                        onChange={(event) =>
                          setJournalForm((prev) => ({
                            ...prev,
                            energy: event.target.value as JournalEntry['energy']
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-warmgray/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                      >
                        <option value="">Sélectionner</option>
                        <option value="Bas">Bas</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Élevé">Élevé</option>
                      </select>
                    ) : (
                      <p className="mt-2 text-sm text-marine">{journalForm.energy ?? 'Non renseigné'}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-warmgray">Notes du patient</p>
                  {journalEditing ? (
                    <Textarea
                      className="mt-2"
                      value={journalForm.text ?? ''}
                      onChange={(event) => setJournalForm((prev) => ({ ...prev, text: event.target.value }))}
                      placeholder="Ressenti, événements marquants..."
                      rows={4}
                    />
                  ) : (
                    <p className="mt-2 text-sm text-marine whitespace-pre-line break-words">
                      {journalForm.text ? journalForm.text : 'Non renseigné'}
                    </p>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(
                    [
                      { key: 'adherence_hydratation', label: 'Hydratation' },
                      { key: 'adherence_respiration', label: 'Respiration' },
                      { key: 'adherence_mouvement', label: 'Mouvement' },
                      { key: 'adherence_plantes', label: 'Plantes' }
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl bg-sable px-3 py-2">
                      <span className="text-xs text-warmgray">{item.label}</span>
                      {journalEditing ? (
                        <select
                          value={journalForm[item.key] ? 'Oui' : 'Non'}
                          onChange={(event) =>
                            setJournalForm((prev) => ({
                              ...prev,
                              [item.key]: event.target.value === 'Oui'
                            }))
                          }
                          className="rounded-lg border border-warmgray/30 bg-white px-2 py-1 text-xs text-charcoal"
                        >
                          <option value="Oui">Oui</option>
                          <option value="Non">Non</option>
                        </select>
                      ) : (
                        <span className="text-xs font-medium text-marine">
                          {journalForm[item.key] ? 'Oui' : 'Non'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {journalEditing ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={handleSaveJournal} loading={journalSaving}>
                    Enregistrer
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setJournalForm(buildJournalForm(journalEntries[0]));
                      setJournalEditing(false);
                    }}
                    disabled={journalSaving}
                  >
                    Annuler
                  </Button>
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-warmgray">Historique</p>
                {journalEntries.length === 0 ? (
                  <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                    Aucune entrée de journal.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {journalEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-charcoal">{formatDate(entry.date)}</p>
                          <div className="flex items-center gap-2 text-sm text-marine">
                            <span>{entry.mood ?? '—'}</span>
                            <span>{entry.energy ?? '—'}</span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-marine whitespace-pre-line break-words">
                          {entry.text || 'Non renseigné'}
                        </p>
                        <div className="mt-3">{renderAdherence(entry)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'Notes consultation' && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Notes privées de consultation</h2>
              {!noteEditing ? (
                <Button variant="secondary" onClick={() => setNoteEditing(true)}>
                  Modifier
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
              Notes privées : visibles uniquement par le naturopathe. Non partagées avec le patient.
            </div>
            {noteEditing ? (
              <Textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Renseignez vos observations confidentielles..."
                rows={6}
              />
            ) : (
              <div className="rounded-2xl bg-white p-4 text-sm text-marine ring-1 ring-black/5 whitespace-pre-line">
                {noteContent ? noteContent : 'Non renseigné'}
              </div>
            )}
            {noteEditing ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={handleSaveNote} loading={noteSaving}>
                  Enregistrer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNoteContent(patientState.practitioner_note?.content ?? '');
                    setNoteEditing(false);
                  }}
                  disabled={noteSaving}
                >
                  Annuler
                </Button>
              </div>
            ) : null}
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
      {showAppointmentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-charcoal">Planifier un rendez-vous</h2>
            <p className="mt-2 text-sm text-warmgray">
              Renseignez la date, l’heure et la durée estimée du rendez-vous.
            </p>
            <div className="mt-4 space-y-4">
              <Input
                label="Date et heure de début"
                type="datetime-local"
                value={appointmentForm.startsAt}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({ ...prev, startsAt: event.target.value }))
                }
              />
              <Input
                label="Durée (en minutes)"
                type="number"
                min={15}
                step={5}
                value={appointmentForm.durationMinutes}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                }
              />
              <div>
                <p className="text-xs font-medium text-warmgray">Notes internes</p>
                <Textarea
                  className="mt-1 min-h-[120px]"
                  value={appointmentForm.notes}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Informations utiles, préparations, suivi..."
                  rows={4}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowAppointmentModal(false)}
                  disabled={appointmentSaving}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleScheduleAppointment}
                  loading={appointmentSaving}
                  disabled={!appointmentForm.startsAt}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
