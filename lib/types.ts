// Types pour la base de données AFEIA
// Générés manuellement - correspondent aux tables Supabase

export type Practitioner = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  default_consultation_reason?: string | null;
  /** @deprecated Use booking_slug instead */
  calendly_url?: string | null;
  booking_slug?: string | null;
  booking_enabled?: boolean;
  booking_address?: string | null;
  booking_phone?: string | null;
  created_at: string;
  updated_at: string;
};

export type Consultant = {
  id: string;
  practitioner_id: string;
  name: string;
  email?: string | null;
  age?: number | null;
  city?: string | null;
  phone?: string | null;
  consultation_reason?: string | null;
  status?: 'standard' | 'premium';
  is_premium: boolean;
  activated?: boolean;
  activated_at?: string | null;
  deleted_at?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  profession?: string | null;
  referring_doctor_name?: string | null;
  referring_doctor_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultantInvitation = {
  id: string;
  practitioner_id: string;
  consultant_id?: string | null;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  invitation_code: string;
  code_expires_at: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invited_at: string;
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type OtpCode = {
  id: string;
  email: string;
  code: string;
  type: 'activation' | 'login' | 'reset';
  practitioner_id?: string | null;
  consultant_id?: string | null;
  expires_at: string;
  used: boolean;
  used_at?: string | null;
  created_at: string;
};

export type Anamnese = {
  id: string;
  consultant_id: string;
  motif?: string;
  objectifs?: string;
  alimentation?: string;
  digestion?: string;
  sommeil?: string;
  stress?: string;
  complement?: string;
  allergies?: string;
  created_at: string;
  updated_at: string;
};

// Answers can be flat (legacy: question_key -> value) or nested (new: section_id -> { question_key -> value })
export type AnamnesisAnswersFlat = Record<string, string>;
export type AnamnesisAnswersNested = Record<string, Record<string, string>>;
export type AnamnesisAnswers = AnamnesisAnswersFlat | AnamnesisAnswersNested;

export type ConsultantAnamnesis = {
  id: string;
  consultant_id: string;
  naturopath_id?: string | null;
  answers?: AnamnesisAnswers | null;
  version?: number;
  source?: 'manual' | 'preliminary_questionnaire' | 'mobile_app';
  preliminary_questionnaire_id?: string | null;
  created_at: string;
  updated_at: string;
};

// Preliminary questionnaire submitted publicly
export type PreliminaryQuestionnaire = {
  id: string;
  naturopath_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  responses: Record<string, Record<string, string>>;
  status: 'pending' | 'linked_to_consultant' | 'archived';
  linked_consultant_id?: string | null;
  linked_at?: string | null;
  submitted_from_ip?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
};

// Anamnesis change history
export type AnamnesisHistory = {
  id: string;
  anamnesis_id: string;
  consultant_id: string;
  modified_section: string;
  old_value?: Record<string, string> | null;
  new_value?: Record<string, string> | null;
  full_snapshot?: Record<string, Record<string, string>> | null;
  version: number;
  modified_by_type: 'consultant' | 'practitioner' | 'system';
  modified_by_id?: string | null;
  modified_at: string;
};

// Public practitioner info for questionnaire dropdown
export type PublicPractitioner = {
  id: string;
  full_name: string;
};

export type Consultation = {
  id: string;
  consultant_id: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

// --- Agenda V1 types ---

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
export type LocationType = 'in_person' | 'video' | 'phone' | 'home_visit';
export type AppointmentSource = 'manual' | 'online_booking' | 'google_sync' | 'legacy_migration';

export interface ConsultationType {
  id: string;
  practitioner_id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  color: string;
  buffer_minutes: number;
  is_bookable_online: boolean;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  is_group: boolean;
  max_participants: number;
  price_per_participant: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySchedule {
  id: string;
  practitioner_id: string;
  day_of_week: number; // 0=lundi ... 6=dimanche
  start_time: string;  // "09:00"
  end_time: string;    // "12:30"
  is_active: boolean;
  created_at: string;
}

export interface AvailabilityOverride {
  id: string;
  practitioner_id: string;
  date: string;        // "2025-05-15"
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  reason: string | null;
  created_at: string;
}

export type Appointment = {
  id: string;
  consultant_id: string | null;
  practitioner_id: string;
  consultation_type_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  location_type: LocationType;
  video_link: string | null;
  notes_internal: string | null;
  notes_public: string | null;
  notes?: string | null; // legacy
  cancellation_reason: string | null;
  cancelled_by: 'practitioner' | 'consultant' | null;
  cancelled_at: string | null;
  rescheduled_from_id: string | null;
  source: AppointmentSource;
  booking_name: string | null;
  booking_email: string | null;
  booking_phone: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations (when joined)
  patient?: {
    id: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    is_premium?: boolean;
  };
  consultation_type?: ConsultationType;
};

// --- Group Sessions (Séances Collectives) ---

export type GroupSessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type GroupSessionRegistrationStatus = 'registered' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';
export type RegistrationSource = 'manual' | 'online_booking';

export type GroupSession = {
  id: string;
  practitioner_id: string;
  consultation_type_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location_type: 'in_person' | 'video' | 'home_visit';
  location_details: string | null;
  max_participants: number;
  status: GroupSessionStatus;
  notes_internal: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations (when joined)
  consultation_type?: ConsultationType;
  registrations?: GroupSessionRegistration[];
  registration_count?: number;
};

export type GroupSessionRegistration = {
  id: string;
  group_session_id: string;
  consultant_id: string | null;
  practitioner_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: GroupSessionRegistrationStatus;
  registered_at: string;
  cancelled_at: string | null;
  source: RegistrationSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations (when joined)
  consultant?: {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

export type Plan = {
  id: string;
  consultant_id: string;
  created_at: string;
};

export type PlanVersion = {
  id: string;
  plan_id: string;
  version: number;
  title: string;
  published_at: string;
};

export type PlanSection = {
  id: string;
  plan_version_id: string;
  title: string;
  body?: string;
  sort_order: number;
};

export type ConsultantPlan = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  version: number;
  status: 'draft' | 'shared';
  content: Record<string, string> | null;
  shared_at?: string | null;
  ai_generated?: boolean;
  ai_model?: string | null;
  ai_generation_date?: string | null;
  ai_feedback?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type JournalEntry = {
  id: string;
  consultant_id: string;
  date: string;
  mood?: '🙂' | '😐' | '🙁';
  energy?: 'Bas' | 'Moyen' | 'Élevé';
  text?: string;
  adherence_hydratation: boolean;
  adherence_respiration: boolean;
  adherence_mouvement: boolean;
  adherence_plantes: boolean;
  created_at: string;
};

export type Message = {
  id: string;
  consultant_id: string;
  sender: 'consultant' | 'praticien';
  text: string;
  sent_at: string;
  read_at?: string;
};

export type WearableSummary = {
  id: string;
  consultant_id: string;
  date: string;
  sleep_duration?: number;
  sleep_score?: number;
  hrv_avg?: number;
  activity_level?: number;
  completeness?: number;
  created_at: string;
};

export type WearableInsight = {
  id: string;
  consultant_id: string;
  type?: 'sleep' | 'hrv' | 'activity';
  level?: 'info' | 'attention';
  message?: string;
  suggested_action?: string;
  created_at: string;
};

export type NotificationType =
  | 'general'
  | 'anamnesis_modified'
  | 'new_preliminary_questionnaire'
  | 'questionnaire_linked'
  | 'message'
  | 'appointment';

export type NotificationMetadata = {
  questionnaire_id?: string;
  consultant_name?: string;
  consultant_id?: string;
  modified_sections?: string[];
  version?: number;
  modified_at?: string;
  linked_at?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  submitted_at?: string;
  [key: string]: unknown;
};

export type Notification = {
  id: string;
  practitioner_id: string;
  consultant_id?: string | null;
  type?: NotificationType;
  title: string;
  description?: string;
  level: 'info' | 'attention';
  read: boolean;
  metadata?: NotificationMetadata | null;
  created_at: string;
};

export type PractitionerNote = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  content?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultantAnalysisResult = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  file_name: string;
  file_path: string;
  file_type?: string | null;
  file_size?: number | null;
  description?: string | null;
  analysis_date?: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
};

export type ConsultantWithUnreadCounts = Consultant & {
  unreadMessages: number;
  unreadNotifications: number;
  lastConsultationAt: string | null;
};

// Preliminary questionnaire with linked consultant details
export type PreliminaryQuestionnaireWithConsultant = PreliminaryQuestionnaire & {
  linked_consultant?: Consultant | null;
};

// ============================================
// MEDICAL RECORD TYPES
// ============================================

export type MedicalHistoryEntry = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  category: 'personal' | 'family' | 'surgical';
  description: string;
  year_onset: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AllergyEntry = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  type: 'allergy' | 'intolerance' | 'sensitivity';
  substance: string;
  severity: 'mild' | 'moderate' | 'severe' | null;
  reaction: string | null;
  diagnosed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrentTreatmentEntry = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  name: string;
  dosage: string | null;
  prescriber: string | null;
  start_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultantRelationship = {
  id: string;
  consultant_id: string;
  related_consultant_id: string;
  relationship_type: 'parent' | 'child' | 'spouse' | 'sibling' | 'other';
  label: string | null;
  created_at: string;
  related_consultant?: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
  };
};

// Types enrichis (avec relations)
export type ConsultantWithDetails = Consultant & {
  anamnese?: Anamnese;
  consultant_anamnesis?: ConsultantAnamnesis | null;
  practitioner_note?: PractitionerNote | null;
  consultations?: Consultation[];
  appointments?: Appointment[];
  plan?: Plan & {
    versions?: (PlanVersion & {
      sections?: PlanSection[];
    })[];
  };
  journal_entries?: JournalEntry[];
  messages?: Message[];
  wearable_summaries?: WearableSummary[];
  wearable_insights?: WearableInsight[];
  consultant_plans?: ConsultantPlan[];
  analysis_results?: ConsultantAnalysisResult[];
  drawings?: ConsultantDrawing[];
  medical_history?: MedicalHistoryEntry[];
  allergies_structured?: AllergyEntry[];
  current_treatments?: CurrentTreatmentEntry[];
  relationships?: ConsultantRelationship[];
};

export type ConsultantDrawing = {
  id: string;
  consultant_id: string;
  practitioner_id: string;
  title: string;
  template_type: string;
  excalidraw_data: any;
  snapshot_path: string | null;
  appointment_id: string | null;
  version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================
// AI ASSISTANCE
// ============================================

export type PractitionerAIProfile = {
  id: string;
  practitioner_id: string;
  formation: string | null;
  formation_detail: string | null;
  longueur_preferee: 'concis' | 'detaille' | 'tres_detaille';
  ton: 'professionnel' | 'chaleureux' | 'coach';
  approches: string[];
  plantes_favorites: string | null;
  complements_favoris: string | null;
  exemples_formulations: string | null;
  total_generations: number;
  generations_this_month: number;
  month_reset_date: string;
  created_at: string;
  updated_at: string;
};

export type AIGenerationLog = {
  id: string;
  practitioner_id: string;
  consultant_id: string;
  plan_id: string | null;
  generation_type: 'full' | 'section' | 'regenerate';
  section_name: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  status: 'success' | 'error' | 'filtered';
  error_message: string | null;
  created_at: string;
};

// ============================================
// WAITLIST / ALERTE DESISTEMENT
// ============================================

export type TimeOfDayPreference = 'morning' | 'afternoon' | 'evening' | 'any';

export type WaitlistEntry = {
  id: string;
  practitioner_id: string;
  consultation_type_id: string | null;
  email: string;
  first_name: string;
  phone: string | null;
  preferred_time_of_day: TimeOfDayPreference;
  preferred_days: number[];
  notified_at: string | null;
  notified_for_slot: string | null;
  fulfilled_at: string | null;
  expires_at: string;
  created_at: string;
  // Joined relation
  consultation_type?: { name: string } | null;
};

export type WaitlistInsert = {
  practitioner_id: string;
  consultation_type_id?: string | null;
  email: string;
  first_name: string;
  phone?: string | null;
  preferred_time_of_day: TimeOfDayPreference;
  preferred_days: number[];
};
