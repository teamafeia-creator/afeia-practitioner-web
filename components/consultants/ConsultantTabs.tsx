'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TabsPills } from '../ui/TabsPills';
import { Textarea } from '../ui/Textarea';
import { Toast } from '../ui/Toast';
import {
  createAppointment,
  createConsultantPlanVersion,
  deleteConsultant,
  markMessagesAsRead,
  sendMessage,
  shareConsultantPlanVersion,
  updateConsultant,
  updateConsultantPlanContent,
  upsertJournalEntry,
  upsertConsultantAnamnesis,
  upsertPractitionerNote
} from '../../lib/queries';
import { ANAMNESIS_SECTIONS } from '../../lib/anamnesis';
import type {
  AnamnesisAnswers,
  Appointment,
  JournalEntry,
  Message,
  ConsultantPlan,
  ConsultantWithDetails,
  WearableInsight
} from '../../lib/types';

/**
 * Helper to flatten nested anamnesis answers to flat format.
 * Nested format: { section_id: { question_key: value } }
 * Flat format: { question_key: value }
 */
function flattenAnamnesisAnswers(answers: AnamnesisAnswers | null | undefined): Record<string, string> {
  if (!answers) return {};

  // Check if it's already flat (values are strings, not objects)
  const firstValue = Object.values(answers)[0];
  if (typeof firstValue === 'string' || firstValue === undefined) {
    return answers as Record<string, string>;
  }

  // It's nested - flatten it
  const flat: Record<string, string> = {};
  for (const sectionAnswers of Object.values(answers)) {
    if (typeof sectionAnswers === 'object' && sectionAnswers !== null) {
      for (const [key, value] of Object.entries(sectionAnswers)) {
        if (typeof value === 'string') {
          flat[key] = value;
        }
      }
    }
  }
  return flat;
}

const TABS = [
  'Profil',
  'Rendez-vous',
  'Anamnèse',
  'Circular',
  'Journal',
  'Notes consultation',
  'Plan de naturopathie',
  'Résultats d\'analyses',
  'Messages'
] as const;

