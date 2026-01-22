import { supabase } from '../lib/supabase';

export type PatientOverview = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  status: 'standard' | 'premium';
  circularEnabled: boolean;
  lastCircularSyncAt: string | null;
  lastConsultationAt: string | null;
  nextAppointmentAt: string | null;
  unreadMessages: number;
  anamneseStatus: 'PENDING' | 'COMPLETED' | null;
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
  status: 'standard' | 'premium';
  isPremium: boolean;
  circularEnabled: boolean;
  circularConnected: boolean;
  lastCircularSyncAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  anamnese: PatientAnamnese;
  appointments: PatientAppointment[];
  messages: PatientMessage[];
  wearableSummaries: PatientWearableSummary[];
  wearableInsights: PatientWearableInsight[];
};

type PatientRow = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  status: 'standard' | 'premium' | null;
  is_premium?: boolean | null;
  circular_enabled: boolean | null;
  circular_connected?: boolean | null;
  last_circular_sync_at: string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AppointmentRow = {
  patient_id: string;
  start_at: string;
  status: 'scheduled' | 'done' | 'cancelled';
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
  start_at: string;
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
    .select('id, name, age, city, status, circular_enabled, last_circular_sync_at')
    .order('name');

  if (error || !patients) {
    console.error('Error fetching patients overview:', error);
    return [];
  }

  const patientIds = patients.map((patient) => patient.id);
  if (patientIds.length === 0) {
    return [];
  }

  const [appointmentsResult, messagesResult, anamneseResult] = await Promise.all([
    supabase
      .from('appointments')
      .select('patient_id, start_at, status')
      .in('patient_id', patientIds),
    supabase
      .from('messages')
      .select('patient_id')
      .in('patient_id', patientIds)
      .eq('sender_role', 'patient')
      .eq('read_by_practitioner', false),
    supabase
      .from('anamnese_instances')
      .select('patient_id, status')
      .in('patient_id', patientIds)
  ]);

  if (appointmentsResult.error) {
    console.error('Error fetching appointments:', appointmentsResult.error);
  }
  if (messagesResult.error) {
    console.error('Error fetching messages:', messagesResult.error);
  }
  if (anamneseResult.error) {
    console.error('Error fetching anamnese instances:', anamneseResult.error);
  }

  const appointments = (appointmentsResult.data ?? []) as AppointmentRow[];
  const messages = (messagesResult.data ?? []) as MessageRow[];
  const anamneses = (anamneseResult.data ?? []) as AnamneseRow[];

  const lastConsultationMap = new Map<string, string>();
  const nextAppointmentMap = new Map<string, string>();
  const now = new Date();

  appointments.forEach((appointment) => {
    const appointmentDate = new Date(appointment.start_at);
    if (appointment.status === 'done') {
      const existing = lastConsultationMap.get(appointment.patient_id);
      if (!existing || appointmentDate > new Date(existing)) {
        lastConsultationMap.set(appointment.patient_id, appointment.start_at);
      }
    }

    if (appointment.status === 'scheduled' && appointmentDate >= now) {
      const existing = nextAppointmentMap.get(appointment.patient_id);
      if (!existing || appointmentDate < new Date(existing)) {
        nextAppointmentMap.set(appointment.patient_id, appointment.start_at);
      }
    }
  });

  const unreadMessagesMap = messages.reduce<Record<string, number>>((acc, message) => {
    acc[message.patient_id] = (acc[message.patient_id] ?? 0) + 1;
    return acc;
  }, {});

  const anamneseMap = anamneses.reduce<Record<string, AnamneseRow['status']>>((acc, item) => {
    acc[item.patient_id] = item.status;
    return acc;
  }, {});

  return (patients as PatientRow[]).map((patient) => ({
    id: patient.id,
    name: patient.name,
    age: patient.age,
    city: patient.city,
    status: patient.status ?? 'standard',
    circularEnabled: patient.circular_enabled ?? false,
    lastCircularSyncAt: patient.last_circular_sync_at,
    lastConsultationAt: lastConsultationMap.get(patient.id) ?? null,
    nextAppointmentAt: nextAppointmentMap.get(patient.id) ?? null,
    unreadMessages: unreadMessagesMap[patient.id] ?? 0,
    anamneseStatus: anamneseMap[patient.id] ?? null
  }));
}

