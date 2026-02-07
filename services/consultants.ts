import { supabase } from '../lib/supabase';

export type ConsultantOverview = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  activated: boolean;
  activatedAt: string | null;
  unreadMessages: number;
};

export type ConsultantMessage = {
  id: string;
  text: string;
  sentAt: string;
  senderRole: 'consultant' | 'practitioner';
};

export type ConsultantAppointment = {
  id: string;
  startAt: string;
  status: string;
};

export type ConsultantAnamnese = {
  status: 'PENDING' | 'COMPLETED' | null;
  answers: Record<string, string> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ConsultantWearableSummary = {
  date: string;
  sleepDuration: number | null;
  sleepScore: number | null;
  hrvAvg: number | null;
  activityLevel: number | null;
  completeness: number | null;
};

export type ConsultantWearableInsight = {
  id: string;
  type: string | null;
  level: string | null;
  message: string | null;
  suggestedAction: string | null;
  createdAt: string | null;
};

export type ConsultantDetail = {
  id: string;
  name: string;
  email: string | null;
  age: number | null;
  city: string | null;
  activated: boolean;
  activatedAt: string | null;
  createdAt: string | null;
  messages: ConsultantMessage[];
};

type ConsultantRow = {
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
  consultant_id: string;
  starts_at: string;
  status: 'scheduled' | 'done' | 'cancelled' | 'completed';
};

type MessageRow = {
  consultant_id: string;
};

type AnamneseRow = {
  consultant_id: string;
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

export async function fetchConsultantsOverview(): Promise<ConsultantOverview[]> {
  const { data: consultants, error } = await supabase
    .from('consultants')
    .select('id, name, age, city, activated, activated_at')
    .order('name');

  if (error || !consultants) {
    console.error('Error fetching consultants overview:', error);
    return [];
  }

  const consultantIds = consultants.map((consultant) => consultant.id);
  if (consultantIds.length === 0) {
    return [];
  }

  // Fetch unread messages count
  const messagesResult = await supabase
    .from('messages')
    .select('consultant_id')
    .in('consultant_id', consultantIds)
    .eq('sender_type', 'consultant')
    .eq('read', false);

  if (messagesResult.error) {
    console.error('Error fetching messages:', messagesResult.error);
  }

  const messages = (messagesResult.data ?? []) as MessageRow[];

  const unreadMessagesMap = messages.reduce<Record<string, number>>((acc, message) => {
    acc[message.consultant_id] = (acc[message.consultant_id] ?? 0) + 1;
    return acc;
  }, {});

  return (consultants as ConsultantRow[]).map((consultant) => ({
    id: consultant.id,
    name: consultant.name,
    age: consultant.age,
    city: consultant.city,
    activated: consultant.activated ?? false,
    activatedAt: consultant.activated_at ?? null,
    unreadMessages: unreadMessagesMap[consultant.id] ?? 0
  }));
}

type CreateConsultantInput = {
  name: string;
  email?: string;
  age?: number | null;
  city?: string;
};

export async function createConsultantRecord(input: CreateConsultantInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Veuillez vous reconnecter pour créer un consultant.');
  }

  const { data, error } = await supabase
    .from('consultants')
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
      throw new Error('Accès refusé: vous ne pouvez pas créer ce consultant.');
    }
    throw new Error(error?.message ?? 'Impossible de créer le consultant.');
  }

  return { consultantId: data.id, practitionerId: userData.user.id };
}

function normalizeSenderRole(value?: string | null): ConsultantMessage['senderRole'] {
  if (value === 'consultant' || value === 'practitioner') return value;
  if (value === 'praticien') return 'practitioner';
  return 'consultant';
}

export async function fetchConsultantDetail(consultantId: string): Promise<ConsultantDetail | null> {
  const { data: consultant, error: consultantError } = await supabase
    .from('consultants')
    .select('id, name, email, age, city, activated, activated_at, created_at')
    .eq('id', consultantId)
    .single();

  if (consultantError || !consultant) {
    console.error('Error fetching consultant detail:', consultantError);
    return null;
  }

  // Fetch messages for this consultant
  const messagesResult = await supabase
    .from('messages')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: true });

  if (messagesResult.error) {
    console.error('Error fetching messages detail:', messagesResult.error);
  }

  const consultantRow = consultant as ConsultantRow;

  const messages = ((messagesResult.data ?? []) as MessageDetailRow[]).map((item) => ({
    id: item.id,
    text: item.body ?? item.text ?? '',
    sentAt: item.created_at ?? item.sent_at ?? item.updated_at ?? new Date().toISOString(),
    senderRole: normalizeSenderRole(item.sender_role ?? item.sender)
  }));

  return {
    id: consultantRow.id,
    name: consultantRow.name,
    email: consultantRow.email ?? null,
    age: consultantRow.age ?? null,
    city: consultantRow.city ?? null,
    activated: consultantRow.activated ?? false,
    activatedAt: consultantRow.activated_at ?? null,
    createdAt: consultantRow.created_at ?? null,
    messages
  };
}
