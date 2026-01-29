import { supabase } from '../lib/supabase';

export type PatientOverview = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  activated: boolean;
  activatedAt: string | null;
  unreadMessages: number;
};

export type PatientMessage = {
  id: string;
  text: string;
  sentAt: string;
  senderRole: 'patient' | 'practitioner';
};

export type PatientAppointment = {
  id: string;
  startAt: string;
  status: string;
};

export type PatientAnamnese = {
  status: 'PENDING' | 'COMPLETED' | null;
  answers: Record<string, string> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PatientWearableSummary = {
  date: string;
  sleepDuration: number | null;
  sleepScore: number | null;
  hrvAvg: number | null;
  activityLevel: number | null;
  completeness: number | null;
};

export type PatientWearableInsight = {
  id: string;
  type: string | null;
  level: string | null;
  message: string | null;
  suggestedAction: string | null;
  createdAt: string | null;
};

export type PatientDetail = {
  id: string;
  name: string;
  email: string | null;
  age: number | null;
  city: string | null;
  activated: boolean;
  activatedAt: string | null;
  createdAt: string | null;
  messages: PatientMessage[];
};

type PatientRow = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  email?: string | null;
  activated?: boolean | null;
  activated_at?: string | null;
  created_at?: string | null;
};

type AppointmentRow = {
  patient_id: string;
  starts_at: string;
  status: 'scheduled' | 'done' | 'cancelled' | 'completed';
};

type MessageRow = {
  patient_id: string;
};

type AnamneseRow = {
  patient_id: string;
  status: 'PENDING' | 'COMPLETED';
};

type AnamneseDetailRow = {
  status: 'PENDING' | 'COMPLETED' | null;
  answers: Record<string, string> | null;
  created_at: string | null;
  updated_at: string | null;
};

type AppointmentDetailRow = {
  id: string;
  starts_at: string;
  status: string | null;
};

type MessageDetailRow = {
  id: string;
  body?: string | null;
  text?: string | null;
  sender_role?: string | null;
  sender?: string | null;
  created_at?: string | null;
  sent_at?: string | null;
  updated_at?: string | null;
};

type WearableSummaryRow = {
  date: string;
  sleep_duration?: number | null;
  sleep_score?: number | null;
  hrv_avg?: number | null;
  activity_level?: number | null;
  completeness?: number | null;
};

type WearableInsightRow = {
  id: string;
  type?: string | null;
  level?: string | null;
  message?: string | null;
  suggested_action?: string | null;
  created_at?: string | null;
};

export async function fetchPatientsOverview(): Promise<PatientOverview[]> {
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, name, age, city, activated, activated_at')
    .order('name');

  if (error || !patients) {
    console.error('Error fetching patients overview:', error);
    return [];
  }

  const patientIds = patients.map((patient) => patient.id);
  if (patientIds.length === 0) {
    return [];
  }

  // Fetch unread messages count
  const messagesResult = await supabase
    .from('messages')
    .select('patient_id')
    .in('patient_id', patientIds)
    .eq('sender_type', 'patient')
    .eq('read', false);

  if (messagesResult.error) {
    console.error('Error fetching messages:', messagesResult.error);
  }

  const messages = (messagesResult.data ?? []) as MessageRow[];

  const unreadMessagesMap = messages.reduce<Record<string, number>>((acc, message) => {
    acc[message.patient_id] = (acc[message.patient_id] ?? 0) + 1;
    return acc;
  }, {});

  return (patients as PatientRow[]).map((patient) => ({
    id: patient.id,
    name: patient.name,
    age: patient.age,
    city: patient.city,
    activated: patient.activated ?? false,
    activatedAt: patient.activated_at ?? null,
    unreadMessages: unreadMessagesMap[patient.id] ?? 0
  }));
}

type CreatePatientInput = {
  name: string;
  email?: string;
  age?: number | null;
  city?: string;
};

export async function createPatientRecord(input: CreatePatientInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Veuillez vous reconnecter pour créer un patient.');
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({
      practitioner_id: userData.user.id,
      name: input.name,
      email: input.email ?? null,
      age: input.age ?? null,
      city: input.city ?? null,
      activated: false
    })
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code === '42501') {
      throw new Error('Accès refusé: vous ne pouvez pas créer ce patient.');
    }
    throw new Error(error?.message ?? 'Impossible de créer le patient.');
  }

  return { patientId: data.id, practitionerId: userData.user.id };
}

function normalizeSenderRole(value?: string | null): PatientMessage['senderRole'] {
  if (value === 'patient' || value === 'practitioner') return value;
  if (value === 'praticien') return 'practitioner';
  return 'patient';
}

export async function fetchPatientDetail(patientId: string): Promise<PatientDetail | null> {
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name, email, age, city, activated, activated_at, created_at')
    .eq('id', patientId)
    .single();

  if (patientError || !patient) {
    console.error('Error fetching patient detail:', patientError);
    return null;
  }

  // Fetch messages for this patient
  const messagesResult = await supabase
    .from('messages')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (messagesResult.error) {
    console.error('Error fetching messages detail:', messagesResult.error);
  }

  const patientRow = patient as PatientRow;

  const messages = ((messagesResult.data ?? []) as MessageDetailRow[]).map((item) => ({
    id: item.id,
    text: item.body ?? item.text ?? '',
    sentAt: item.created_at ?? item.sent_at ?? item.updated_at ?? new Date().toISOString(),
    senderRole: normalizeSenderRole(item.sender_role ?? item.sender)
  }));

  return {
    id: patientRow.id,
    name: patientRow.name,
    email: patientRow.email ?? null,
    age: patientRow.age ?? null,
    city: patientRow.city ?? null,
    activated: patientRow.activated ?? false,
    activatedAt: patientRow.activated_at ?? null,
    createdAt: patientRow.created_at ?? null,
    messages
  };
}