type CreatePatientInput = {
  name: string;
  email?: string;
  age?: number | null;
  city?: string;
  status: 'standard' | 'premium';
  isPremium: boolean;
  circularEnabled: boolean;
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
      status: input.status,
      is_premium: input.isPremium,
      circular_enabled: input.circularEnabled
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
    .select(
      'id, name, email, age, city, status, is_premium, circular_enabled, circular_connected, last_circular_sync_at, created_at, updated_at'
    )
    .eq('id', patientId)
    .single();

  if (patientError || !patient) {
    console.error('Error fetching patient detail:', patientError);
    return null;
  }

  const [anamneseResult, appointmentsResult, messagesResult, summariesResult, insightsResult] =
    await Promise.all([
      supabase
        .from('anamnese_instances')
        .select('status, answers, created_at, updated_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('appointments').select('*').eq('patient_id', patientId),
      supabase.from('messages').select('*').eq('patient_id', patientId).order('created_at', { ascending: true }),
      supabase.from('wearable_summaries').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
      supabase.from('wearable_insights').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
    ]);

  if (anamneseResult.error) {
    console.error('Error fetching anamnese detail:', anamneseResult.error);
  }
  if (appointmentsResult.error) {
    console.error('Error fetching appointments detail:', appointmentsResult.error);
  }
  if (messagesResult.error) {
    console.error('Error fetching messages detail:', messagesResult.error);
  }
  if (summariesResult.error) {
    console.error('Error fetching wearable summaries:', summariesResult.error);
  }
  if (insightsResult.error) {
    console.error('Error fetching wearable insights:', insightsResult.error);
  }

  const patientRow = patient as PatientRow;
  const status = patientRow.status ?? (patientRow.is_premium ? 'premium' : 'standard');
  const isPremium = status === 'premium';

  const anamneseRow = anamneseResult.data as AnamneseDetailRow | null;
  const anamnese: PatientAnamnese = {
    status: anamneseRow?.status ?? null,
    answers: anamneseRow?.answers ?? null,
    createdAt: anamneseRow?.created_at ?? null,
    updatedAt: anamneseRow?.updated_at ?? null
  };

  const appointments = ((appointmentsResult.data ?? []) as AppointmentDetailRow[])
    .filter((item) => item.start_at)
    .map((item) => ({
      id: item.id,
      startAt: item.start_at,
      status: item.status ?? 'scheduled'
    }))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const messages = ((messagesResult.data ?? []) as MessageDetailRow[]).map((item) => ({
    id: item.id,
    text: item.body ?? item.text ?? '',
    sentAt: item.created_at ?? item.sent_at ?? item.updated_at ?? new Date().toISOString(),
    senderRole: normalizeSenderRole(item.sender_role ?? item.sender)
  }));

  const wearableSummaries = ((summariesResult.data ?? []) as WearableSummaryRow[]).map((item) => ({
    date: item.date,
    sleepDuration: item.sleep_duration ?? null,
    sleepScore: item.sleep_score ?? null,
    hrvAvg: item.hrv_avg ?? null,
    activityLevel: item.activity_level ?? null,
    completeness: item.completeness ?? null
  }));

  const wearableInsights = ((insightsResult.data ?? []) as WearableInsightRow[]).map((item) => ({
    id: item.id,
    type: item.type ?? null,
    level: item.level ?? null,
    message: item.message ?? null,
    suggestedAction: item.suggested_action ?? null,
    createdAt: item.created_at ?? null
  }));

  return {
    id: patientRow.id,
    name: patientRow.name,
    email: patientRow.email ?? null,
    age: patientRow.age ?? null,
    city: patientRow.city ?? null,
    status,
    isPremium,
    circularEnabled: patientRow.circular_enabled ?? false,
    circularConnected: patientRow.circular_connected ?? false,
    lastCircularSyncAt: patientRow.last_circular_sync_at ?? null,
    createdAt: patientRow.created_at ?? null,
    updatedAt: patientRow.updated_at ?? null,
    anamnese,
    appointments,
    messages,
    wearableSummaries,
    wearableInsights
  };
}
