// Types pour la base de données AFEIA
// Générés manuellement - correspondent aux tables Supabase

export type Practitioner = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  practitioner_id: string;
  name: string;
  email?: string;
  age?: number;
  city?: string;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
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

export type Consultation = {
  id: string;
  patient_id: string;
  date: string;
  notes?: string;
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

export type Notification = {
  id: string;
  practitioner_id: string;
  patient_id: string;
  title: string;
  description?: string;
  level: 'info' | 'attention';
  read: boolean;
  created_at: string;
};

// Types enrichis (avec relations)
export type PatientWithDetails = Patient & {
  anamnese?: Anamnese;
  consultations?: Consultation[];
  plan?: Plan & {
    versions?: (PlanVersion & {
      sections?: PlanSection[];
    })[];
  };
  journal_entries?: JournalEntry[];
  messages?: Message[];
  wearable_summaries?: WearableSummary[];
  wearable_insights?: WearableInsight[];
};
