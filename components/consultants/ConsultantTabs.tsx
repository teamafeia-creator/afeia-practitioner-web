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
import { T } from '../../lib/terminology';
import {
  CONSEILLANCIER_SECTIONS,
  DEFAULT_CONSEILLANCIER_CONTENT,
  migrateOldPlanContent,
  sectionHasContent,
  type ConseillancierContent,
} from '../../lib/conseillancier';
import { supabase } from '../../lib/supabase';
import { BlockInsertButton } from '../blocks/BlockInsertButton';
import { SaveAsBlockButton } from '../blocks/SaveAsBlockButton';
import { TemplateSelector } from '../blocks/TemplateSelector';
import { ResourceInsertButton } from '../resources/ResourceInsertButton';
import { ResourcePicker } from '../resources/ResourcePicker';
import { assignResourceToConsultant } from '../../lib/queries/resources';
import { GenerateButton } from '../ai/GenerateButton';
import { SectionSuggestButton } from '../ai/SectionSuggestButton';
import { MedicalAlertBanner } from '../ai/MedicalAlertBanner';
import { AIStatusBar } from '../ai/AIStatusBar';
import type { BlockSection } from '../../lib/blocks-types';
import {
  User,
  ClipboardList,
  FileText,
  Calendar,
  BookOpen,
  Watch,
  BarChart3,
  StickyNote,
  MessageSquare,
  FileUp,
  Pencil,
  Heart,
  Plus,
  Trash2,
  Search,
  Link2,
  X,
  Leaf,
  Eye,
  Droplets,
  Wind,
  Paperclip,
} from 'lucide-react';
import type {
  AnamnesisAnswers,
  Appointment,
  JournalEntry,
  Message,
  ConsultantPlan,
  ConsultantWithDetails,
  ConsultantDrawing,
  WearableInsight,
  MedicalHistoryEntry,
  AllergyEntry,
  CurrentTreatmentEntry,
  ConsultantRelationship,
  ConsultantTerrain,
  ConsultantIrisPhoto,
  IrisAnnotation,
  IrisEye,
  VitalityLevel,
  SurchargeLevel,
  ConstitutionType,
  DiatheseType,
} from '../../lib/types';
import { upsertTerrain, updateIrisPhotoAnnotations, deleteIrisPhoto } from '../../lib/queries/terrain';
import {
  CONSTITUTIONS,
  CONSTITUTION_MAP,
  DIATHESES,
  DIATHESE_MAP,
  SURCHARGE_LEVELS,
  SURCHARGE_LEVEL_MAP,
  SURCHARGE_TYPES,
  EMUNCTORY_STATUSES,
  EMUNCTORY_STATUSES_PEAU,
  EMUNCTORY_STATUSES_POUMONS,
  EMUNCTORY_STATUS_MAP,
  EMUNCTORY_STATUS_PEAU_MAP,
  EMUNCTORY_STATUS_POUMONS_MAP,
  EMUNCTORIES,
  VITALITY_LEVELS,
  VITALITY_LEVEL_MAP,
  EYE_LABELS,
  getEmunctoryHexColor,
} from '../../lib/terrain-constants';
import { EmunctoryDiagram } from '../terrain/EmunctoryDiagram';
import { SurchargeGauge } from '../terrain/SurchargeGauge';
import { VitalityIndicator } from '../terrain/VitalityIndicator';
import { IrisViewer } from '../terrain/IrisViewer';
import { IrisComparison } from '../terrain/IrisComparison';
import { IrisUploader } from '../terrain/IrisUploader';
import {
  createMedicalHistoryEntry,
  updateMedicalHistoryEntry,
  deleteMedicalHistoryEntry,
  createAllergy,
  updateAllergy,
  deleteAllergy,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  getConsultantRelationships,
  createRelationship,
  deleteRelationship,
  searchConsultants,
} from '../../lib/queries/medical-record';
import { Modal, ModalFooter } from '../ui/Modal';
import { useContraindications } from '../../hooks/useContraindications';
import { ContraindicationBanner } from '../care-plan/ContraindicationBanner';
import { ContraindicationValidationModal } from '../care-plan/ContraindicationValidationModal';
import { DrawingGallery } from '../drawings/DrawingGallery';
import { TemplatePicker } from '../drawings/TemplatePicker';
import type { TemplateType, ExcalidrawData } from '../drawings/types';
import {
  createDrawing,
  updateDrawing,
  deleteDrawing as deleteDrawingQuery,
  uploadDrawingSnapshot,
} from '../../lib/queries/drawings';
import dynamic from 'next/dynamic';

const DrawingCanvas = dynamic(() => import('../drawings/DrawingCanvas'), { ssr: false });

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
  T.tabProfil,
  T.tabDossierMedical,
  T.tabRendezVous,
  T.tabAnamnese,
  T.tabBilanTerrain,
  T.tabBagueConnectee,
  T.tabJournal,
  T.tabNotesSeance,
  T.tabConseillancier,
  T.tabSchemas,
  T.tabDocuments,
  T.tabMessages,
] as const;

type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { title: string; description: string }> = {
  [T.tabProfil]: { title: T.tabProfil, description: T.descProfil },
  [T.tabDossierMedical]: { title: T.tabDossierMedical, description: T.descDossierMedical },
  [T.tabRendezVous]: { title: T.tabRendezVous, description: T.descRendezVous },
  [T.tabAnamnese]: { title: T.tabAnamnese, description: T.descAnamnese },
  [T.tabBilanTerrain]: { title: T.tabBilanTerrain, description: T.descBilanTerrain },
  [T.tabBagueConnectee]: { title: T.tabBagueConnectee, description: T.descBagueConnectee },
  [T.tabJournal]: { title: T.tabJournal, description: T.descJournal },
  [T.tabNotesSeance]: { title: T.tabNotesSeance, description: T.descNotesSeance },
  [T.tabConseillancier]: { title: T.tabConseillancier, description: T.descConseillancier },
  [T.tabSchemas]: { title: T.tabSchemas, description: T.descSchemas },
  [T.tabDocuments]: { title: T.tabDocuments, description: T.descDocuments },
  [T.tabMessages]: { title: T.tabMessages, description: T.descMessages },
};

const SIDEBAR_GROUPS = [
  {
    label: 'Identite',
    items: [
      { tab: T.tabProfil as Tab, label: 'Synthese', icon: User },
      { tab: T.tabDossierMedical as Tab, label: 'Dossier medical', icon: Heart },
      { tab: T.tabAnamnese as Tab, label: 'Anamnese', icon: ClipboardList },
      { tab: T.tabBilanTerrain as Tab, label: 'Bilan de terrain', icon: Leaf },
    ],
  },
  {
    label: 'Suivi',
    items: [
      { tab: T.tabConseillancier as Tab, label: 'Conseillancier', icon: FileText },
      { tab: T.tabRendezVous as Tab, label: 'Rendez-vous', icon: Calendar },
      { tab: T.tabJournal as Tab, label: 'Journal', icon: BookOpen },
    ],
  },
  {
    label: 'Donnees',
    items: [
      { tab: T.tabBagueConnectee as Tab, label: 'Bague connectee', icon: Watch },
      { tab: T.tabSchemas as Tab, label: 'Schémas corporels', icon: Pencil },
      { tab: T.tabDocuments as Tab, label: 'Documents', icon: FileUp },
    ],
  },
  {
    label: 'Communications',
    items: [
      { tab: T.tabNotesSeance as Tab, label: 'Notes privees', icon: StickyNote },
      { tab: T.tabMessages as Tab, label: 'Messages', icon: MessageSquare },
    ],
  },
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

function renderValue(value?: string | null, fallback = 'Non renseigné') {
  if (!value || value.trim() === '') {
    return <span className="italic text-stone">{fallback}</span>;
  }
  return <span className="text-charcoal">{value}</span>;
}

function renderAnswer(value?: string | null) {
  return renderValue(value);
}

// The old DEFAULT_PLAN_CONTENT and PLAN_SECTIONS have been replaced by
// CONSEILLANCIER_SECTIONS and DEFAULT_CONSEILLANCIER_CONTENT from lib/conseillancier.ts

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

function buildPlanContent(content?: Record<string, string> | null): ConseillancierContent {
  return migrateOldPlanContent(content);
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
    <div className="mt-4 rounded-lg border border-sage/20 bg-sage-light/50 px-3 py-2 text-xs font-medium text-sage">
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

const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Planifie',
  confirmed: 'Confirme',
  in_progress: 'En cours',
  cancelled: 'Annule',
  completed: 'Termine',
  rescheduled: 'Reporte',
};

const APPOINTMENT_STATUS_VARIANT: Record<string, 'info' | 'attention' | 'success'> = {
  scheduled: 'info',
  confirmed: 'info',
  in_progress: 'info',
  cancelled: 'attention',
  completed: 'success',
  rescheduled: 'attention',
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
            item.value ? 'bg-sage-light text-sage' : 'bg-cream text-stone'
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
    <div key={insight.id} className="rounded-lg bg-white/60 p-4 border border-divider">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-stone">Insight {insight.type ?? ''}</span>
        <Badge variant={insight.level === 'attention' ? 'attention' : 'info'}>
          {insight.level ?? 'info'}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-charcoal">{insight.message ?? '—'}</p>
      <p className="mt-2 text-xs text-stone">
        Suggestion : {insight.suggested_action ?? '—'}
      </p>
    </div>
  );
}