type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { title: string; description: string }> = {
  Profil: {
    title: 'Profil consultant',
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
    description: 'Suivi quotidien du ressenti du consultant.'
  },
  'Notes consultation': {
    title: 'Notes consultation',
    description: 'Notes internes réservées au praticien.'
  },
  'Plan de naturopathie': {
    title: 'Plan de naturopathie',
    description: 'Versions du plan partagé au consultant.'
  },
  'Résultats d\'analyses': {
    title: 'Résultats d\'analyses',
    description: 'Documents et résultats d\'examens médicaux.'
  },
  Messages: {
    title: 'Messages',
    description: 'Conversation directe avec le consultant.'
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

const DEFAULT_PLAN_CONTENT = {
  objectifs: '',
  alimentation_recommandations: '',
  alimentation_eviter: '',
  alimentation_hydratation: '',
  phytotherapie_plantes: '',
  phytotherapie_posologie: '',
  phytotherapie_precautions: '',
  complements: '',
  sommeil: '',
  activite: '',
  gestion_stress: '',
  suivi: '',
  notes_libres: ''
};

const PLAN_SECTIONS: Array<{
  title: string;
  description?: string;
  fields: Array<{ key: keyof typeof DEFAULT_PLAN_CONTENT; label: string; placeholder?: string }>;
}> = [
  {
    title: 'Objectifs',
    fields: [{ key: 'objectifs', label: 'Objectifs', placeholder: 'Objectifs prioritaires du consultant.' }]
  },
  {
    title: 'Alimentation',
    fields: [
      {
        key: 'alimentation_recommandations',
        label: 'Recommandations',
        placeholder: 'Aliments conseillés, rythme des repas, etc.'
      },
      {
        key: 'alimentation_eviter',
        label: 'À éviter',
        placeholder: 'Aliments ou habitudes à limiter.'
      },
      {
        key: 'alimentation_hydratation',
        label: 'Hydratation',
        placeholder: 'Objectif hydratation, conseils.'
      }
    ]
  },
  {
    title: 'Plantes / phytothérapie',
    fields: [
      { key: 'phytotherapie_plantes', label: 'Plantes', placeholder: 'Plantes recommandées.' },
      { key: 'phytotherapie_posologie', label: 'Posologie', placeholder: 'Dosage, durée.' },
      { key: 'phytotherapie_precautions', label: 'Précautions', placeholder: 'Contre-indications, avertissements.' }
    ]
  },
  {
    title: 'Compléments',
    fields: [
      {
        key: 'complements',
        label: 'Compléments',
        placeholder: 'Nom, dose, fréquence, durée.'
      }
    ]
  },
  {
    title: 'Sommeil',
    fields: [{ key: 'sommeil', label: 'Sommeil', placeholder: 'Routine, horaires, conseils.' }]
  },
  {
    title: 'Activité / exercices',
    fields: [{ key: 'activite', label: 'Activité', placeholder: 'Type, fréquence, intensité.' }]
  },
  {
    title: 'Gestion du stress',
    fields: [
      {
        key: 'gestion_stress',
        label: 'Gestion du stress / respiration / méditation',
        placeholder: 'Techniques recommandées.'
      }
    ]
  },
  {
    title: 'Suivi',
    fields: [
      {
        key: 'suivi',
        label: 'Suivi',
        placeholder: 'Indicateurs, prochain rendez-vous, notes.'
      }
    ]
  },
  {
    title: 'Notes libres',
    fields: [{ key: 'notes_libres', label: 'Notes libres', placeholder: 'Notes additionnelles.' }]
  }
];

function getInitials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function formatDateTimeLocal(value?: Date) {
  if (!value) return '';
  const timezoneOffset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function normalizeProfileValue(value: string) {
  return value.trim();
}

function buildPlanContent(content?: Record<string, string> | null) {
  return { ...DEFAULT_PLAN_CONTENT, ...(content ?? {}) };
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
    <div className="mt-4 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2 text-xs font-medium text-teal">
      Mode edition active - {label}
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
    <div className="flex flex-wrap gap-2 text-xs">
      {[
        { label: 'Hydratation', value: entry.adherence_hydratation },
        { label: 'Respiration', value: entry.adherence_respiration },
        { label: 'Mouvement', value: entry.adherence_mouvement },
        { label: 'Plantes', value: entry.adherence_plantes }
      ].map((item) => (
        <span
          key={item.label}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium',
            item.value ? 'bg-teal/10 text-teal' : 'bg-sable/70 text-warmgray'
          )}
        >
          {item.label}: {item.value ? 'Oui' : 'Non'}
        </span>
      ))}
    </div>
  );
}

