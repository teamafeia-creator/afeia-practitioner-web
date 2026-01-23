'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Toast } from '../ui/Toast';
import {
  createAppointment,
  markMessagesAsRead,
  sendMessage,
  updatePatient,
  upsertJournalEntry,
  upsertPatientAnamnesis,
  upsertPractitionerNote
} from '../../lib/queries';
import { ANAMNESIS_SECTIONS } from '../../lib/anamnesis';
import type {
  Appointment,
  JournalEntry,
  Message,
  PatientWithDetails,
  WearableInsight
} from '../../lib/types';

const TABS = [
  'Profil',
  'Rendez-vous',
  'Anamnèse',
  'Circular',
  'Journal',
  'Notes consultation',
  'Messages'
] as const;

type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { title: string; description: string }> = {
  Profil: {
    title: 'Profil patient',
    description: 'Coordonnées clés et informations administratives.'
  },
  'Rendez-vous': {
    title: 'Rendez-vous',
    description: 'Historique et planification des consultations.'
  },
  Anamnèse: {
    title: 'Anamnèse',
    description: 'Questionnaire santé et habitudes de vie.'
  },
  Circular: {
    title: 'Circular',
    description: 'Synthèse sommeil, HRV et activité.'
  },
  Journal: {
    title: 'Journal',
    description: 'Suivi quotidien du ressenti du patient.'
  },
  'Notes consultation': {
    title: 'Notes consultation',
    description: 'Notes internes réservées au praticien.'
  },
  Messages: {
    title: 'Messages',
    description: 'Conversation directe avec le patient.'
  }
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

function renderValue(value?: string | null, fallback = 'Non renseigné') {
  if (!value || value.trim() === '') {
    return <span className="italic text-warmgray">{fallback}</span>;
  }
  return <span className="text-marine">{value}</span>;
}

function renderAnswer(value?: string | null) {
  return renderValue(value);
}

function formatDateTimeLocal(value?: Date) {
  if (!value) return '';
  const timezoneOffset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function normalizeProfileValue(value: string) {
  return value.trim();
}

function areRecordsEqual(
  first: Record<string, string>,
  second: Record<string, string>
) {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
  for (const key of keys) {
    if ((first[key] ?? '').trim() !== (second[key] ?? '').trim()) {
      return false;
    }
  }
  return true;
}

function areJournalEntriesEqual(
  first: Partial<JournalEntry>,
  second: Partial<JournalEntry>
) {
  return (
    (first.date ?? '') === (second.date ?? '') &&
    (first.mood ?? '') === (second.mood ?? '') &&
    (first.energy ?? '') === (second.energy ?? '') &&
    (first.text ?? '') === (second.text ?? '') &&
    Boolean(first.adherence_hydratation) === Boolean(second.adherence_hydratation) &&
    Boolean(first.adherence_respiration) === Boolean(second.adherence_respiration) &&
    Boolean(first.adherence_mouvement) === Boolean(second.adherence_mouvement) &&
    Boolean(first.adherence_plantes) === Boolean(second.adherence_plantes)
  );
}

function EditBanner({ label }: { label: string }) {
  return (
    <div className="mt-4 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-xs font-medium text-teal">
      ✏️ Mode édition activé — {label}
    </div>
  );
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

const APPOINTMENT_STATUS_LABEL: Record<Appointment['status'], string> = {
  scheduled: 'Planifié',
  cancelled: 'Annulé',
  completed: 'Terminé'
};

const APPOINTMENT_STATUS_VARIANT: Record<Appointment['status'], 'info' | 'attention' | 'success'> = {
  scheduled: 'info',
  cancelled: 'attention',
  completed: 'success'
};

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
  const searchParams = useSearchParams();
  const initialTab = useMemo<Tab>(() => {
    const requested = searchParams.get('tab');
    return TABS.includes(requested as Tab) ? (requested as Tab) : 'Profil';
  }, [searchParams]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: patient.name ?? '',
    email: patient.email ?? '',
    age: patient.age ? String(patient.age) : '',
    city: patient.city ?? '',
    consultation_reason: patient.consultation_reason ?? ''
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
  const [appointments, setAppointments] = useState<Appointment[]>(patient.appointments ?? []);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
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
  const journalEntries = useMemo(
    () => patientState.journal_entries ?? [],
    [patientState.journal_entries]
  );
  const initialJournal = useMemo(() => buildJournalForm(journalEntries[0]), [journalEntries]);
  const initialAnamnesis = useMemo(
    () => patientState.patient_anamnesis?.answers ?? {},
    [patientState.patient_anamnesis]
  );
  const initialNote = useMemo(
    () => patientState.practitioner_note?.content ?? '',
    [patientState.practitioner_note]
  );

  const initialProfile = useMemo(
    () => ({
      name: patientState.name ?? '',
      email: patientState.email ?? '',
      age: patientState.age ? String(patientState.age) : '',
      city: patientState.city ?? '',
      consultation_reason: patientState.consultation_reason ?? ''
    }),
    [patientState]
  );

  const isProfileDirty = useMemo(() => {
    return (
      normalizeProfileValue(profileForm.name) !== normalizeProfileValue(initialProfile.name) ||
      normalizeProfileValue(profileForm.email) !== normalizeProfileValue(initialProfile.email) ||
      normalizeProfileValue(profileForm.age) !== normalizeProfileValue(initialProfile.age) ||
      normalizeProfileValue(profileForm.city) !== normalizeProfileValue(initialProfile.city) ||
      normalizeProfileValue(profileForm.consultation_reason) !==
        normalizeProfileValue(initialProfile.consultation_reason)
    );
  }, [initialProfile, profileForm]);

  const isAnamnesisDirty = useMemo(() => {
    return !areRecordsEqual(anamnesisAnswers, initialAnamnesis);
  }, [anamnesisAnswers, initialAnamnesis]);

  const isJournalDirty = useMemo(() => {
    return !areJournalEntriesEqual(journalForm, initialJournal);
  }, [journalForm, initialJournal]);

  const isNoteDirty = useMemo(() => {
    return noteContent.trim() !== initialNote.trim();
  }, [noteContent, initialNote]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    );
  }, [appointments]);

  const upcomingAppointment = useMemo(() => {
    const now = new Date();
    return sortedAppointments
      .filter((appointment) => appointment.status === 'scheduled')
      .map((appointment) => ({
        ...appointment,
        starts: new Date(appointment.starts_at)
      }))
      .filter((appointment) => appointment.starts > now)
      .sort((a, b) => a.starts.getTime() - b.starts.getTime())[0];
  }, [sortedAppointments]);

  const activeMeta = TAB_META[tab];

  useEffect(() => {
    setPatientState(patient);
    setProfileForm({
      name: patient.name ?? '',
      email: patient.email ?? '',
      age: patient.age ? String(patient.age) : '',
      city: patient.city ?? '',
      consultation_reason: patient.consultation_reason ?? ''
    });
    setMessages(patient.messages ?? []);
    setAnamnesisAnswers(patient.patient_anamnesis?.answers ?? {});
    setNoteContent(patient.practitioner_note?.content ?? '');
    setJournalForm(buildJournalForm(patient.journal_entries?.[0]));
    setAppointments(patient.appointments ?? []);
    setProfileEditing(false);
    setAnamnesisEditing(false);
    setJournalEditing(false);
    setNoteEditing(false);
  }, [patient]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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

  async function handleSaveProfile() {
    if (!isProfileDirty) return;
    setProfileSaving(true);
    try {
      const parsedAge = profileForm.age.trim();
      const ageValue = parsedAge ? Number(parsedAge) : null;
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim() || null,
        age: Number.isNaN(ageValue) ? null : ageValue,
        city: profileForm.city.trim() || null,
        consultation_reason: profileForm.consultation_reason.trim() || null
      };
      const updated = await updatePatient(patient.id, payload);
      setPatientState((prev) => ({ ...prev, ...updated }));
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

  async function handleCreateAppointment() {
    if (!appointmentForm.startsAt) {
      setToast({
        title: 'Champ manquant',
        description: 'Veuillez renseigner une date de début.',
        variant: 'error'
      });
      return;
    }

    setAppointmentSaving(true);
    try {
      const duration = Number.parseInt(appointmentForm.durationMinutes, 10);
      const startDate = new Date(appointmentForm.startsAt);
      if (Number.isNaN(startDate.getTime())) {
        throw new Error('Date de début invalide.');
      }
      const safeDuration = Number.isNaN(duration) ? 60 : Math.max(duration, 15);
      const endsAt = new Date(startDate.getTime() + safeDuration * 60000).toISOString();
      const created = await createAppointment({
        patientId: patient.id,
        startsAt: startDate.toISOString(),
        endsAt,
        notes: appointmentForm.notes.trim() || null
      });
      setAppointments((prev) => [created, ...prev]);
      setAppointmentModalOpen(false);
      setAppointmentForm({
        startsAt: '',
        durationMinutes: '60',
        notes: ''
      });
      setToast({
        title: 'Rendez-vous planifié',
        description: 'Le rendez-vous a été ajouté à l’historique.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de planification',
        description: error instanceof Error ? error.message : 'Impossible de créer le rendez-vous.',
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
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-charcoal">{activeMeta.title}</h2>
        <p className="text-xs text-warmgray">{activeMeta.description}</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-nowrap items-end gap-6 border-b border-black/10 pb-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'whitespace-nowrap pb-2 text-sm font-medium transition',
                tab === t
                  ? 'border-b-2 border-teal text-teal'
                  : 'border-b-2 border-transparent text-warmgray hover:text-teal'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Profil' && (
        <div className="space-y-4">
          <Card
            className={cn(
              'transition',
              profileEditing ? 'border-2 border-teal/30 bg-teal/5' : ''
            )}
          >
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Informations patient</h2>
                  <p className="text-xs text-warmgray">Profil et coordonnées du patient.</p>
                </div>
                {!profileEditing ? (
                  <Button variant="secondary" onClick={() => setProfileEditing(true)}>
                    ✏️ Modifier le profil
                  </Button>
                ) : null}
              </div>
              {profileEditing ? (
                <EditBanner label="Pensez à enregistrer vos modifications." />
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {profileEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nom"
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                  <Input
                    label="Âge"
                    type="number"
                    min={0}
                    value={profileForm.age}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, age: event.target.value }))
                    }
                  />
                  <Input
                    label="Ville"
                    value={profileForm.city}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, city: event.target.value }))
                    }
                  />
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-warmgray">Statut</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={isPremium ? 'premium' : 'info'}>
                        {isPremium ? 'Premium' : 'Standard'}
                      </Badge>
                      <span className="text-xs text-warmgray">
                        Statut non modifiable depuis le profil.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Nom</p>
                    <p className="mt-1 text-sm">{renderValue(patientState.name)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Email</p>
                    <p className="mt-1 text-sm">{renderValue(patientState.email)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Âge</p>
                    <p className="mt-1 text-sm">
                      {renderValue(patientState.age ? `${patientState.age} ans` : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Ville</p>
                    <p className="mt-1 text-sm">{renderValue(patientState.city)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Statut</p>
                    <div className="mt-1">
                      <Badge variant={isPremium ? 'premium' : 'info'}>
                        {isPremium ? 'Premium' : 'Standard'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              {profileEditing ? (
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProfileForm(initialProfile);
                      setProfileEditing(false);
                    }}
                    disabled={profileSaving}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    loading={profileSaving}
                    disabled={!isProfileDirty || profileSaving}
                  >
                    Enregistrer
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card
            className={cn(
              'transition',
              profileEditing ? 'border-2 border-teal/30 bg-teal/5' : ''
            )}
          >
            <CardHeader>
              <h2 className="text-sm font-semibold">Motif de consultation</h2>
              {profileEditing ? (
                <EditBanner label="Modifiez le motif avant d’enregistrer." />
              ) : null}
            </CardHeader>
            <CardContent>
              {profileEditing ? (
                <Textarea
                  value={profileForm.consultation_reason}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      consultation_reason: event.target.value
                    }))
                  }
                  placeholder="Motif de consultation"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-marine whitespace-pre-line">
                  {renderAnswer(patientState.consultation_reason)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Rendez-vous' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setAppointmentForm({
                  startsAt: formatDateTimeLocal(new Date()),
                  durationMinutes: '60',
                  notes: ''
                });
                setAppointmentModalOpen(true);
              }}
            >
              📅 Planifier un rendez-vous
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Prochain rendez-vous</h2>
              </CardHeader>
              <CardContent>
                {upcomingAppointment ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-warmgray">Date</p>
                      <p className="mt-1 text-sm text-marine">
                        {formatDate(upcomingAppointment.starts_at, true)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={APPOINTMENT_STATUS_VARIANT[upcomingAppointment.status]}>
                        {APPOINTMENT_STATUS_LABEL[upcomingAppointment.status]}
                      </Badge>
                      {upcomingAppointment.ends_at ? (
                        <span className="text-xs text-warmgray">
                          Fin prévue {formatDate(upcomingAppointment.ends_at, true)}
                        </span>
                      ) : null}
                    </div>
                    {upcomingAppointment.notes ? (
                      <p className="text-sm text-marine">{upcomingAppointment.notes}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                    <p>À planifier.</p>
                    <Button
                      variant="secondary"
                      className="mt-3"
                      onClick={() => {
                        setAppointmentForm({
                          startsAt: formatDateTimeLocal(new Date()),
                          durationMinutes: '60',
                          notes: ''
                        });
                        setAppointmentModalOpen(true);
                      }}
                    >
                      Planifier un rendez-vous
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Historique</h2>
              </CardHeader>
              <CardContent>
                {sortedAppointments.length === 0 ? (
                  <div className="rounded-2xl bg-sable p-4 text-sm text-marine ring-1 ring-black/5">
                    Aucun rendez-vous enregistré.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="rounded-2xl border border-black/5 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-charcoal">
                              {formatDate(appointment.starts_at, true)}
                            </p>
                            {appointment.ends_at ? (
                              <p className="text-xs text-warmgray">
                                Fin : {formatDate(appointment.ends_at, true)}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant={APPOINTMENT_STATUS_VARIANT[appointment.status]}>
                            {APPOINTMENT_STATUS_LABEL[appointment.status]}
                          </Badge>
                        </div>
                        {appointment.notes ? (
                          <p className="mt-2 text-sm text-marine">{appointment.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'Anamnèse' && (
        <Card className={cn(anamnesisEditing ? 'border-2 border-teal/30 bg-teal/5' : '')}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Anamnèse</h2>
              {!anamnesisEditing ? (
                <Button variant="secondary" onClick={() => setAnamnesisEditing(true)}>
                  Modifier
                </Button>
              ) : null}
            </div>
            {anamnesisEditing ? <EditBanner label="Pensez à sauvegarder vos réponses." /> : null}
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
                            {renderAnswer(anamnesisAnswers[question.key])}
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
                <Button
                  variant="primary"
                  onClick={handleSaveAnamnesisQuestionnaire}
                  loading={anamnesisSaving}
                  disabled={!isAnamnesisDirty || anamnesisSaving}
                >
                  Enregistrer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAnamnesisAnswers(initialAnamnesis);
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
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-teal/30 bg-teal/5 p-6 text-sm text-marine">
                <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal shadow-soft">
                  🔒 Premium
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-charcoal">
                    <span className="text-lg">🌀</span>
                    <p className="text-sm font-semibold">Fonctionnalité Circular verrouillée</p>
                  </div>
                  <p>
                    Proposez l’offre Premium à votre client afin d’avoir accès à cette fonctionnalité.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="cta" onClick={handleUpgradePremium} loading={premiumLoading}>
                      Passer en Premium
                    </Button>
                    <Button variant="secondary" onClick={() => setTab('Profil')}>
                      En savoir plus
                    </Button>
                  </div>
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
        <Card className={cn(journalEditing ? 'border-2 border-teal/30 bg-teal/5' : '')}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Journal</h2>
              {!journalEditing ? (
                <Button variant="secondary" onClick={() => setJournalEditing(true)}>
                  Modifier
                </Button>
              ) : null}
            </div>
            {journalEditing ? <EditBanner label="Enregistrez vos modifications du journal." /> : null}
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
                      <p className="mt-2 text-sm">{renderValue(journalForm.mood)}</p>
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
                      <p className="mt-2 text-sm">{renderValue(journalForm.energy)}</p>
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
                    <p className="mt-2 text-sm whitespace-pre-line break-words">
                      {renderValue(journalForm.text)}
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
                          className="rounded-lg border border-warmgray/30 bg-white px-2 py-1 text-xs text-charcoal focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
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
                  <Button
                    variant="primary"
                    onClick={handleSaveJournal}
                    loading={journalSaving}
                    disabled={!isJournalDirty || journalSaving}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setJournalForm(initialJournal);
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
                    <p>Aucune entrée de journal.</p>
                    <Button
                      variant="secondary"
                      className="mt-3"
                      onClick={() => {
                        setJournalForm(buildJournalForm(undefined));
                        setJournalEditing(true);
                      }}
                    >
                      Ajouter une entrée
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {journalEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-charcoal">{formatDate(entry.date)}</p>
                          <div className="flex items-center gap-2 text-sm">
                            {renderValue(entry.mood)}
                            {renderValue(entry.energy)}
                          </div>
                        </div>
                        <p className="mt-2 text-sm whitespace-pre-line break-words">
                          {renderValue(entry.text)}
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
        <Card className={cn(noteEditing ? 'border-2 border-teal/30 bg-teal/5' : '')}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Notes privées de consultation</h2>
              {!noteEditing ? (
                <Button variant="secondary" onClick={() => setNoteEditing(true)}>
                  Modifier
                </Button>
              ) : null}
            </div>
            {noteEditing ? <EditBanner label="Enregistrez vos notes confidentielles." /> : null}
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
              <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5 whitespace-pre-line">
                {renderValue(noteContent)}
              </div>
            )}
            {noteEditing ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={handleSaveNote}
                  loading={noteSaving}
                  disabled={!isNoteDirty || noteSaving}
                >
                  Enregistrer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setNoteContent(initialNote);
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
      {appointmentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-charcoal">Planifier un rendez-vous</h2>
            <p className="mt-2 text-sm text-warmgray">
              Définissez la date, l’heure et la durée estimée du rendez-vous.
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
                label="Durée (minutes)"
                type="number"
                min={15}
                step={15}
                value={appointmentForm.durationMinutes}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({
                    ...prev,
                    durationMinutes: event.target.value
                  }))
                }
              />
              <Textarea
                value={appointmentForm.notes}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Notes internes (optionnel)"
                rows={3}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setAppointmentModalOpen(false)}
                  disabled={appointmentSaving}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateAppointment}
                  loading={appointmentSaving}
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
