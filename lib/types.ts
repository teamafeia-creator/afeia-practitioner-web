// Types pour la base de données AFEIA
// Générés manuellement - correspondent aux tables Supabase

export type Practitioner = {
  id: string;
  email: string;
  full_name: string;
  default_consultation_reason?: string | null;
  calendly_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type Patient = {
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
  created_at: string;
  updated_at: string;
};

export type PatientInvitation = {
  id: string;
  practitioner_id: string;
  patient_id?: string | null;
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
  patient_id?: string | null;
  expires_at: string;
  used: boolean;
  used_at?: string | null;
  created_at: string;
};

export type Anamnese = {
  id: string;
  patient_id: string;
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

export type PatientAnamnesis = {
  id: string;
  patient_id: string;
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
  status: 'pending' | 'linked_to_patient' | 'archived';
  linked_patient_id?: string | null;
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
  patient_id: string;
  modified_section: string;
  old_value?: Record<string, string> | null;
  new_value?: Record<string, string> | null;
  full_snapshot?: Record<string, Record<string, string>> | null;
  version: number;
  modified_by_type: 'patient' | 'practitioner' | 'system';
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
  patient_id: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  patient_id: string;
  practitioner_id: string;
  starts_at: string;
  ends_at?: string | null;
  status: 'scheduled' | 'cancelled' | 'completed';
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  patient_id: string;
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

export type PatientPlan = {
  id: string;
  patient_id: string;
  practitioner_id: string;
  version: number;
  status: 'draft' | 'shared';
  content: Record<string, string> | null;
  shared_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type JournalEntry = {
  id: string;
  patient_id: string;
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
  patient_id: string;
  sender: 'patient' | 'praticien';
  text: string;
  sent_at: string;
  read_at?: string;
};

export type WearableSummary = {
  id: string;
  patient_id: string;
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
  patient_id: string;
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
  patient_name?: string;
  patient_id?: string;
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
  patient_id?: string | null;
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
  patient_id: string;
  practitioner_id: string;
  content?: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientAnalysisResult = {
  id: string;
  patient_id: string;
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

export type PatientWithUnreadCounts = Patient & {
  unreadMessages: number;
  unreadNotifications: number;
  lastConsultationAt: string | null;
};

// Preliminary questionnaire with linked patient details
export type PreliminaryQuestionnaireWithPatient = PreliminaryQuestionnaire & {
  linked_patient?: Patient | null;
};

// Types enrichis (avec relations)
export type PatientWithDetails = Patient & {
  anamnese?: Anamnese;
  patient_anamnesis?: PatientAnamnesis | null;
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
  patient_plans?: PatientPlan[];
  analysis_results?: PatientAnalysisResult[];
};