function IrisPhotoThumbnail({ photo, size }: { photo: ConsultantIrisPhoto; size: 'large' | 'small' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.storage
        .from('iris-photos')
        .createSignedUrl(photo.photo_path, 300);
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    }
    load();
    return () => { cancelled = true; };
  }, [photo.photo_path]);

  if (size === 'small') {
    return url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-[60px] w-[60px] object-cover" draggable={false} />
    ) : (
      <div className="h-[60px] w-[60px] bg-cream flex items-center justify-center text-[9px] text-stone">...</div>
    );
  }

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-full h-auto max-h-[300px] object-contain" draggable={false} />
  ) : (
    <div className="h-[200px] flex items-center justify-center text-xs text-stone">Chargement...</div>
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
    consultation_reason: consultant.consultation_reason ?? '',
    date_of_birth: consultant.date_of_birth ?? '',
    gender: consultant.gender ?? '',
    address_line1: consultant.address_line1 ?? '',
    address_line2: consultant.address_line2 ?? '',
    postal_code: consultant.postal_code ?? '',
    profession: consultant.profession ?? '',
    referring_doctor_name: consultant.referring_doctor_name ?? '',
    referring_doctor_phone: consultant.referring_doctor_phone ?? '',
    emergency_contact_name: consultant.emergency_contact_name ?? '',
    emergency_contact_phone: consultant.emergency_contact_phone ?? '',
    emergency_contact_relation: consultant.emergency_contact_relation ?? '',
  });
  const [messages, setMessages] = useState<Message[]>(consultant.messages ?? []);
  const [messageText, setMessageText] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageResourcePickerOpen, setMessageResourcePickerOpen] = useState(false);
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
  const [planForm, setPlanForm] = useState<ConseillancierContent>(buildPlanContent(null));
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planSharing, setPlanSharing] = useState(false);
  const [planCreating, setPlanCreating] = useState(false);
  const [medicalAlerts, setMedicalAlerts] = useState<string[]>([]);
  const [aiQuotaUsed, setAiQuotaUsed] = useState(0);
  const [aiQuotaMax, setAiQuotaMax] = useState(30);
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

  const [showContraindicationModal, setShowContraindicationModal] = useState(false);

  // ─── Drawings states ─────────────────────────────
  const [drawings, setDrawings] = useState<ConsultantDrawing[]>(consultant.drawings ?? []);
  const [activeDrawing, setActiveDrawing] = useState<ConsultantDrawing | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);

  // ─── Medical record states ──────────────────────
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryEntry[]>(consultant.medical_history ?? []);
  const [allergiesStructured, setAllergiesStructured] = useState<AllergyEntry[]>(consultant.allergies_structured ?? []);
  const [currentTreatments, setCurrentTreatments] = useState<CurrentTreatmentEntry[]>(consultant.current_treatments ?? []);
  const [relationships, setRelationships] = useState<ConsultantRelationship[]>(consultant.relationships ?? []);

  const [medicalHistoryModal, setMedicalHistoryModal] = useState<{ open: boolean; editingEntry: MedicalHistoryEntry | null }>({ open: false, editingEntry: null });
  const [allergyModal, setAllergyModal] = useState<{ open: boolean; editingEntry: AllergyEntry | null }>({ open: false, editingEntry: null });
  const [treatmentModal, setTreatmentModal] = useState<{ open: boolean; editingEntry: CurrentTreatmentEntry | null }>({ open: false, editingEntry: null });
  const [relationshipModal, setRelationshipModal] = useState<{ open: boolean }>({ open: false });
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ type: 'history' | 'allergy' | 'treatment' | 'relationship'; id: string } | null>(null);
  const [medicalSaving, setMedicalSaving] = useState(false);

  // Medical record form states
  const [historyForm, setHistoryForm] = useState({ category: 'personal' as string, description: '', year_onset: '', is_active: true, notes: '' });
  const [allergyForm, setAllergyForm] = useState({ type: 'allergy' as string, substance: '', severity: '' as string, reaction: '', diagnosed: false, notes: '' });
  const [treatmentForm, setTreatmentForm] = useState({ name: '', dosage: '', prescriber: '', start_date: '', is_active: true, notes: '' });
  const [relationshipForm, setRelationshipForm] = useState({ related_consultant_id: '', relationship_type: 'parent' as string, label: '' });
  const [consultantSearch, setConsultantSearch] = useState('');
  const [consultantSearchResults, setConsultantSearchResults] = useState<{ id: string; name: string; first_name?: string; last_name?: string }[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // ─── Terrain states ──────────────────────────
  const [terrainEditing, setTerrainEditing] = useState(false);
  const [terrainSaving, setTerrainSaving] = useState(false);
  const [terrainData, setTerrainData] = useState<Partial<ConsultantTerrain>>({});
  const [irisPhotos, setIrisPhotos] = useState<ConsultantIrisPhoto[]>(consultant.iris_photos ?? []);
  const [irisViewerPhoto, setIrisViewerPhoto] = useState<ConsultantIrisPhoto | null>(null);
  const [irisCompareEye, setIrisCompareEye] = useState<IrisEye | null>(null);
  const [showIrisUploader, setShowIrisUploader] = useState(false);

  // Extract substance names from plan content for contraindication checking
  const substanceNamesFromPlan = useMemo(() => {
    const substanceKeys: (keyof ConseillancierContent)[] = [
      'phytotherapie_plantes', 'phytotherapie_posologie',
      'complements', 'huiles_essentielles'
    ];
    const names: string[] = [];
    for (const key of substanceKeys) {
      const val = planForm[key];
      if (val && val.trim()) {
        const words = val.split(/[,;\n\-•·]+/).map((w: string) => w.trim()).filter(Boolean);
        names.push(...words);
      }
    }
    return names;
  }, [planForm]);

  const {
    alerts: contraindicationAlerts,
    loading: contraindicationsLoading,
    acknowledgeAlert: acknowledgeContraindication,
    criticalCount: contraindicationCriticalCount,
    warningCount: contraindicationWarningCount,
    infoCount: contraindicationInfoCount,
  } = useContraindications(consultant.id, substanceNamesFromPlan);

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
      consultation_reason: consultantState.consultation_reason ?? '',
      date_of_birth: consultantState.date_of_birth ?? '',
      gender: consultantState.gender ?? '',
      address_line1: consultantState.address_line1 ?? '',
      address_line2: consultantState.address_line2 ?? '',
      postal_code: consultantState.postal_code ?? '',
      profession: consultantState.profession ?? '',
      referring_doctor_name: consultantState.referring_doctor_name ?? '',
      referring_doctor_phone: consultantState.referring_doctor_phone ?? '',
      emergency_contact_name: consultantState.emergency_contact_name ?? '',
      emergency_contact_phone: consultantState.emergency_contact_phone ?? '',
      emergency_contact_relation: consultantState.emergency_contact_relation ?? '',
    }),
    [consultantState]
  );

  const isProfileDirty = useMemo(() => {
    const keys = Object.keys(initialProfile) as (keyof typeof initialProfile)[];
    return keys.some(
      (key) => normalizeProfileValue(profileForm[key]) !== normalizeProfileValue(initialProfile[key])
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
      .filter((appointment) => ['scheduled', 'confirmed', 'in_progress'].includes(appointment.status))
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
      consultation_reason: consultant.consultation_reason ?? '',
      date_of_birth: consultant.date_of_birth ?? '',
      gender: consultant.gender ?? '',
      address_line1: consultant.address_line1 ?? '',
      address_line2: consultant.address_line2 ?? '',
      postal_code: consultant.postal_code ?? '',
      profession: consultant.profession ?? '',
      referring_doctor_name: consultant.referring_doctor_name ?? '',
      referring_doctor_phone: consultant.referring_doctor_phone ?? '',
      emergency_contact_name: consultant.emergency_contact_name ?? '',
      emergency_contact_phone: consultant.emergency_contact_phone ?? '',
      emergency_contact_relation: consultant.emergency_contact_relation ?? '',
    });
    setMessages(consultant.messages ?? []);
    setAnamnesisAnswers(flattenAnamnesisAnswers(consultant.consultant_anamnesis?.answers));
    setNoteContent(consultant.practitioner_note?.content ?? '');
    setJournalForm(buildJournalForm(consultant.journal_entries?.[0]));
    setAppointments(consultant.appointments ?? []);
    setPlans(consultant.consultant_plans ?? []);
    setActivePlanId(consultant.consultant_plans?.[0]?.id ?? null);
    setMedicalHistory(consultant.medical_history ?? []);
    setAllergiesStructured(consultant.allergies_structured ?? []);
    setCurrentTreatments(consultant.current_treatments ?? []);
    setRelationships(consultant.relationships ?? []);
    setTerrainData(consultant.terrain ?? {});
    setIrisPhotos(consultant.iris_photos ?? []);
    setTerrainEditing(false);
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

  // Refetch appointments when the "Rendez-vous" tab becomes active
  useEffect(() => {
    if (tab !== T.tabRendezVous) return;
    let cancelled = false;
    async function refetchAppointments() {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('consultant_id', consultant.id)
        .order('starts_at', { ascending: false });
      if (!cancelled && data) {
        setAppointments(data);
      }
    }
    refetchAppointments();
    return () => { cancelled = true; };
  }, [tab, consultant.id]);

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
        consultation_reason: profileForm.consultation_reason.trim() || null,
        date_of_birth: profileForm.date_of_birth || null,
        gender: profileForm.gender || null,
        address_line1: profileForm.address_line1.trim() || null,
        address_line2: profileForm.address_line2.trim() || null,
        postal_code: profileForm.postal_code.trim() || null,
        profession: profileForm.profession.trim() || null,
        referring_doctor_name: profileForm.referring_doctor_name.trim() || null,
        referring_doctor_phone: profileForm.referring_doctor_phone.trim() || null,
        emergency_contact_name: profileForm.emergency_contact_name.trim() || null,
        emergency_contact_phone: profileForm.emergency_contact_phone.trim() || null,
        emergency_contact_relation: profileForm.emergency_contact_relation.trim() || null,
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

  // ─── Terrain handlers ──────────────────────────

  async function handleSaveTerrain() {
    setTerrainSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const practitionerId = session?.session?.user?.id;
      if (!practitionerId) throw new Error('Session invalide.');

      const updated = await upsertTerrain(consultant.id, practitionerId, terrainData);
      if (!updated) throw new Error('Impossible d\'enregistrer le bilan de terrain.');

      setConsultantState((prev) => ({ ...prev, terrain: updated }));
      setTerrainEditing(false);
      setToast({
        title: 'Bilan de terrain enregistré',
        description: 'Les données ont été mises à jour.',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur de sauvegarde',
        description: error instanceof Error ? error.message : 'Impossible d\'enregistrer le bilan.',
        variant: 'error'
      });
    } finally {
      setTerrainSaving(false);
    }
  }

  function handleIrisUploadComplete(photo: ConsultantIrisPhoto) {
    setIrisPhotos((prev) => [photo, ...prev]);
    setConsultantState((prev) => ({
      ...prev,
      iris_photos: [photo, ...(prev.iris_photos ?? [])]
    }));
    setShowIrisUploader(false);
    setToast({
      title: 'Photo importée',
      description: 'La photo d\'iris a été ajoutée.',
      variant: 'success'
    });
  }

  async function handleIrisSaveAnnotations(photo: ConsultantIrisPhoto, annotations: IrisAnnotation[], notes: string) {
    try {
      const updated = await updateIrisPhotoAnnotations(photo.id, annotations, notes);
      if (!updated) throw new Error('Échec de la sauvegarde.');

      setIrisPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? updated : p))
      );
      setConsultantState((prev) => ({
        ...prev,
        iris_photos: (prev.iris_photos ?? []).map((p) => (p.id === photo.id ? updated : p))
      }));
      setIrisViewerPhoto(null);
      setToast({
        title: 'Annotations sauvegardées',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de sauvegarder.',
        variant: 'error'
      });
    }
  }

  async function handleDeleteIrisPhoto(photo: ConsultantIrisPhoto) {
    try {
      const success = await deleteIrisPhoto(photo.id, photo.photo_path);
      if (!success) throw new Error('Échec de la suppression.');

      setIrisPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setConsultantState((prev) => ({
        ...prev,
        iris_photos: (prev.iris_photos ?? []).filter((p) => p.id !== photo.id)
      }));
      setToast({
        title: 'Photo supprimée',
        variant: 'success'
      });
    } catch (error) {
      setToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer.',
        variant: 'error'
      });
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

  function handleSharePlanClick() {
    if (!activePlan || !canEditPlan) return;
    // If unacknowledged critical alerts exist, show validation modal
    const unacknowledgedCritical = contraindicationAlerts.filter(
      (a) => a.severity === 'critical' && !a.acknowledged
    );
    if (unacknowledgedCritical.length > 0) {
      setShowContraindicationModal(true);
      return;
    }
    handleSharePlan();
  }

  async function handleSharePlan() {
    if (!activePlan) return;
    if (!canEditPlan) return;
    setShowContraindicationModal(false);
    setPlanSharing(true);
    try {
      // Acknowledge all remaining alerts when sharing
      for (const alert of contraindicationAlerts.filter((a) => !a.acknowledged)) {
        await acknowledgeContraindication(alert.ruleId);
      }
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

  async function handleDownloadPdf() {
    if (!activePlan) return;
    setPdfDownloading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const response = await fetch(
        `/api/consultants/${consultant.id}/plans/${activePlan.id}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Erreur lors de la génération du PDF.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="(.+?)"/);
      link.download = filenameMatch?.[1] || `conseillancier-v${activePlan.version}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({
        title: 'PDF téléchargé',
        description: 'Le conseillancier a été exporté en PDF.',
        variant: 'success',
      });
    } catch (error) {
      setToast({
        title: 'Erreur d\'export',
        description: error instanceof Error ? error.message : 'Impossible de générer le PDF.',
        variant: 'error',
      });
    } finally {
      setPdfDownloading(false);
    }
  }

  function handleAIGenerated(content: Record<string, string>, plan: Record<string, unknown> | null) {
    // Merge AI content into the plan form
    const merged = buildPlanContent({ ...planForm, ...content });
    setPlanForm(merged);

    // If a new plan was created by the API, add it to the plans list
    if (plan && plan.id) {
      const newPlan = plan as unknown as ConsultantPlan;
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === newPlan.id);
        if (exists) {
          return prev.map((p) => (p.id === newPlan.id ? newPlan : p));
        }
        return [newPlan, ...prev];
      });
      setActivePlanId(newPlan.id);
    }

    setToast({
      title: 'Conseillancier généré par IA',
      description: 'Relisez et ajustez les sections avant de partager.',
      variant: 'success',
    });
  }

  function handleAIError(error: string) {
    setToast({
      title: 'Erreur IA',
      description: error,
      variant: 'error',
    });
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

  // ─── Drawing handlers ───────────────────────────
  function handleCreateDrawing() {
    setShowTemplatePicker(true);
  }

  function handleOpenDrawing(drawing: ConsultantDrawing) {
    setActiveDrawing(drawing);
    setSelectedTemplate(drawing.template_type as TemplateType);
    setShowDrawingCanvas(true);
  }

  async function handleSaveDrawing(data: ExcalidrawData, pngBlob: Blob, drawingTitle: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (activeDrawing) {
        const updated = await updateDrawing(activeDrawing.id, {
          title: drawingTitle,
          excalidraw_data: data,
          version: (activeDrawing.version ?? 1) + 1,
        });
        if (updated) {
          const snapshotPath = await uploadDrawingSnapshot(user.id, activeDrawing.id, pngBlob);
          if (snapshotPath) {
            await updateDrawing(activeDrawing.id, { snapshot_path: snapshotPath });
            updated.snapshot_path = snapshotPath;
          }
          setDrawings((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        }
      } else {
        const created = await createDrawing({
          consultant_id: consultant.id,
          practitioner_id: user.id,
          title: drawingTitle,
          template_type: selectedTemplate ?? 'blank',
          excalidraw_data: data,
        });
        if (created) {
          const snapshotPath = await uploadDrawingSnapshot(user.id, created.id, pngBlob);
          if (snapshotPath) {
            await updateDrawing(created.id, { snapshot_path: snapshotPath });
            created.snapshot_path = snapshotPath;
          }
          setDrawings((prev) => [created, ...prev]);
        }
      }

      setShowDrawingCanvas(false);
      setActiveDrawing(null);
      setToast({ title: 'Schéma sauvegardé', variant: 'success' });
    } catch (error) {
      console.error('[drawings] save error:', error);
      setToast({ title: 'Erreur de sauvegarde', variant: 'error' });
    }
  }

  async function handleDeleteDrawing(id: string) {
    const drawing = drawings.find((d) => d.id === id);
    const success = await deleteDrawingQuery(id, drawing?.snapshot_path);
    if (success) {
      setDrawings((prev) => prev.filter((d) => d.id !== id));
      setToast({ title: 'Schéma supprimé', variant: 'success' });
    } else {
      setToast({ title: 'Erreur lors de la suppression', variant: 'error' });
    }
  }

  async function handleExportDrawingPDF(drawingId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const url = `/api/consultants/${consultant.id}/drawings/${drawingId}/pdf`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast({ title: err.error || 'Erreur PDF', variant: 'error' });
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      setToast({ title: 'Erreur lors de l\'export PDF', variant: 'error' });
    }
  }

  return (
    <div className="space-y-4">
      {/* Persistent Header */}
      <div className="glass-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sage-light text-lg font-semibold text-sage">
              {getInitials(consultantState.name)}
            </div>
            <div>
              <p className="text-xs tracking-wide text-stone" style={{ fontVariant: 'small-caps' }}>Dossier consultant</p>
              <h1 className="text-2xl font-semibold font-serif text-charcoal">
                {consultantState.name ?? 'Consultant'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone">
                <Badge variant={isPremium ? 'premium' : 'standard'}>
                  {isPremium ? 'Premium' : 'Standard'}
                </Badge>
                {consultantState.age ? <span>{consultantState.age} ans</span> : null}
                {consultantState.city ? <span>· {consultantState.city}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(consultantState.journal_entries?.length ?? 0) >= 7 && (
              <Button
                variant="secondary"
                onClick={() => window.open(`/consultation/${consultant.id}/bilan`, '_blank')}
              >
                <BarChart3 className="mr-1 h-4 w-4" />
                Bilan visuel
              </Button>
            )}
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
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: horizontal tabs */}
      <div className="lg:hidden">
        <TabsPills tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* Desktop: Sidebar + Content layout */}
      <div className="flex gap-6">
        {/* Secondary Sidebar — desktop only */}
        <aside className="hidden lg:block w-[180px] shrink-0">
          <nav className="sticky top-20 space-y-4">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-1 text-[11px] font-medium tracking-wider text-mist" style={{ fontVariant: 'small-caps' }}>
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = tab === item.tab;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.tab}
                        onClick={() => setTab(item.tab)}
                        className={cn(
                          'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'bg-sage text-white shadow-sm'
                            : 'text-stone hover:bg-cream hover:text-charcoal'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Section description */}
          <div className="rounded-xl bg-white px-4 py-3 border border-divider mb-4">
            <h2 className="text-sm font-semibold text-charcoal">{activeMeta.title}</h2>
            <p className="text-xs text-stone">{activeMeta.description}</p>
          </div>

      {tab === 'Profil' && (
        <div className="space-y-4">
          <Card
            className={cn(
              'transition',
              profileEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : ''
            )}
          >
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Informations consultant</h2>
                  <p className="text-xs text-stone">Profil et coordonnées du consultant.</p>
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
                    <p className="text-xs font-medium text-stone">Statut</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={isPremium ? 'premium' : 'standard'}>
                        {isPremium ? 'Premium' : 'Standard'}
                      </Badge>
                      <span className="text-xs text-stone">
                        Statut non modifiable depuis le profil.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Nom</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.name)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Email</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.email)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Téléphone</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Âge</p>
                    <p className="mt-1 text-sm">
                      {renderValue(consultantState.age ? `${consultantState.age} ans` : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Ville</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.city)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Statut</p>
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
              profileEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : ''
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
                <p className="text-sm text-charcoal whitespace-pre-line">
                  {renderAnswer(consultantState.consultation_reason)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ─── Card Informations administratives ───── */}
          <Card className={cn('transition', profileEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : '')}>
            <CardHeader>
              <h2 className="text-sm font-semibold">{T.labelInfosAdmin}</h2>
              {profileEditing ? <EditBanner label="Complétez les informations administratives." /> : null}
            </CardHeader>
            <CardContent>
              {profileEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Date de naissance" type="date" value={profileForm.date_of_birth} onChange={(e) => setProfileForm((prev) => ({ ...prev, date_of_birth: e.target.value }))} />
                  <Select label="Sexe" value={profileForm.gender} onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}>
                    <option value="">— Non renseigné —</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="other">Autre</option>
                  </Select>
                  <Input label="Adresse" value={profileForm.address_line1} onChange={(e) => setProfileForm((prev) => ({ ...prev, address_line1: e.target.value }))} placeholder="Numéro et rue" />
                  <Input label="Complément d'adresse" value={profileForm.address_line2} onChange={(e) => setProfileForm((prev) => ({ ...prev, address_line2: e.target.value }))} placeholder="Bâtiment, étage..." />
                  <Input label="Code postal" value={profileForm.postal_code} onChange={(e) => setProfileForm((prev) => ({ ...prev, postal_code: e.target.value }))} />
                  <Input label="Profession" value={profileForm.profession} onChange={(e) => setProfileForm((prev) => ({ ...prev, profession: e.target.value }))} />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Date de naissance</p>
                    <p className="mt-1 text-sm">
                      {consultantState.date_of_birth ? (
                        <>
                          {formatDate(consultantState.date_of_birth)}
                          {' '}
                          <span className="text-stone">
                            ({Math.floor((Date.now() - new Date(consultantState.date_of_birth).getTime()) / 31557600000)} ans)
                          </span>
                        </>
                      ) : (
                        <span className="italic text-stone">—</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Sexe</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.gender === 'male' ? 'Homme' : consultantState.gender === 'female' ? 'Femme' : consultantState.gender === 'other' ? 'Autre' : null)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Adresse</p>
                    <p className="mt-1 text-sm">
                      {renderValue(
                        [consultantState.address_line1, consultantState.address_line2, consultantState.postal_code, consultantState.city].filter(Boolean).join(', ') || null
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Profession</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.profession)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Card Contacts médicaux et urgence ───── */}
          <Card className={cn('transition', profileEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : '')}>
            <CardHeader>
              <h2 className="text-sm font-semibold">{T.labelContactsMedicaux}</h2>
              {profileEditing ? <EditBanner label="Renseignez les contacts médicaux." /> : null}
            </CardHeader>
            <CardContent>
              {profileEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Médecin traitant" value={profileForm.referring_doctor_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, referring_doctor_name: e.target.value }))} placeholder="Nom du médecin" />
                  <Input label="Tél. médecin traitant" type="tel" value={profileForm.referring_doctor_phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, referring_doctor_phone: e.target.value }))} />
                  <Input label="Contact d'urgence" value={profileForm.emergency_contact_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergency_contact_name: e.target.value }))} placeholder="Nom du contact" />
                  <Input label="Tél. contact d'urgence" type="tel" value={profileForm.emergency_contact_phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergency_contact_phone: e.target.value }))} />
                  <Input label="Relation" value={profileForm.emergency_contact_relation} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergency_contact_relation: e.target.value }))} placeholder="Ex : conjoint, parent..." />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Médecin traitant</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.referring_doctor_name)}</p>
                    {consultantState.referring_doctor_phone ? <p className="text-xs text-stone">{consultantState.referring_doctor_phone}</p> : null}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Contact d&apos;urgence</p>
                    <p className="mt-1 text-sm">{renderValue(consultantState.emergency_contact_name)}</p>
                    {consultantState.emergency_contact_phone ? <p className="text-xs text-stone">{consultantState.emergency_contact_phone}</p> : null}
                    {consultantState.emergency_contact_relation ? <p className="text-xs text-stone">({consultantState.emergency_contact_relation})</p> : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Card Liens familiaux ───── */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-sm font-semibold">{T.labelLiensFamiliaux}</h2>
                <Button variant="secondary" onClick={() => {
                  setRelationshipForm({ related_consultant_id: '', relationship_type: 'parent', label: '' });
                  setConsultantSearch('');
                  setConsultantSearchResults([]);
                  setRelationshipModal({ open: true });
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un lien familial
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {relationships.length === 0 ? (
                <EmptyState icon="users" title="Aucun lien familial" description="Ajoutez des liens de parenté avec d'autres consultants." />
              ) : (
                <div className="space-y-2">
                  {relationships.map((rel) => {
                    const relName = rel.related_consultant?.name || 'Consultant';
                    const typeLabels: Record<string, string> = { parent: 'Parent', child: 'Enfant', spouse: 'Conjoint(e)', sibling: 'Frère/Sœur', other: 'Autre' };
                    return (
                      <div key={rel.id} className="flex items-center justify-between rounded-lg bg-white/60 p-3 border border-divider">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-stone" />
                          <button
                            onClick={() => router.push(`/consultants/${rel.related_consultant_id}`)}
                            className="text-sm font-medium text-charcoal hover:underline"
                          >
                            {relName}
                          </button>
                          <Badge variant="info">{typeLabels[rel.relationship_type] || rel.relationship_type}</Badge>
                          {rel.label ? <span className="text-xs text-stone">({rel.label})</span> : null}
                        </div>
                        <button
                          onClick={() => setConfirmDeleteId({ type: 'relationship', id: rel.id })}
                          className="p-1 rounded text-stone hover:text-rose hover:bg-rose/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ DOSSIER MÉDICAL TAB ═══════════════ */}
      {tab === T.tabDossierMedical && (
        <div className="space-y-4">
          {/* ─── Antécédents ───── */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{T.labelAntecedents}</h2>
                  <p className="text-xs text-stone">Antécédents personnels, familiaux et chirurgicaux.</p>
                </div>
                <Button variant="secondary" onClick={() => {
                  setHistoryForm({ category: 'personal', description: '', year_onset: '', is_active: true, notes: '' });
                  setMedicalHistoryModal({ open: true, editingEntry: null });
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {medicalHistory.length === 0 ? (
                <EmptyState icon="clipboard" title="Aucun antécédent" description="Ajoutez les antécédents du consultant." />
              ) : (
                <div className="space-y-2">
                  {(['personal', 'family', 'surgical'] as const).map((cat) => {
                    const items = medicalHistory.filter((h) => h.category === cat);
                    if (items.length === 0) return null;
                    const catLabels: Record<string, string> = { personal: 'Personnel', family: 'Familial', surgical: 'Chirurgical' };
                    const catVariants: Record<string, 'info' | 'success' | 'warning'> = { personal: 'info', family: 'success', surgical: 'warning' };
                    return (
                      <div key={cat}>
                        <p className="text-xs font-medium text-stone uppercase tracking-wide mb-1">{catLabels[cat]}</p>
                        {items.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-lg bg-white/60 p-3 border border-divider mb-1 cursor-pointer hover:bg-cream/50"
                            onClick={() => {
                              setHistoryForm({
                                category: entry.category,
                                description: entry.description,
                                year_onset: entry.year_onset ? String(entry.year_onset) : '',
                                is_active: entry.is_active,
                                notes: entry.notes ?? '',
                              });
                              setMedicalHistoryModal({ open: true, editingEntry: entry });
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Badge variant={catVariants[cat]}>{catLabels[cat]}</Badge>
                              <span className="text-sm text-charcoal truncate">{entry.description}</span>
                              {entry.year_onset ? <span className="text-xs text-stone">({entry.year_onset})</span> : null}
                              <Badge variant={entry.is_active ? 'attention' : 'success'}>{entry.is_active ? 'Actif' : 'Résolu'}</Badge>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId({ type: 'history', id: entry.id }); }}
                              className="p-1 rounded text-stone hover:text-rose hover:bg-rose/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Allergies et intolérances ───── */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{T.labelAllergies}</h2>
                  <p className="text-xs text-stone">Allergies, intolérances et sensibilités.</p>
                </div>
                <Button variant="secondary" onClick={() => {
                  setAllergyForm({ type: 'allergy', substance: '', severity: '', reaction: '', diagnosed: false, notes: '' });
                  setAllergyModal({ open: true, editingEntry: null });
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allergiesStructured.length === 0 ? (
                <EmptyState icon="alert" title="Aucune allergie" description="Ajoutez les allergies et intolérances du consultant." />
              ) : (
                <div className="space-y-2">
                  {allergiesStructured.map((entry) => {
                    const typeLabels: Record<string, string> = { allergy: 'Allergie', intolerance: 'Intolérance', sensitivity: 'Sensibilité' };
                    const typeVariants: Record<string, 'urgent' | 'warning' | 'attention'> = { allergy: 'urgent', intolerance: 'warning', sensitivity: 'attention' };
                    const sevLabels: Record<string, string> = { mild: 'Légère', moderate: 'Modérée', severe: 'Sévère' };
                    const sevVariants: Record<string, 'attention' | 'warning' | 'urgent'> = { mild: 'attention', moderate: 'warning', severe: 'urgent' };
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg bg-white/60 p-3 border border-divider cursor-pointer hover:bg-cream/50"
                        onClick={() => {
                          setAllergyForm({
                            type: entry.type,
                            substance: entry.substance,
                            severity: entry.severity ?? '',
                            reaction: entry.reaction ?? '',
                            diagnosed: entry.diagnosed,
                            notes: entry.notes ?? '',
                          });
                          setAllergyModal({ open: true, editingEntry: entry });
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                          <Badge variant={typeVariants[entry.type]}>{typeLabels[entry.type]}</Badge>
                          <span className="text-sm font-medium text-charcoal">{entry.substance}</span>
                          {entry.severity ? <Badge variant={sevVariants[entry.severity]}>{sevLabels[entry.severity]}</Badge> : null}
                          {entry.diagnosed ? <Badge variant="info">Diagnostiquée</Badge> : null}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId({ type: 'allergy', id: entry.id }); }}
                          className="p-1 rounded text-stone hover:text-rose hover:bg-rose/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {allergiesStructured.length > 0 ? (
                <div className="mt-3 rounded-lg border border-sage/20 bg-sage-light/30 px-3 py-2 text-xs text-sage">
                  Les allergies de ce consultant sont prises en compte dans les alertes de contre-indication du conseillancier.
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* ─── Traitements en cours ───── */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{T.labelTraitements}</h2>
                  <p className="text-xs text-stone">Accompagnements et traitements actuels.</p>
                </div>
                <Button variant="secondary" onClick={() => {
                  setTreatmentForm({ name: '', dosage: '', prescriber: '', start_date: '', is_active: true, notes: '' });
                  setTreatmentModal({ open: true, editingEntry: null });
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentTreatments.length === 0 ? (
                <EmptyState icon="clipboard" title="Aucun traitement" description="Ajoutez les traitements en cours du consultant." />
              ) : (
                <div className="space-y-2">
                  {currentTreatments.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg bg-white/60 p-3 border border-divider cursor-pointer hover:bg-cream/50"
                      onClick={() => {
                        setTreatmentForm({
                          name: entry.name,
                          dosage: entry.dosage ?? '',
                          prescriber: entry.prescriber ?? '',
                          start_date: entry.start_date ?? '',
                          is_active: entry.is_active,
                          notes: entry.notes ?? '',
                        });
                        setTreatmentModal({ open: true, editingEntry: entry });
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <span className="text-sm font-medium text-charcoal">{entry.name}</span>
                        {entry.dosage ? <span className="text-xs text-stone">{entry.dosage}</span> : null}
                        {entry.prescriber ? <span className="text-xs text-stone">— {entry.prescriber}</span> : null}
                        <Badge variant={entry.is_active ? 'info' : 'archived'}>{entry.is_active ? 'En cours' : 'Arrêté'}</Badge>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId({ type: 'treatment', id: entry.id }); }}
                        className="p-1 rounded text-stone hover:text-rose hover:bg-rose/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
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
              onClick={() => router.push(`/agenda`)}
              icon={<span className="text-sm">+</span>}
            >
              Planifier une seance
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Upcoming appointments */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Prochaines seances</h2>
              </CardHeader>
              <CardContent>
                {(() => {
                  const now = new Date();
                  const upcoming = sortedAppointments
                    .filter((a) => ['scheduled', 'confirmed', 'in_progress'].includes(a.status) && new Date(a.starts_at) > now)
                    .reverse();
                  if (upcoming.length === 0) {
                    return (
                      <EmptyState
                        icon="calendar"
                        title="A planifier"
                        description="Aucune seance programmee pour le moment."
                        action={
                          <Button variant="primary" onClick={() => router.push('/agenda')}>
                            Ouvrir l&apos;agenda
                          </Button>
                        }
                      />
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {upcoming.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-lg bg-white/60 p-4 border border-divider"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-charcoal">
                                {formatDate(appointment.starts_at, true)}
                              </p>
                              {appointment.ends_at ? (
                                <p className="text-xs text-stone">
                                  {formatDate(appointment.starts_at, true)} - {formatDate(appointment.ends_at, true)}
                                </p>
                              ) : null}
                            </div>
                            <Badge variant={APPOINTMENT_STATUS_VARIANT[appointment.status] || 'info'}>
                              {APPOINTMENT_STATUS_LABEL[appointment.status] || appointment.status}
                            </Badge>
                          </div>
                          {(appointment.notes_internal || appointment.notes) ? (
                            <p className="mt-2 text-sm text-charcoal">{appointment.notes_internal || appointment.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Historique des seances</h2>
              </CardHeader>
              <CardContent>
                {(() => {
                  const history = sortedAppointments.filter((a) =>
                    ['completed', 'cancelled', 'rescheduled'].includes(a.status)
                  );
                  if (history.length === 0) {
                    return (
                      <EmptyState
                        icon="appointments"
                        title="Aucune seance passee"
                        description="L'historique des seances apparaitra ici."
                      />
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {history.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={cn(
                            'rounded-lg bg-white/60 p-4 border border-divider',
                            appointment.status === 'cancelled' && 'opacity-60'
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className={cn(
                                'text-sm font-medium text-charcoal',
                                appointment.status === 'cancelled' && 'line-through'
                              )}>
                                {formatDate(appointment.starts_at, true)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={APPOINTMENT_STATUS_VARIANT[appointment.status] || 'info'}>
                                {APPOINTMENT_STATUS_LABEL[appointment.status] || appointment.status}
                              </Badge>
                              {appointment.status === 'completed' && !appointment.notes_internal && !appointment.notes && (
                                <span className="text-xs text-amber-600">Notes a rediger</span>
                              )}
                            </div>
                          </div>
                          {(appointment.notes_internal || appointment.notes) ? (
                            <p className="mt-2 text-sm text-charcoal">{appointment.notes_internal || appointment.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'Anamnèse' && (
        <Card className={cn(anamnesisEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : '')}>
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
                      <p className="text-xs text-stone">{section.description}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {section.questions.map((question) => (
                      <div
                        key={question.key}
                        className="rounded-lg bg-white/60 p-4 border border-divider"
                      >
                        <p className="text-xs uppercase tracking-wide text-stone">{question.label}</p>
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
                          <p className="mt-2 text-sm text-charcoal whitespace-pre-line break-words">
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

      {/* ═══════════════════════════════════════════════
          BILAN DE TERRAIN
          ═══════════════════════════════════════════════ */}
      {tab === T.tabBilanTerrain && (
        <div className="space-y-4">
          <Card className={cn(terrainEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : '')}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-sage" />
                  <h2 className="text-sm font-semibold">Bilan de terrain</h2>
                </div>
                {!terrainEditing ? (
                  <Button variant="secondary" onClick={() => setTerrainEditing(true)}>
                    Modifier
                  </Button>
                ) : null}
              </div>
              {terrainEditing ? <EditBanner label="Pensez à sauvegarder le bilan." /> : null}
            </CardHeader>
            <CardContent>
              <div className="space-y-8">

                {/* Section 0 — Force vitale */}
                <div className="border border-divider rounded-xl p-4 space-y-3">
                  <VitalityIndicator
                    level={(terrainData.force_vitale as VitalityLevel) ?? null}
                    notes={terrainData.force_vitale_notes ?? undefined}
                    date={terrainData.bilan_date ?? undefined}
                    editing={terrainEditing}
                    onLevelChange={(level) => setTerrainData((prev) => ({ ...prev, force_vitale: level }))}
                  />
                  {terrainEditing && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Date du bilan"
                          type="date"
                          value={terrainData.bilan_date ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, bilan_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Textarea
                          value={terrainData.force_vitale_notes ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, force_vitale_notes: e.target.value }))}
                          placeholder="Notes sur la force vitale..."
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 1 — Constitution, Tempérament & Diathèse */}
                <div className="border border-divider rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-charcoal">Constitution, Tempérament & Diathèse</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Constitution primaire */}
                    <div className="space-y-1">
                      <span className="text-xs text-warmgray">Constitution</span>
                      {terrainEditing ? (
                        <Select
                          value={terrainData.constitution ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, constitution: (e.target.value || null) as ConstitutionType | null }))}
                        >
                          <option value="">Non renseigné</option>
                          {CONSTITUTIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label} — {c.description}</option>
                          ))}
                        </Select>
                      ) : (
                        <div className="text-sm">
                          {terrainData.constitution ? (
                            <span className={cn('inline-flex items-center rounded-2xl px-3 py-1 text-xs font-medium border', CONSTITUTION_MAP[terrainData.constitution as ConstitutionType]?.color)}>
                              {CONSTITUTION_MAP[terrainData.constitution as ConstitutionType]?.label}
                            </span>
                          ) : (
                            <span className="italic text-stone">Non renseigné</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Constitution secondaire */}
                    <div className="space-y-1">
                      <span className="text-xs text-warmgray">Constitution secondaire</span>
                      {terrainEditing ? (
                        <Select
                          value={terrainData.constitution_secondary ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, constitution_secondary: (e.target.value || null) as ConstitutionType | null }))}
                        >
                          <option value="">Aucune</option>
                          {CONSTITUTIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </Select>
                      ) : (
                        <div className="text-sm">
                          {terrainData.constitution_secondary ? (
                            <span className={cn('inline-flex items-center rounded-2xl px-3 py-1 text-xs font-medium border', CONSTITUTION_MAP[terrainData.constitution_secondary as ConstitutionType]?.color)}>
                              {CONSTITUTION_MAP[terrainData.constitution_secondary as ConstitutionType]?.label}
                            </span>
                          ) : (
                            <span className="italic text-stone">—</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tempérament */}
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-xs text-warmgray">Tempérament</span>
                      {terrainEditing ? (
                        <Textarea
                          value={terrainData.temperament_description ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, temperament_description: e.target.value }))}
                          placeholder="Ex: neuro-arthritique, sanguin-bilieux..."
                          rows={2}
                        />
                      ) : (
                        <div className="text-sm text-charcoal whitespace-pre-line">
                          {terrainData.temperament_description || <span className="italic text-stone">Non renseigné</span>}
                        </div>
                      )}
                    </div>

                    {/* Diathèse de Ménétrier */}
                    <div className="space-y-1">
                      <span className="text-xs text-warmgray">Diathèse de Ménétrier</span>
                      {terrainEditing ? (
                        <Select
                          value={terrainData.diathese_menetrier ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, diathese_menetrier: (e.target.value || null) as DiatheseType | null }))}
                        >
                          <option value="">Non renseigné</option>
                          {DIATHESES.map((d) => (
                            <option key={d.value} value={d.value}>{d.label} — {d.description}</option>
                          ))}
                        </Select>
                      ) : (
                        <div className="text-sm">
                          {terrainData.diathese_menetrier ? (
                            <Badge variant="default">{DIATHESE_MAP[terrainData.diathese_menetrier as DiatheseType]?.label}</Badge>
                          ) : (
                            <span className="italic text-stone">Non renseigné</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Diathèse date */}
                    <div className="space-y-1">
                      <span className="text-xs text-warmgray">Date d&apos;évaluation diathèse</span>
                      {terrainEditing ? (
                        <Input
                          type="date"
                          value={terrainData.diathese_date ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, diathese_date: e.target.value }))}
                        />
                      ) : (
                        <div className="text-sm text-charcoal">
                          {terrainData.diathese_date ? formatDate(terrainData.diathese_date) : <span className="italic text-stone">—</span>}
                        </div>
                      )}
                    </div>

                    {/* Notes diathèse */}
                    {(terrainEditing || terrainData.diathese_notes) && (
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-xs text-warmgray">Notes</span>
                        {terrainEditing ? (
                          <Textarea
                            value={terrainData.diathese_notes ?? ''}
                            onChange={(e) => setTerrainData((prev) => ({ ...prev, diathese_notes: e.target.value }))}
                            placeholder="Observations sur la diathèse..."
                            rows={2}
                          />
                        ) : (
                          <div className="text-sm text-charcoal whitespace-pre-line">{terrainData.diathese_notes}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2 — Surcharges humorales */}
                <div className="border border-divider rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-charcoal">Surcharges humorales</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {SURCHARGE_TYPES.map((s) => (
                      <SurchargeGauge
                        key={s.key}
                        label={s.label}
                        level={(terrainData[s.key] as SurchargeLevel) ?? null}
                        editing={terrainEditing}
                        onChange={(level) => setTerrainData((prev) => ({ ...prev, [s.key]: level }))}
                      />
                    ))}
                  </div>
                  {(terrainEditing || terrainData.surcharges_notes) && (
                    <div className="space-y-1">
                      <span className="text-xs text-warmgray">Notes</span>
                      {terrainEditing ? (
                        <Textarea
                          value={terrainData.surcharges_notes ?? ''}
                          onChange={(e) => setTerrainData((prev) => ({ ...prev, surcharges_notes: e.target.value }))}
                          placeholder="Observations sur les surcharges..."
                          rows={2}
                        />
                      ) : (
                        <div className="text-sm text-charcoal whitespace-pre-line">{terrainData.surcharges_notes}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 3 — Bilan des émonctoires */}
                <div className="border border-divider rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-charcoal">Bilan des émonctoires</h3>

                  {/* SVG Diagram */}
                  <div className="flex justify-center">
                    <EmunctoryDiagram
                      statuses={{
                        foie: (terrainData.emunctoire_foie as any) ?? null,
                        intestins: (terrainData.emunctoire_intestins as any) ?? null,
                        reins: (terrainData.emunctoire_reins as any) ?? null,
                        peau: (terrainData.emunctoire_peau as any) ?? null,
                        poumons: (terrainData.emunctoire_poumons as any) ?? null,
                      }}
                      editing={terrainEditing}
                      onStatusChange={(organ, newStatus) => {
                        const fieldMap: Record<string, string> = {
                          foie: 'emunctoire_foie',
                          intestins: 'emunctoire_intestins',
                          reins: 'emunctoire_reins',
                          peau: 'emunctoire_peau',
                          poumons: 'emunctoire_poumons',
                        };
                        setTerrainData((prev) => ({ ...prev, [fieldMap[organ]]: newStatus }));
                      }}
                    />
                  </div>

                  {/* Emunctory cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {EMUNCTORIES.map((em) => {
                      const statusVal = (terrainData as Record<string, any>)[em.fieldStatus] as string | null;
                      const notesVal = (terrainData as Record<string, any>)[em.fieldNotes] as string | null;
                      const statusOptions = em.key === 'peau' ? EMUNCTORY_STATUSES_PEAU : em.key === 'poumons' ? EMUNCTORY_STATUSES_POUMONS : EMUNCTORY_STATUSES;
                      const statusInfo = em.key === 'peau'
                        ? (statusVal ? EMUNCTORY_STATUS_PEAU_MAP[statusVal as keyof typeof EMUNCTORY_STATUS_PEAU_MAP] : null)
                        : em.key === 'poumons'
                        ? (statusVal ? EMUNCTORY_STATUS_POUMONS_MAP[statusVal as keyof typeof EMUNCTORY_STATUS_POUMONS_MAP] : null)
                        : (statusVal ? EMUNCTORY_STATUS_MAP[statusVal as keyof typeof EMUNCTORY_STATUS_MAP] : null);

                      return (
                        <div key={em.key} className="rounded-lg bg-white/60 p-3 border border-divider space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-charcoal">{em.label}</span>
                            {statusInfo ? (
                              <span className={cn('text-xs font-medium', statusInfo.color)}>{statusInfo.label}</span>
                            ) : (
                              <span className="text-xs italic text-stone">Non évalué</span>
                            )}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-cream overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: statusVal ? (statusVal === 'fonctionnel' ? '100%' : statusVal === 'ralenti' || statusVal === 'reactif' || statusVal === 'sous_exploite' ? '66%' : statusVal === 'surcharge' ? '33%' : '10%') : '0%',
                                backgroundColor: getEmunctoryHexColor(statusVal),
                              }}
                            />
                          </div>
                          {terrainEditing && (
                            <>
                              <Select
                                value={statusVal ?? ''}
                                onChange={(e) => setTerrainData((prev) => ({ ...prev, [em.fieldStatus]: e.target.value || null }))}
                              >
                                <option value="">Non évalué</option>
                                {statusOptions.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </Select>
                              <Textarea
                                value={notesVal ?? ''}
                                onChange={(e) => setTerrainData((prev) => ({ ...prev, [em.fieldNotes]: e.target.value }))}
                                placeholder={`Notes ${em.label.toLowerCase()}...`}
                                rows={2}
                              />
                            </>
                          )}
                          {!terrainEditing && notesVal && (
                            <p className="text-xs text-stone whitespace-pre-line">{notesVal}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4 — Iridologie */}
                <div className="border border-divider rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                      <Eye className="h-4 w-4 text-sage" />
                      Iridologie
                    </h3>
                    <Button variant="secondary" onClick={() => setShowIrisUploader(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Importer une photo
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(['right', 'left'] as IrisEye[]).map((eyeSide) => {
                      const eyePhotos = irisPhotos.filter((p) => p.eye === eyeSide);
                      const latestPhoto = eyePhotos[0] ?? null;

                      return (
                        <div key={eyeSide} className="space-y-3">
                          <h4 className="text-xs font-medium text-charcoal">{EYE_LABELS[eyeSide]}</h4>

                          {latestPhoto ? (
                            <div className="space-y-2">
                              <div className="relative rounded-lg border border-divider overflow-hidden bg-cream">
                                <IrisPhotoThumbnail photo={latestPhoto} size="large" />
                                <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setIrisViewerPhoto(latestPhoto)}
                                    className="flex-1 bg-white/90 text-charcoal text-xs font-medium py-1.5 rounded-lg hover:bg-white transition"
                                  >
                                    Voir / Annoter
                                  </button>
                                  {eyePhotos.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setIrisCompareEye(eyeSide)}
                                      className="bg-white/90 text-charcoal text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-white transition"
                                    >
                                      Comparer
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Timeline of previous photos */}
                              {eyePhotos.length > 1 && (
                                <div className="flex gap-1.5 overflow-x-auto pb-1">
                                  {eyePhotos.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setIrisViewerPhoto(p)}
                                      className={cn(
                                        'flex-shrink-0 rounded-md border overflow-hidden',
                                        p.id === latestPhoto.id ? 'border-sage ring-1 ring-sage/30' : 'border-divider'
                                      )}
                                    >
                                      <IrisPhotoThumbnail photo={p} size="small" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <EmptyState
                              icon={<Eye className="h-8 w-8 text-sage" />}
                              title="Aucune photo"
                              description="Importez une photo pour commencer l'analyse iridologique."
                              size="sm"
                              action={
                                <Button
                                  variant="secondary"
                                  onClick={() => setShowIrisUploader(true)}
                                >
                                  Importer
                                </Button>
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Save / Cancel buttons */}
              {terrainEditing && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={handleSaveTerrain}
                    loading={terrainSaving}
                    disabled={terrainSaving}
                  >
                    Enregistrer le bilan
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setTerrainData(consultantState.terrain ?? {});
                      setTerrainEditing(false);
                    }}
                    disabled={terrainSaving}
                  >
                    Annuler
                  </Button>
                </div>
              )}

              {/* Link to Conseillancier */}
              <div className="mt-6 rounded-lg bg-cream/60 border border-divider p-3 flex items-center justify-between">
                <p className="text-xs text-stone">
                  Ce bilan de terrain guide les recommandations du conseillancier.
                </p>
                <button
                  type="button"
                  onClick={() => setTab(T.tabConseillancier as Tab)}
                  className="text-xs text-sage font-medium hover:underline whitespace-nowrap ml-2"
                >
                  Voir le conseillancier →
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Iris Viewer Modal */}
          {irisViewerPhoto && (
            <IrisViewer
              photo={irisViewerPhoto}
              onSave={(annotations, notes) => handleIrisSaveAnnotations(irisViewerPhoto, annotations, notes)}
              onClose={() => setIrisViewerPhoto(null)}
            />
          )}

          {/* Iris Upload Modal */}
          {showIrisUploader && (
            <Modal
              isOpen={showIrisUploader}
              onClose={() => setShowIrisUploader(false)}
              title="Importer une photo d'iris"
              size="md"
            >
              <IrisUploader
                consultantId={consultant.id}
                practitionerId={consultantState.practitioner_id}
                onUploadComplete={handleIrisUploadComplete}
              />
            </Modal>
          )}

          {/* Iris Comparison Modal */}
          {irisCompareEye && (
            <Modal
              isOpen={!!irisCompareEye}
              onClose={() => setIrisCompareEye(null)}
              title={`Comparaison — ${EYE_LABELS[irisCompareEye]}`}
              size="xl"
            >
              <IrisComparison
                photos={irisPhotos.filter((p) => p.eye === irisCompareEye)}
                eye={irisCompareEye}
              />
            </Modal>
          )}
        </div>
      )}

      {tab === T.tabBagueConnectee && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Bague connectée</h2>
              {isPremium ? <Badge variant="active">Actif</Badge> : <Badge variant="attention">Non activé</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {!isPremium ? (
              <div className="relative overflow-hidden rounded-lg border border-dashed border-sage/20 bg-sage-light/50 p-6 text-sm text-charcoal">
                <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sage shadow-soft">
                  Premium
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-charcoal">
                    <p className="text-sm font-semibold">Fonctionnalité Bague connectée verrouillée</p>
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
                      onClick={() => router.push('/bague-connectee/en-savoir-plus')}
                    >
                      En savoir plus
                    </Button>
                  </div>
                </div>
              </div>
            ) : wearableSummaries.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="Aucune donnée bague connectée disponible"
                description="Les donnees s'afficheront des la premiere synchronisation."
              />
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-stone">
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
                    title="Aucun insight bague connectée disponible"
                    description="Les suggestions apparaitront apres analyse."
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Journal' && (
        <Card className={cn(journalEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : '')}>
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
              <div className="rounded-lg bg-white/60 p-5 border border-divider">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-charcoal">Dernière entrée</p>
                  <span className="text-xs text-stone">
                    {journalForm.date ? formatDate(journalForm.date) : '—'}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone">Humeur</p>
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
                    <p className="text-xs uppercase tracking-wide text-stone">Énergie</p>
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
                  <p className="text-xs uppercase tracking-wide text-stone">Notes du consultant</p>
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
                    <div key={item.key} className="flex items-center justify-between rounded-sm bg-cream/80 px-3 py-2">
                      <span className="text-xs text-stone">{item.label}</span>
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
                        <span className="text-xs font-medium text-charcoal">
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
                <p className="text-xs uppercase tracking-wide text-stone">Historique</p>
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
                      <div key={entry.id} className="rounded-lg bg-white/60 p-4 border border-divider">
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

      {tab === T.tabNotesSeance && (
        <Card className={cn(noteEditing ? 'ring-2 ring-sage/20 bg-sage-light/50' : '')}>
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
            <div className="flex items-start gap-3 rounded-lg bg-white/60 p-4 text-sm text-charcoal border border-divider">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-light flex-shrink-0">
                <svg className="w-4 h-4 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">Notes privees</p>
                <p className="mt-1 text-xs text-stone">
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
              <div className="rounded-lg bg-white/60 p-4 text-sm border border-divider whitespace-pre-line">
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

      {tab === T.tabConseillancier && (
        <div className="space-y-4">
          {/* Terrain summary banner */}
          {consultantState.terrain && (consultantState.terrain.constitution || consultantState.terrain.diathese_menetrier || consultantState.terrain.force_vitale) && (
            <div className="bg-sage/5 border border-sage/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <Leaf className="h-3.5 w-3.5 text-sage" />
                  Terrain du consultant
                </h3>
                <button
                  type="button"
                  onClick={() => setTab(T.tabBilanTerrain as Tab)}
                  className="text-xs text-sage font-medium hover:underline"
                >
                  Voir le bilan complet →
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {consultantState.terrain.constitution && (
                  <span className={cn('inline-flex items-center rounded-2xl px-2.5 py-0.5 text-[11px] font-medium border', CONSTITUTION_MAP[consultantState.terrain.constitution]?.color)}>
                    {CONSTITUTION_MAP[consultantState.terrain.constitution]?.label}
                  </span>
                )}
                {consultantState.terrain.diathese_menetrier && (
                  <Badge variant="default">
                    {DIATHESE_MAP[consultantState.terrain.diathese_menetrier]?.label}
                  </Badge>
                )}
                {consultantState.terrain.force_vitale && (
                  <span className={cn('inline-flex items-center rounded-2xl px-2.5 py-0.5 text-[11px] font-medium', VITALITY_LEVEL_MAP[consultantState.terrain.force_vitale]?.color)}>
                    FV: {VITALITY_LEVEL_MAP[consultantState.terrain.force_vitale]?.label}
                  </span>
                )}
                {/* Critical emunctories */}
                {EMUNCTORIES.filter((em) => {
                  const val = (consultantState.terrain as Record<string, any>)?.[em.fieldStatus];
                  return val === 'surcharge' || val === 'bloque';
                }).map((em) => {
                  const val = (consultantState.terrain as Record<string, any>)?.[em.fieldStatus];
                  return (
                    <Badge key={em.key} variant={val === 'bloque' ? 'urgent' : 'warning'}>
                      {em.label}: {val === 'bloque' ? 'Bloqué' : 'Surchargé'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {medicalAlerts.length > 0 && (
            <MedicalAlertBanner alerts={medicalAlerts} />
          )}
          <AIStatusBar
            aiGenerated={activePlan?.ai_generated === true}
            quotaUsed={aiQuotaUsed}
            quotaMax={aiQuotaMax}
          />
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Versions du {T.conseillancierLower}</h2>
                  <p className="text-xs text-stone">
                    {T.descConseillancier}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GenerateButton
                    consultantId={consultant.id}
                    planId={canEditPlan ? activePlan?.id : null}
                    onGenerated={handleAIGenerated}
                    onError={handleAIError}
                    onMedicalAlerts={setMedicalAlerts}
                    disabled={false}
                  />
                  <Button
                    variant="primary"
                    onClick={() => handleCreatePlan(activePlan)}
                    loading={planCreating}
                  >
                    {T.conseillancierCreer}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <EmptyState
                  icon="documents"
                  title={T.conseillancierAucun}
                  description="Créez votre premier conseillancier en quelques minutes. Le consultant le recevra directement dans son app."
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
                          'text-left rounded-lg border border-divider bg-white/60 p-4 transition',
                          isActive ? 'border-sage/40 ring-2 ring-sage/20' : 'hover:border-sage/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-charcoal">
                              Version v{planItem.version}
                            </p>
                            <p className="text-xs text-stone">
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

          {activePlan && canEditPlan ? (
            <div className="flex items-center gap-3">
              <TemplateSelector
                onApplyTemplate={(sections) => {
                  setPlanForm((prev) => {
                    const updated = { ...prev };
                    for (const [key, value] of Object.entries(sections)) {
                      if (key in updated) {
                        (updated as Record<string, string>)[key] = value;
                      }
                    }
                    return updated;
                  });
                }}
              />
            </div>
          ) : null}

          {activePlan ? (
            <Card className={cn(canEditPlan ? 'ring-2 ring-sage/20 bg-sage-light/50' : '')}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {T.conseillancier} v{activePlan.version}
                    </h2>
                    <p className="text-xs text-stone">
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
                        onClick={handleSharePlanClick}
                        loading={planSharing}
                        disabled={planSharing || planSaving || isPlanDirty}
                      >
                        {T.partagerConsultant}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={handleDownloadPdf}
                      loading={pdfDownloading}
                      disabled={pdfDownloading}
                    >
                      {T.conseillancierExporter}
                    </Button>
                  </div>
                </div>
                {canEditPlan ? (
                  <EditBanner label="Complétez le conseillancier avant de le partager." />
                ) : null}
                {canEditPlan && contraindicationAlerts.length > 0 && (
                  <div className="mt-3">
                    <ContraindicationBanner
                      alerts={contraindicationAlerts}
                      onAcknowledge={acknowledgeContraindication}
                      criticalCount={contraindicationCriticalCount}
                      warningCount={contraindicationWarningCount}
                      infoCount={contraindicationInfoCount}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {CONSEILLANCIER_SECTIONS.map((section) => {
                  // In read-only mode, skip sections with no content
                  if (!canEditPlan && !sectionHasContent(section, planForm)) return null;
                  return (
                    <div key={section.id} className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-charcoal">
                          {section.icon ? `${section.icon} ` : ''}{section.title}
                          {section.optional ? (
                            <span className="ml-2 text-xs font-normal text-stone">(optionnel)</span>
                          ) : null}
                        </h3>
                        {section.description ? (
                          <p className="text-xs text-stone">{section.description}</p>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {section.fields.map((field) => {
                          // In read-only mode, skip empty fields
                          if (!canEditPlan && !planForm[field.key]?.trim()) return null;
                          return (
                            <div
                              key={field.key}
                              className="rounded-lg bg-white/60 p-4 border border-divider"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-wide text-stone">{field.label}</p>
                                {canEditPlan && (
                                  <div className="flex items-center gap-1">
                                    <SectionSuggestButton
                                      consultantId={consultant.id}
                                      fieldKey={field.key}
                                      onAccept={(text) =>
                                        setPlanForm((prev) => ({
                                          ...prev,
                                          [field.key]: text,
                                        }))
                                      }
                                    />
                                    <BlockInsertButton
                                      section={section.id as BlockSection}
                                      sectionLabel={`${section.title} — ${field.label}`}
                                      consultationMotif={consultantState.consultation_reason}
                                      onInsert={(content) => {
                                        setPlanForm((prev) => ({
                                          ...prev,
                                          [field.key]: prev[field.key]
                                            ? prev[field.key] + '\n\n' + content
                                            : content,
                                        }));
                                      }}
                                    />
                                    <ResourceInsertButton
                                      consultantId={consultant.id}
                                      consultantPlanId={activePlan?.id}
                                      sectionKey={field.key}
                                      onInsert={(text) => {
                                        setPlanForm((prev) => ({
                                          ...prev,
                                          [field.key]: prev[field.key]
                                            ? prev[field.key] + '\n' + text
                                            : text,
                                        }));
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              {canEditPlan ? (
                                <>
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
                                    rows={field.multiline ? 4 : 2}
                                  />
                                  <div className="mt-1">
                                    <SaveAsBlockButton
                                      selectedText={planForm[field.key]}
                                      section={section.id as BlockSection}
                                    />
                                  </div>
                                </>
                              ) : (
                                <p className="mt-2 text-sm text-charcoal whitespace-pre-line break-words">
                                  {renderAnswer(planForm[field.key])}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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

          {/* Contraindication Validation Modal */}
          <ContraindicationValidationModal
            open={showContraindicationModal}
            onClose={() => setShowContraindicationModal(false)}
            onConfirm={handleSharePlan}
            alerts={contraindicationAlerts}
            loading={planSharing}
          />
        </div>
      )}

      {tab === T.tabSchemas && (
        <>
          <DrawingGallery
            drawings={drawings}
            onCreate={handleCreateDrawing}
            onOpen={handleOpenDrawing}
            onDelete={handleDeleteDrawing}
            onExportPDF={handleExportDrawingPDF}
          />

          <TemplatePicker
            isOpen={showTemplatePicker}
            onClose={() => setShowTemplatePicker(false)}
            onSelect={(t) => {
              setSelectedTemplate(t);
              setActiveDrawing(null);
              setShowTemplatePicker(false);
              setShowDrawingCanvas(true);
            }}
          />

          {showDrawingCanvas && selectedTemplate && (
            <Modal
              isOpen={showDrawingCanvas}
              onClose={() => setShowDrawingCanvas(false)}
              size="full"
              showCloseButton={false}
              className="!max-w-[95vw] !h-[90vh]"
            >
              <div className="-m-5 h-[90vh]">
                <DrawingCanvas
                  templateType={selectedTemplate}
                  initialData={activeDrawing?.excalidraw_data}
                  title={activeDrawing?.title ?? ''}
                  onSave={handleSaveDrawing}
                  onClose={() => setShowDrawingCanvas(false)}
                />
              </div>
            </Modal>
          )}
        </>
      )}

      {tab === T.tabDocuments && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">{T.tabDocuments}</h2>
            <p className="text-xs text-stone">{T.descDocuments}</p>
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
                    className="flex items-center justify-between rounded-xl border border-divider bg-cream/60 p-4"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-charcoal truncate">{result.file_name}</p>
                      {result.description && (
                        <p className="text-xs text-stone mt-1 line-clamp-2">{result.description}</p>
                      )}
                      <p className="text-xs text-stone mt-1">
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
              <div className="space-y-3 rounded-lg bg-white/60 p-4 border border-divider">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[90%] rounded-lg px-4 py-2 text-sm sm:max-w-[78%]',
                      message.sender === 'consultant'
                        ? 'bg-cream text-charcoal'
                        : 'ml-auto bg-sage text-white'
                    )}
                  >
                    <p className="break-words">{message.text || '—'}</p>
                    <p
                      className={cn(
                        'mt-1 text-[11px] opacity-80',
                        message.sender === 'consultant' ? 'text-stone' : 'text-white/80'
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
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMessageResourcePickerOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-terracotta/30 px-2 py-1.5 text-xs font-medium text-terracotta transition-colors hover:border-terracotta/50 hover:bg-terracotta/5"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Fiche
                </button>
                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                  loading={messageLoading}
                >
                  Envoyer
                </Button>
              </div>
              {messageResourcePickerOpen && (
                <ResourcePicker
                  onSelect={async (resource) => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.id) {
                      await assignResourceToConsultant(resource.id, consultant.id, session.user.id);
                    }
                    setMessageText((prev) => prev ? prev + '\n📚 Fiche : ' + resource.title : '📚 Fiche : ' + resource.title);
                    setMessageResourcePickerOpen(false);
                  }}
                  onClose={() => setMessageResourcePickerOpen(false)}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
        </div>{/* end content area */}
      </div>{/* end flex sidebar+content */}

      {appointmentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/30 backdrop-blur-[4px] px-4">
          <div className="w-full max-w-md rounded-xl glass-card p-6">
            <h2 className="text-lg font-semibold text-charcoal">Planifier un rendez-vous</h2>
            <p className="mt-2 text-sm text-stone">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/30 backdrop-blur-[4px] px-4">
          <div className="w-full max-w-md rounded-xl glass-card p-6">
            <h2 className="text-lg font-semibold text-charcoal">Suppression définitive</h2>
            <p className="mt-2 text-sm text-stone">
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
      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Medical History Modal */}
      <Modal
        isOpen={medicalHistoryModal.open}
        onClose={() => setMedicalHistoryModal({ open: false, editingEntry: null })}
        title={medicalHistoryModal.editingEntry ? 'Modifier l\'antécédent' : 'Ajouter un antécédent'}
        size="md"
      >
        <div className="space-y-4">
          <Select label="Catégorie" value={historyForm.category} onChange={(e) => setHistoryForm((prev) => ({ ...prev, category: e.target.value }))}>
            <option value="personal">Personnel</option>
            <option value="family">Familial</option>
            <option value="surgical">Chirurgical</option>
          </Select>
          <Input label="Description" value={historyForm.description} onChange={(e) => setHistoryForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description de l'antécédent" />
          <Input label="Année d'apparition (optionnel)" type="number" value={historyForm.year_onset} onChange={(e) => setHistoryForm((prev) => ({ ...prev, year_onset: e.target.value }))} placeholder="Ex : 2018" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={historyForm.is_active} onChange={(e) => setHistoryForm((prev) => ({ ...prev, is_active: e.target.checked }))} className="rounded border-divider" />
            Actif (non résolu)
          </label>
          <Textarea value={historyForm.notes} onChange={(e) => setHistoryForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes (optionnel)" rows={3} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setMedicalHistoryModal({ open: false, editingEntry: null })}>Annuler</Button>
          <Button variant="primary" loading={medicalSaving} disabled={!historyForm.description.trim()} onClick={async () => {
            setMedicalSaving(true);
            try {
              const payload = {
                consultant_id: consultant.id,
                practitioner_id: consultantState.practitioner_id,
                category: historyForm.category as 'personal' | 'family' | 'surgical',
                description: historyForm.description.trim(),
                year_onset: historyForm.year_onset ? Number(historyForm.year_onset) : null,
                is_active: historyForm.is_active,
                notes: historyForm.notes.trim() || null,
              };
              if (medicalHistoryModal.editingEntry) {
                const updated = await updateMedicalHistoryEntry(medicalHistoryModal.editingEntry.id, {
                  category: payload.category,
                  description: payload.description,
                  year_onset: payload.year_onset,
                  is_active: payload.is_active,
                  notes: payload.notes,
                });
                setMedicalHistory((prev) => prev.map((h) => h.id === updated.id ? updated : h));
              } else {
                const created = await createMedicalHistoryEntry(payload);
                setMedicalHistory((prev) => [created, ...prev]);
              }
              setMedicalHistoryModal({ open: false, editingEntry: null });
              setToast({ title: 'Antécédent enregistré', variant: 'success' });
            } catch (err) {
              setToast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible d\'enregistrer.', variant: 'error' });
            } finally {
              setMedicalSaving(false);
            }
          }}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Allergy Modal */}
      <Modal
        isOpen={allergyModal.open}
        onClose={() => setAllergyModal({ open: false, editingEntry: null })}
        title={allergyModal.editingEntry ? 'Modifier l\'allergie' : 'Ajouter une allergie'}
        size="md"
      >
        <div className="space-y-4">
          <Select label="Type" value={allergyForm.type} onChange={(e) => setAllergyForm((prev) => ({ ...prev, type: e.target.value }))}>
            <option value="allergy">Allergie</option>
            <option value="intolerance">Intolérance</option>
            <option value="sensitivity">Sensibilité</option>
          </Select>
          <Input label="Substance" value={allergyForm.substance} onChange={(e) => setAllergyForm((prev) => ({ ...prev, substance: e.target.value }))} placeholder="Ex : Gluten, Arachides..." />
          <Select label="Sévérité" value={allergyForm.severity} onChange={(e) => setAllergyForm((prev) => ({ ...prev, severity: e.target.value }))}>
            <option value="">— Non renseignée —</option>
            <option value="mild">Légère</option>
            <option value="moderate">Modérée</option>
            <option value="severe">Sévère</option>
          </Select>
          <Input label="Réaction (optionnel)" value={allergyForm.reaction} onChange={(e) => setAllergyForm((prev) => ({ ...prev, reaction: e.target.value }))} placeholder="Description de la réaction" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allergyForm.diagnosed} onChange={(e) => setAllergyForm((prev) => ({ ...prev, diagnosed: e.target.checked }))} className="rounded border-divider" />
            Diagnostiquée par un professionnel de santé
          </label>
          <Textarea value={allergyForm.notes} onChange={(e) => setAllergyForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes (optionnel)" rows={3} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAllergyModal({ open: false, editingEntry: null })}>Annuler</Button>
          <Button variant="primary" loading={medicalSaving} disabled={!allergyForm.substance.trim()} onClick={async () => {
            setMedicalSaving(true);
            try {
              const payload = {
                consultant_id: consultant.id,
                practitioner_id: consultantState.practitioner_id,
                type: allergyForm.type as 'allergy' | 'intolerance' | 'sensitivity',
                substance: allergyForm.substance.trim(),
                severity: (allergyForm.severity || null) as 'mild' | 'moderate' | 'severe' | null,
                reaction: allergyForm.reaction.trim() || null,
                diagnosed: allergyForm.diagnosed,
                notes: allergyForm.notes.trim() || null,
              };
              if (allergyModal.editingEntry) {
                const updated = await updateAllergy(allergyModal.editingEntry.id, {
                  type: payload.type,
                  substance: payload.substance,
                  severity: payload.severity,
                  reaction: payload.reaction,
                  diagnosed: payload.diagnosed,
                  notes: payload.notes,
                });
                setAllergiesStructured((prev) => prev.map((a) => a.id === updated.id ? updated : a));
              } else {
                const created = await createAllergy(payload);
                setAllergiesStructured((prev) => [created, ...prev]);
              }
              setAllergyModal({ open: false, editingEntry: null });
              setToast({ title: 'Allergie enregistrée', variant: 'success' });
            } catch (err) {
              setToast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible d\'enregistrer.', variant: 'error' });
            } finally {
              setMedicalSaving(false);
            }
          }}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Treatment Modal */}
      <Modal
        isOpen={treatmentModal.open}
        onClose={() => setTreatmentModal({ open: false, editingEntry: null })}
        title={treatmentModal.editingEntry ? 'Modifier le traitement' : 'Ajouter un traitement'}
        size="md"
      >
        <div className="space-y-4">
          <Input label="Nom" value={treatmentForm.name} onChange={(e) => setTreatmentForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nom du traitement" />
          <Input label="Posologie (optionnel)" value={treatmentForm.dosage} onChange={(e) => setTreatmentForm((prev) => ({ ...prev, dosage: e.target.value }))} placeholder="Ex : 1 comprimé matin et soir" />
          <Input label="Prescripteur (optionnel)" value={treatmentForm.prescriber} onChange={(e) => setTreatmentForm((prev) => ({ ...prev, prescriber: e.target.value }))} placeholder="Nom du prescripteur" />
          <Input label="Date de début (optionnel)" type="date" value={treatmentForm.start_date} onChange={(e) => setTreatmentForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={treatmentForm.is_active} onChange={(e) => setTreatmentForm((prev) => ({ ...prev, is_active: e.target.checked }))} className="rounded border-divider" />
            En cours
          </label>
          <Textarea value={treatmentForm.notes} onChange={(e) => setTreatmentForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes (optionnel)" rows={3} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setTreatmentModal({ open: false, editingEntry: null })}>Annuler</Button>
          <Button variant="primary" loading={medicalSaving} disabled={!treatmentForm.name.trim()} onClick={async () => {
            setMedicalSaving(true);
            try {
              const payload = {
                consultant_id: consultant.id,
                practitioner_id: consultantState.practitioner_id,
                name: treatmentForm.name.trim(),
                dosage: treatmentForm.dosage.trim() || null,
                prescriber: treatmentForm.prescriber.trim() || null,
                start_date: treatmentForm.start_date || null,
                is_active: treatmentForm.is_active,
                notes: treatmentForm.notes.trim() || null,
              };
              if (treatmentModal.editingEntry) {
                const updated = await updateTreatment(treatmentModal.editingEntry.id, {
                  name: payload.name,
                  dosage: payload.dosage,
                  prescriber: payload.prescriber,
                  start_date: payload.start_date,
                  is_active: payload.is_active,
                  notes: payload.notes,
                });
                setCurrentTreatments((prev) => prev.map((t) => t.id === updated.id ? updated : t));
              } else {
                const created = await createTreatment(payload);
                setCurrentTreatments((prev) => [created, ...prev]);
              }
              setTreatmentModal({ open: false, editingEntry: null });
              setToast({ title: 'Traitement enregistré', variant: 'success' });
            } catch (err) {
              setToast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible d\'enregistrer.', variant: 'error' });
            } finally {
              setMedicalSaving(false);
            }
          }}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Relationship Modal */}
      <Modal
        isOpen={relationshipModal.open}
        onClose={() => setRelationshipModal({ open: false })}
        title="Ajouter un lien familial"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone mb-1">Rechercher un consultant</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
              <input
                type="text"
                className="w-full rounded-[10px] border border-divider bg-white pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-mist transition duration-150 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20"
                placeholder="Tapez un nom..."
                value={consultantSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setConsultantSearch(val);
                  if (searchTimeout) clearTimeout(searchTimeout);
                  if (val.trim().length >= 2) {
                    const timeout = setTimeout(async () => {
                      const results = await searchConsultants(consultantState.practitioner_id, val);
                      setConsultantSearchResults(results.filter((r) => r.id !== consultant.id));
                    }, 300);
                    setSearchTimeout(timeout);
                  } else {
                    setConsultantSearchResults([]);
                  }
                }}
              />
            </div>
            {consultantSearchResults.length > 0 ? (
              <div className="mt-1 rounded-lg border border-divider bg-white shadow-sm max-h-40 overflow-y-auto">
                {consultantSearchResults.map((result) => (
                  <button
                    key={result.id}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-cream transition-colors',
                      relationshipForm.related_consultant_id === result.id ? 'bg-sage-light text-sage-dark font-medium' : 'text-charcoal'
                    )}
                    onClick={() => {
                      setRelationshipForm((prev) => ({ ...prev, related_consultant_id: result.id }));
                      setConsultantSearch(result.name);
                      setConsultantSearchResults([]);
                    }}
                  >
                    {result.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Select label="Type de relation" value={relationshipForm.relationship_type} onChange={(e) => setRelationshipForm((prev) => ({ ...prev, relationship_type: e.target.value }))}>
            <option value="parent">Parent</option>
            <option value="child">Enfant</option>
            <option value="spouse">Conjoint(e)</option>
            <option value="sibling">Frère/Sœur</option>
            <option value="other">Autre</option>
          </Select>
          <Input label="Label personnalisé (optionnel)" value={relationshipForm.label} onChange={(e) => setRelationshipForm((prev) => ({ ...prev, label: e.target.value }))} placeholder='Ex : "mère", "fils aîné"...' />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setRelationshipModal({ open: false })}>Annuler</Button>
          <Button variant="primary" loading={medicalSaving} disabled={!relationshipForm.related_consultant_id} onClick={async () => {
            setMedicalSaving(true);
            try {
              const created = await createRelationship({
                consultant_id: consultant.id,
                related_consultant_id: relationshipForm.related_consultant_id,
                relationship_type: relationshipForm.relationship_type as 'parent' | 'child' | 'spouse' | 'sibling' | 'other',
                label: relationshipForm.label.trim() || null,
              });
              // Re-fetch relationships to get joined data
              const { data: freshRels } = await supabase
                .from('consultant_relationships')
                .select(`*, related_consultant:consultants!consultant_relationships_related_consultant_id_fkey(id, name, first_name, last_name)`)
                .eq('consultant_id', consultant.id)
                .order('created_at', { ascending: false });
              setRelationships((freshRels ?? []) as ConsultantRelationship[]);
              setRelationshipModal({ open: false });
              setToast({ title: 'Lien familial créé', variant: 'success' });
            } catch (err) {
              setToast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible de créer le lien.', variant: 'error' });
            } finally {
              setMedicalSaving(false);
            }
          }}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Delete Modal */}
      {confirmDeleteId ? (
        <Modal
          isOpen={true}
          onClose={() => setConfirmDeleteId(null)}
          title="Confirmer la suppression"
          size="sm"
        >
          <p className="text-sm text-stone">Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.</p>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" loading={medicalSaving} onClick={async () => {
              setMedicalSaving(true);
              try {
                if (confirmDeleteId.type === 'history') {
                  await deleteMedicalHistoryEntry(confirmDeleteId.id);
                  setMedicalHistory((prev) => prev.filter((h) => h.id !== confirmDeleteId.id));
                } else if (confirmDeleteId.type === 'allergy') {
                  await deleteAllergy(confirmDeleteId.id);
                  setAllergiesStructured((prev) => prev.filter((a) => a.id !== confirmDeleteId.id));
                } else if (confirmDeleteId.type === 'treatment') {
                  await deleteTreatment(confirmDeleteId.id);
                  setCurrentTreatments((prev) => prev.filter((t) => t.id !== confirmDeleteId.id));
                } else if (confirmDeleteId.type === 'relationship') {
                  await deleteRelationship(confirmDeleteId.id, consultant.id);
                  setRelationships((prev) => prev.filter((r) => r.id !== confirmDeleteId.id));
                }
                setConfirmDeleteId(null);
                setToast({ title: 'Élément supprimé', variant: 'success' });
              } catch (err) {
                setToast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible de supprimer.', variant: 'error' });
              } finally {
                setMedicalSaving(false);
              }
            }}>
              Supprimer
            </Button>
          </ModalFooter>
        </Modal>
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
