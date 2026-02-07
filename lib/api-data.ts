import { supabase } from '@/lib/supabase';

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: 'praticien' | 'admin';
  password: string;
};

const apiUsers: ApiUser[] = [
  {
    id: 'u_001',
    email: 'demo@afeia.app',
    name: 'Demo Practitioner',
    role: 'praticien',
    password: 'demo1234'
  }
];

export function findUserByEmailPassword(email: string, password: string): Omit<ApiUser, 'password'> | null {
  const user = apiUsers.find((entry) => entry.email === email && entry.password === password);
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function findUserById(id: string): Omit<ApiUser, 'password'> | null {
  const user = apiUsers.find((entry) => entry.id === id);
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function getSummary() {
  // Get total consultants
  const { count: totalConsultants, error: consultantsError } = await supabase
    .from('consultants')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (consultantsError) {
    console.error('Error fetching consultants count:', consultantsError);
  }

  // Get premium consultants count
  const { count: premiumConsultants, error: premiumError } = await supabase
    .from('consultants')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('is_premium', true);

  if (premiumError) {
    console.error('Error fetching premium consultants count:', premiumError);
  }

  // Get unread questionnaires (notifications with type 'questionnaire' and read = false)
  const { count: newQuestionnaire, error: questionnaireError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'questionnaire')
    .eq('read', false);

  if (questionnaireError) {
    console.error('Error fetching questionnaire notifications:', questionnaireError);
  }

  // Get new circular data notifications
  const { count: newCircularData, error: circularError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'circular')
    .eq('read', false);

  if (circularError) {
    console.error('Error fetching circular notifications:', circularError);
  }

  // Get unread messages count
  const { count: unreadMessages, error: messagesError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender', 'consultant')
    .is('read_at', null);

  if (messagesError) {
    console.error('Error fetching unread messages count:', messagesError);
  }

  return {
    totalConsultants: totalConsultants ?? 0,
    premiumConsultants: premiumConsultants ?? 0,
    newQuestionnaire: newQuestionnaire ?? 0,
    newCircularData: newCircularData ?? 0,
    unreadMessages: unreadMessages ?? 0
  };
}

export async function getItems() {
  // Get all consultants
  const { data: consultants, error: consultantsError } = await supabase
    .from('consultants')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (consultantsError) {
    console.error('Error fetching consultants:', consultantsError);
    return [];
  }

  const safeConsultants = consultants || [];
  const consultantIds = safeConsultants.map((p) => p.id);
  if (consultantIds.length === 0) {
    return [];
  }

  // Get counts for each consultant
  const [messagesResult, notificationsResult, consultationsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('consultant_id')
      .in('consultant_id', consultantIds)
      .eq('sender', 'consultant')
      .is('read_at', null),
    supabase
      .from('notifications')
      .select('consultant_id, type')
      .in('consultant_id', consultantIds)
      .eq('read', false),
    supabase
      .from('consultations')
      .select('consultant_id, date')
      .in('consultant_id', consultantIds),
    supabase
      .from('appointments')
      .select('consultant_id, starts_at, status')
      .in('consultant_id', consultantIds)
      .eq('status', 'scheduled')
  ]);

  // Build counts per consultant
  const unreadMessagesMap = (messagesResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.consultant_id] = (acc[row.consultant_id] ?? 0) + 1;
    return acc;
  }, {});

  const notificationsMap = (notificationsResult.data ?? []).reduce<Record<string, { questionnaire: boolean; circular: boolean }>>((acc, row) => {
    if (!acc[row.consultant_id]) {
      acc[row.consultant_id] = { questionnaire: false, circular: false };
    }
    if (row.type === 'questionnaire') acc[row.consultant_id].questionnaire = true;
    if (row.type === 'circular') acc[row.consultant_id].circular = true;
    return acc;
  }, {});

  const lastConsultationMap = (consultationsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
    const existing = acc[row.consultant_id];
    if (!existing || new Date(row.date) > new Date(existing)) {
      acc[row.consultant_id] = row.date;
    }
    return acc;
  }, {});

  const nextAppointmentMap = (appointmentsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
    const now = new Date();
    const apptDate = new Date(row.starts_at);
    if (apptDate > now) {
      const existing = acc[row.consultant_id];
      if (!existing || apptDate < new Date(existing)) {
        acc[row.consultant_id] = row.starts_at;
      }
    }
    return acc;
  }, {});

  return safeConsultants.map((consultant) => ({
    id: consultant.id,
    name: consultant.name,
    age: consultant.age,
    city: consultant.city,
    isPremium: consultant.is_premium ?? false,
    lastConsultation: lastConsultationMap[consultant.id] ?? null,
    nextConsultation: nextAppointmentMap[consultant.id] ?? null,
    flags: {
      newQuestionnaire: notificationsMap[consultant.id]?.questionnaire ?? false,
      newCircularData: notificationsMap[consultant.id]?.circular ?? false,
      unreadMessages: unreadMessagesMap[consultant.id] ?? 0
    }
  }));
}

export async function getItemById(id: string) {
  const { data: consultant, error } = await supabase
    .from('consultants')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !consultant) {
    console.error('Error fetching consultant by id:', error);
    return null;
  }

  // Get unread messages count
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('consultant_id', id)
    .eq('sender', 'consultant')
    .is('read_at', null);

  // Get notification flags
  const { data: notifications } = await supabase
    .from('notifications')
    .select('type')
    .eq('consultant_id', id)
    .eq('read', false);

  const hasNewQuestionnaire = notifications?.some((n) => n.type === 'questionnaire') ?? false;
  const hasNewCircularData = notifications?.some((n) => n.type === 'circular') ?? false;

  // Get last consultation
  const { data: lastConsult } = await supabase
    .from('consultations')
    .select('date')
    .eq('consultant_id', id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // Get next appointment
  const { data: nextAppt } = await supabase
    .from('appointments')
    .select('starts_at')
    .eq('consultant_id', id)
    .eq('status', 'scheduled')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .single();

  return {
    id: consultant.id,
    name: consultant.name,
    age: consultant.age,
    city: consultant.city,
    isPremium: consultant.is_premium ?? false,
    lastConsultation: lastConsult?.date ?? null,
    nextConsultation: nextAppt?.starts_at ?? null,
    flags: {
      newQuestionnaire: hasNewQuestionnaire,
      newCircularData: hasNewCircularData,
      unreadMessages: unreadMessages ?? 0
    }
  };
}