function renderInsight(insight: WearableInsight) {
  return (
    <div key={insight.id} className="rounded-lg bg-white/60 p-4 border border-teal/10">
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

export function ConsultantTabs({ consultant }: { consultant: ConsultantWithDetails }) {
  const router = useRouter();
  const [consultantState, setConsultantState] = useState<ConsultantWithDetails>(consultant);
  const searchParams = useSearchParams();
  const initialTab = useMemo<Tab>(() => {
    const requested = searchParams.get('tab');
    return TABS.includes(requested as Tab) ? (requested as Tab) : 'Profil';
  }, [searchParams]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: consultant.name ?? '',
    email: consultant.email ?? '',
    age: consultant.age ? String(consultant.age) : '',
    city: consultant.city ?? '',
    phone: consultant.phone ?? '',
    consultation_reason: consultant.consultation_reason ?? ''
  });
  const [messages, setMessages] = useState<Message[]>(consultant.messages ?? []);
  const [messageText, setMessageText] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [anamnesisEditing, setAnamnesisEditing] = useState(false);
  const [anamnesisSaving, setAnamnesisSaving] = useState(false);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, string>>(
    flattenAnamnesisAnswers(consultant.consultant_anamnesis?.answers)
  );
  const [journalEditing, setJournalEditing] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalForm, setJournalForm] = useState<Partial<JournalEntry>>({});
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteContent, setNoteContent] = useState(consultant.practitioner_note?.content ?? '');
  const [plans, setPlans] = useState<ConsultantPlan[]>(consultant.consultant_plans ?? []);
  const [activePlanId, setActivePlanId] = useState<string | null>(
    consultant.consultant_plans?.[0]?.id ?? null
  );
  const [planForm, setPlanForm] = useState<Record<string, string>>(buildPlanContent(null));
  const [planSaving, setPlanSaving] = useState(false);
  const [planSharing, setPlanSharing] = useState(false);
  const [planCreating, setPlanCreating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(consultant.appointments ?? []);
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

  const isPremium = consultantState.is_premium;
  const wearableSummaries = useMemo(
    () => consultantState.wearable_summaries ?? [],
    [consultantState.wearable_summaries]
  );
  const wearableInsights = consultantState.wearable_insights ?? [];
  const journalEntries = useMemo(
    () => consultantState.journal_entries ?? [],
    [consultantState.journal_entries]
  );
  const initialJournal = useMemo(() => buildJournalForm(journalEntries[0]), [journalEntries]);
  const initialAnamnesis = useMemo(
    () => flattenAnamnesisAnswers(consultantState.consultant_anamnesis?.answers),
    [consultantState.consultant_anamnesis]
  );
  const initialNote = useMemo(
    () => consultantState.practitioner_note?.content ?? '',
    [consultantState.practitioner_note]
  );
  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === activePlanId) ?? plans[0] ?? null,
    [activePlanId, plans]
  );
  const initialPlanContent = useMemo(
    () => buildPlanContent(activePlan?.content ?? null),
    [activePlan]
  );

  const initialProfile = useMemo(
    () => ({
      name: consultantState.name ?? '',
      email: consultantState.email ?? '',
      age: consultantState.age ? String(consultantState.age) : '',
      city: consultantState.city ?? '',
      phone: consultantState.phone ?? '',
      consultation_reason: consultantState.consultation_reason ?? ''
    }),
    [consultantState]
  );

  const isProfileDirty = useMemo(() => {
    return (
      normalizeProfileValue(profileForm.name) !== normalizeProfileValue(initialProfile.name) ||
      normalizeProfileValue(profileForm.email) !== normalizeProfileValue(initialProfile.email) ||
      normalizeProfileValue(profileForm.age) !== normalizeProfileValue(initialProfile.age) ||
      normalizeProfileValue(profileForm.city) !== normalizeProfileValue(initialProfile.city) ||
      normalizeProfileValue(profileForm.phone) !== normalizeProfileValue(initialProfile.phone) ||
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

  const isPlanDirty = useMemo(() => {
    return !areRecordsEqual(planForm, initialPlanContent);
  }, [planForm, initialPlanContent]);

  const canEditPlan = activePlan?.status === 'draft';

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
    setConsultantState(consultant);
    setProfileForm({
      name: consultant.name ?? '',
      email: consultant.email ?? '',
      age: consultant.age ? String(consultant.age) : '',
      city: consultant.city ?? '',
      phone: consultant.phone ?? '',
      consultation_reason: consultant.consultation_reason ?? ''
    });
    setMessages(consultant.messages ?? []);
    setAnamnesisAnswers(flattenAnamnesisAnswers(consultant.consultant_anamnesis?.answers));
    setNoteContent(consultant.practitioner_note?.content ?? '');
    setJournalForm(buildJournalForm(consultant.journal_entries?.[0]));
    setAppointments(consultant.appointments ?? []);
    setPlans(consultant.consultant_plans ?? []);
    setActivePlanId(consultant.consultant_plans?.[0]?.id ?? null);
    setProfileEditing(false);
    setAnamnesisEditing(false);
    setJournalEditing(false);
    setNoteEditing(false);
  }, [consultant]);

  useEffect(() => {
    setPlanForm(initialPlanContent);
  }, [initialPlanContent]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let active = true;
    async function markRead() {
      const success = await markMessagesAsRead(consultant.id);
      if (!active || !success) return;
      setMessages((prev) =>
        prev.map((message) =>
          message.sender === 'consultant' && !message.read_at
            ? { ...message, read_at: new Date().toISOString() }
            : message
        )
      );
    }
    markRead();
    return () => {
      active = false;
    };
  }, [consultant.id]);

  async function handleSaveProfile() {
    if (!isProfileDirty) return;
    if (!profileForm.name.trim()) {
      setToast({
        title: 'Nom requis',
        description: 'Le nom du consultant est obligatoire.',
        variant: 'error'
      });
      return;
    }
    setProfileSaving(true);
    try {
      const parsedAge = profileForm.age.trim();
      const ageValue = parsedAge ? Number(parsedAge) : null;
      if (ageValue !== null && Number.isFinite(ageValue) && ageValue < 0) {
        throw new Error('Merci de renseigner un âge valide.');
      }
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim() || null,
        age: Number.isNaN(ageValue) ? null : ageValue,
        city: profileForm.city.trim() || null,
        phone: profileForm.phone.trim() || null,
        consultation_reason: profileForm.consultation_reason.trim() || null
      };
      const updated = await updateConsultant(consultant.id, payload);
      setConsultantState((prev) => ({ ...prev, ...updated }));
      setProfileEditing(false);
      setToast({
        title: 'Profil mis à jour',
        description: 'Les informations consultant ont été enregistrées.',
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
        consultantId: consultant.id,
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
      const updated = await upsertConsultantAnamnesis(consultant.id, anamnesisAnswers);
      if (!updated) {
        throw new Error('Impossible d’enregistrer l’anamnèse.');
      }
      setConsultantState((prev) => ({ ...prev, consultant_anamnesis: updated }));
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
      const saved = await upsertJournalEntry(consultant.id, {
        ...journalForm,
        date: journalForm.date
      });
      if (!saved) {
        throw new Error('Impossible d’enregistrer le journal.');
      }
      setConsultantState((prev) => {
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
      const saved = await upsertPractitionerNote(consultant.id, noteContent.trim());
      if (!saved) {
        throw new Error('Impossible d’enregistrer la note.');
      }
      setConsultantState((prev) => ({ ...prev, practitioner_note: saved }));
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

  async function handleCreatePlan(basePlan?: ConsultantPlan | null) {
    setPlanCreating(true);
    try {
      const nextVersion = Math.max(0, ...plans.map((planItem) => planItem.version)) + 1;
      const content = buildPlanContent(basePlan?.content ?? null);
      const created = await createConsultantPlanVersion({
        consultantId: consultant.id,
        version: nextVersion,
        content
      });
      setPlans((prev) => [created, ...prev]);
      setActivePlanId(created.id);
      setPlanForm(buildPlanContent(created.content ?? null));
      setToast({
        title: 'Plan créé',
        description: `Version v${created.version} prête à être complétée.`,
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de création',
        description: error instanceof Error ? error.message : 'Impossible de créer le plan.',
        variant: 'error'
      });
    } finally {
      setPlanCreating(false);
    }
  }

  async function handleSavePlan() {
    if (!activePlan) return;
    if (!canEditPlan) {
      setToast({
        title: 'Plan partagé',
        description: 'Cette version est figée et ne peut plus être modifiée.',
        variant: 'info'
      });
      return;
    }
    setPlanSaving(true);
    try {
      const updated = await updateConsultantPlanContent({
        planId: activePlan.id,
        content: planForm
      });
      setPlans((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setToast({
        title: 'Plan enregistré',
        description: 'La version a été mise à jour.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de sauvegarde',
        description: error instanceof Error ? error.message : 'Impossible d’enregistrer le plan.',
        variant: 'error'
      });
    } finally {
      setPlanSaving(false);
    }
  }

  async function handleSharePlan() {
    if (!activePlan) return;
    if (!canEditPlan) return;
    setPlanSharing(true);
    try {
      const shared = await shareConsultantPlanVersion(activePlan.id);
      setPlans((prev) => prev.map((item) => (item.id === shared.id ? shared : item)));
      setToast({
        title: 'Plan partagé',
        description: 'Le consultant peut désormais consulter cette version.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de partage',
        description: error instanceof Error ? error.message : 'Impossible de partager le plan.',
        variant: 'error'
      });
    } finally {
      setPlanSharing(false);
    }
  }

  async function handleDeleteConsultant() {
    setDeleteLoading(true);
    try {
      await deleteConsultant(consultant.id);
      setDeleteModalOpen(false);
      router.push('/consultants?deleted=1');
    } catch (error) {
      setToast({
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : 'Impossible de supprimer le consultant.',
        variant: 'error'
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleUpgradePremium() {
    setPremiumLoading(true);
    try {
      const updated = await updateConsultant(consultant.id, { is_premium: true, status: 'premium' });
      setConsultantState((prev) => ({ ...prev, ...updated }));
      setToast({
        title: 'Consultant Premium',
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
    const created = await sendMessage(consultant.id, trimmed, 'praticien');
    if (created) {
      setMessages((prev) => [...prev, created]);
      setMessageText('');
    }
    setMessageLoading(false);
  }

  function openAppointmentModal() {
    setAppointmentForm({
      startsAt: formatDateTimeLocal(new Date()),
      durationMinutes: '60',
      notes: ''
    });
    setAppointmentModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-teal/10 text-lg font-semibold text-teal">
              {getInitials(consultantState.name)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-warmgray">Dossier consultant</p>
              <h1 className="text-2xl font-semibold text-charcoal">
                {consultantState.name ?? 'Consultant'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-warmgray">
                <Badge variant={isPremium ? 'premium' : 'standard'}>
                  {isPremium ? 'Premium' : 'Standard'}
                </Badge>
                {consultantState.age ? <span>{consultantState.age} ans</span> : null}
                {consultantState.city ? <span>• {consultantState.city}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setTab('Profil');
                setProfileEditing(true);
              }}
            >
              Modifier le profil
            </Button>
            {tab !== 'Rendez-vous' ? (
              <Button variant="primary" onClick={openAppointmentModal}>
                Planifier RDV
              </Button>
            ) : null}
            <Button
              variant="destructive"
              onClick={() => setDeleteModalOpen(true)}
            >
              Supprimer le consultant
            </Button>
          </div>
        </div>
      </div>

      <TabsPills tabs={TABS} active={tab} onChange={setTab} />

      <div className="rounded-lg bg-white/60 px-4 py-3 border border-teal/10">
        <h2 className="text-sm font-semibold text-charcoal">{activeMeta.title}</h2>
        <p className="text-xs text-warmgray">{activeMeta.description}</p>
      </div>

      {tab === 'Profil' && (
        <div className="space-y-4">
          <Card
            className={cn(
              'transition',
              profileEditing ? 'ring-2 ring-teal/20 bg-teal/5' : ''
            )}
          >
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Informations consultant</h2>
                  <p className="text-xs text-warmgray">Profil et coordonnées du consultant.</p>
                </div>
                {!profileEditing ? (
                  <Button variant="secondary" onClick={() => setProfileEditing(true)}>
                    Modifier le profil
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
                    label="Téléphone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
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
                      <Badge variant={isPremium ? 'premium' : 'standard'}>
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
                    <p className="mt-1 text-sm">{renderValue(consultantState.name)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Email</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.email)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Téléphone</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Âge</p>
                    <p className="mt-1 text-sm">
                      {renderValue(consultantState.age ? `${consultantState.age} ans` : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Ville</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.city)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Statut</p>
                    <div className="mt-1">
                      <Badge variant={isPremium ? 'premium' : 'standard'}>
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
              profileEditing ? 'ring-2 ring-teal/20 bg-teal/5' : ''
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
                  {renderAnswer(consultantState.consultation_reason)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Rendez-vous' && (
        <div className="space-y-4">
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
                  <EmptyState
                    icon="calendar"
                    title="A planifier"
                    description="Aucune consultation programmee pour le moment."
                    action={
                      <Button variant="primary" onClick={openAppointmentModal}>
                        Planifier un rendez-vous
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Historique</h2>
              </CardHeader>
              <CardContent>
                {sortedAppointments.length === 0 ? (
                  <EmptyState
                    icon="appointments"
                    title="Aucun rendez-vous enregistre"
                    description="L'historique des consultations apparaitra ici."
                  />
                ) : (
                  <div className="space-y-3">
                    {sortedAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="rounded-lg bg-white/60 p-4 border border-teal/10"
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
        <Card className={cn(anamnesisEditing ? 'ring-2 ring-teal/20 bg-teal/5' : '')}>
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
                      <div
                        key={question.key}
                        className="rounded-lg bg-white/60 p-4 border border-teal/10"
                      >
                        <p className="text-xs uppercase tracking-wide text-warmgray">{question.label}</p>
                        {anamnesisEditing ? (
                          question.type === 'choice' ? (
                            <Select
                              className="mt-2"
                              value={anamnesisAnswers[question.key] ?? ''}
                              onChange={(event) =>
                                setAnamnesisAnswers((prev) => ({
                                  ...prev,
                                  [question.key]: event.target.value
                                }))
                              }
                            >
                              <option value="">Sélectionner</option>
                              {question.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </Select>
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
              {isPremium ? <Badge variant="active">Actif</Badge> : <Badge variant="attention">Non activé</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {!isPremium ? (
              <div className="relative overflow-hidden rounded-lg border border-dashed border-teal/20 bg-teal/5 p-6 text-sm text-marine">
                <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal shadow-soft">
                  Premium
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-charcoal">
                    <p className="text-sm font-semibold">Fonctionnalite Circular verrouillee</p>
                  </div>
                  <p>
                    Proposez l&apos;offre Premium a votre client afin d&apos;avoir acces a cette fonctionnalite.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={handleUpgradePremium} loading={premiumLoading}>
                      Passer en Premium
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => router.push('/circular/en-savoir-plus')}
                    >
                      En savoir plus
                    </Button>
                  </div>
                </div>
              </div>
            ) : wearableSummaries.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="Aucune donnee Circular disponible"
                description="Les donnees s'afficheront des la premiere synchronisation."
              />
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
                  <EmptyState
                    icon="notifications"
                    title="Aucun insight Circular disponible"
                    description="Les suggestions apparaitront apres analyse."
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Journal' && (
        <Card className={cn(journalEditing ? 'ring-2 ring-teal/20 bg-teal/5' : '')}>
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
              <div className="rounded-lg bg-white/60 p-5 border border-teal/10">
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
                      <Select
                        className="mt-2"
                        value={journalForm.mood ?? ''}
                        onChange={(event) =>
                          setJournalForm((prev) => ({ ...prev, mood: event.target.value as JournalEntry['mood'] }))
                        }
                      >
                        <option value="">Selectionner</option>
                        <option value="Positif">Positif</option>
                        <option value="Neutre">Neutre</option>
                        <option value="Negatif">Negatif</option>
                      </Select>
                    ) : (
                      <p className="mt-2 text-sm">{renderValue(journalForm.mood)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-warmgray">Énergie</p>
                    {journalEditing ? (
                      <Select
                        className="mt-2"
                        value={journalForm.energy ?? ''}
                        onChange={(event) =>
                          setJournalForm((prev) => ({
                            ...prev,
                            energy: event.target.value as JournalEntry['energy']
                          }))
                        }
                      >
                        <option value="">Sélectionner</option>
                        <option value="Bas">Bas</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Élevé">Élevé</option>
                      </Select>
                    ) : (
                      <p className="mt-2 text-sm">{renderValue(journalForm.energy)}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-warmgray">Notes du consultant</p>
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
                    <div key={item.key} className="flex items-center justify-between rounded-sm bg-sable/50 px-3 py-2">
                      <span className="text-xs text-warmgray">{item.label}</span>
                      {journalEditing ? (
                        <Select
                          value={journalForm[item.key] ? 'Oui' : 'Non'}
                          onChange={(event) =>
                            setJournalForm((prev) => ({
                              ...prev,
                              [item.key]: event.target.value === 'Oui'
                            }))
                          }
                          className="max-w-[120px] text-xs"
                        >
                          <option value="Oui">Oui</option>
                          <option value="Non">Non</option>
                        </Select>
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
                  <EmptyState
                    icon="documents"
                    title="Aucune entree de journal"
                    description="Commencez un suivi quotidien en ajoutant une premiere note."
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setJournalForm(buildJournalForm(undefined));
                          setJournalEditing(true);
                        }}
                      >
                        Ajouter une entree
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-3">
                    {journalEntries.map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-white/60 p-4 border border-teal/10">
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
        <Card className={cn(noteEditing ? 'ring-2 ring-teal/20 bg-teal/5' : '')}>
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
            <div className="flex items-start gap-3 rounded-lg bg-white/60 p-4 text-sm text-charcoal border border-teal/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 flex-shrink-0">
                <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">Notes privees</p>
                <p className="mt-1 text-xs text-warmgray">
                  Visibles uniquement par le naturopathe. Non partagees avec le consultant.
                </p>
              </div>
            </div>
            {noteEditing ? (
              <Textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Renseignez vos observations confidentielles..."
                rows={6}
              />
            ) : (
              <div className="rounded-lg bg-white/60 p-4 text-sm border border-teal/10 whitespace-pre-line">
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

      {tab === 'Plan de naturopathie' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Versions du plan</h2>
                  <p className="text-xs text-warmgray">
                    Suivi des versions partagées avec le consultant.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleCreatePlan(activePlan)}
                  loading={planCreating}
                >
                  Créer un plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <EmptyState
                  icon="documents"
                  title="Aucun plan cree"
                  description="Creez la premiere version du plan de naturopathie."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {plans.map((planItem) => {
                    const isActive = planItem.id === activePlan?.id;
                    const statusLabel = planItem.status === 'shared' ? 'Partagé' : 'Brouillon';
                    const statusVariant = planItem.status === 'shared' ? 'success' : 'info';
                    return (
                      <button
                        key={planItem.id}
                        type="button"
                        onClick={() => setActivePlanId(planItem.id)}
                        className={cn(
                          'text-left rounded-lg border border-teal/10 bg-white/60 p-4 transition',
                          isActive ? 'border-teal/40 ring-2 ring-teal/20' : 'hover:border-teal/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-charcoal">
                              Version v{planItem.version}
                            </p>
                            <p className="text-xs text-warmgray">
                              {formatDate(planItem.shared_at ?? planItem.created_at, true)}
                            </p>
                          </div>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {activePlan ? (
            <Card className={cn(canEditPlan ? 'ring-2 ring-teal/20 bg-teal/5' : '')}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Plan v{activePlan.version}
                    </h2>
                    <p className="text-xs text-warmgray">
                      {canEditPlan
                        ? 'Version brouillon (modifiable).'
                        : 'Version partagée (lecture seule).'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleCreatePlan(activePlan)}
                      disabled={planCreating}
                    >
                      Dupliquer
                    </Button>
                    {canEditPlan ? (
                      <Button
                        variant="secondary"
                        onClick={handleSavePlan}
                        loading={planSaving}
                        disabled={!isPlanDirty || planSaving}
                      >
                        Enregistrer
                      </Button>
                    ) : null}
                    {canEditPlan ? (
                      <Button
                        variant="primary"
                        onClick={handleSharePlan}
                        loading={planSharing}
                        disabled={planSharing || planSaving || isPlanDirty}
                      >
                        Partager au consultant
                      </Button>
                    ) : null}
                  </div>
                </div>
                {canEditPlan ? (
                  <EditBanner label="Complétez le plan avant de le partager." />
                ) : null}
              </CardHeader>
              <CardContent className="space-y-6">
                {PLAN_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-charcoal">{section.title}</h3>
                      {section.description ? (
                        <p className="text-xs text-warmgray">{section.description}</p>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <div
                          key={field.key}
                          className="rounded-lg bg-white/60 p-4 border border-teal/10"
                        >
                          <p className="text-xs uppercase tracking-wide text-warmgray">{field.label}</p>
                          {canEditPlan ? (
                            <Textarea
                              className="mt-2"
                              value={planForm[field.key]}
                              onChange={(event) =>
                                setPlanForm((prev) => ({
                                  ...prev,
                                  [field.key]: event.target.value
                                }))
                              }
                              placeholder={field.placeholder}
                              rows={3}
                            />
                          ) : (
                            <p className="mt-2 text-sm text-marine whitespace-pre-line break-words">
                              {renderAnswer(planForm[field.key])}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {canEditPlan ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={handleSavePlan}
                      loading={planSaving}
                      disabled={!isPlanDirty || planSaving}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setPlanForm(initialPlanContent)}
                      disabled={planSaving}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {tab === 'Résultats d\'analyses' && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Résultats d&apos;analyses</h2>
            <p className="text-xs text-warmgray">Documents et résultats d&apos;examens médicaux du consultant.</p>
          </CardHeader>
          <CardContent>
            {!consultant.analysis_results || consultant.analysis_results.length === 0 ? (
              <EmptyState
                icon="documents"
                title="Aucun resultat d'analyse"
                description="Les resultats d'analyses medicaux apparaitront ici lorsqu'ils seront disponibles."
              />
            ) : (
              <div className="space-y-3">
                {consultant.analysis_results.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between rounded-xl border border-warmgray/20 bg-sable/30 p-4"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-charcoal truncate">{result.file_name}</p>
                      {result.description && (
                        <p className="text-xs text-warmgray mt-1 line-clamp-2">{result.description}</p>
                      )}
                      <p className="text-xs text-warmgray mt-1">
                        {result.analysis_date
                          ? `Date : ${DATE_FORMATTER.format(new Date(result.analysis_date))}`
                          : `Ajouté le ${DATE_FORMATTER.format(new Date(result.uploaded_at))}`
                        }
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={() => window.open(result.file_path, '_blank')}
                      >
                        Voir
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = result.file_path;
                          link.download = result.file_name;
                          link.click();
                        }}
                      >
                        Télécharger
                      </Button>
                    </div>
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
              <EmptyState
                icon="messages"
                title="Aucun message pour le moment"
                description="Envoyez un premier message pour ouvrir la conversation."
              />
            ) : (
              <div className="space-y-3 rounded-lg bg-white/60 p-4 border border-teal/10">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[90%] rounded-lg px-4 py-2 text-sm sm:max-w-[78%]',
                      message.sender === 'consultant'
                        ? 'bg-sable/80 text-marine'
                        : 'ml-auto bg-teal text-white'
                    )}
                  >
                    <p className="break-words">{message.text || '—'}</p>
                    <p
                      className={cn(
                        'mt-1 text-[11px] opacity-80',
                        message.sender === 'consultant' ? 'text-warmgray' : 'text-white/80'
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
                placeholder="Écrire un message au consultant..."
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                rows={4}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                  loading={messageLoading}
                >
                  Envoyer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {appointmentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg glass-card p-6">
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
      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg glass-card p-6">
            <h2 className="text-lg font-semibold text-charcoal">Suppression définitive</h2>
            <p className="mt-2 text-sm text-warmgray">
              Cette action est définitive. Le consultant et toutes ses données associées seront supprimés.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConsultant}
                loading={deleteLoading}
              >
                Supprimer définitivement
              </Button>
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
