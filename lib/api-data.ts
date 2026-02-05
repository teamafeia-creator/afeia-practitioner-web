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
  // Get total patients
  const { count: totalPatients, error: patientsError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (patientsError) {
    console.error('Error fetching patients count:', patientsError);
  }

  // Get premium patients count
  const { count: premiumPatients, error: premiumError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('is_premium', true);

  if (premiumError) {
    console.error('Error fetching premium patients count:', premiumError);
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
    .eq('sender', 'patient')
    .is('read_at', null);

  if (messagesError) {
    console.error('Error fetching unread messages count:', messagesError);
  }

  return {
    totalPatients: totalPatients ?? 0,
    premiumPatients: premiumPatients ?? 0,
    newQuestionnaire: newQuestionnaire ?? 0,
    newCircularData: newCircularData ?? 0,
    unreadMessages: unreadMessages ?? 0
  };
}

export async function getItems() {
  // Get all patients
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    return [];
  }

  const safePatients = patients || [];
  const patientIds = safePatients.map((p) => p.id);
  if (patientIds.length === 0) {
    return [];
  }

  // Get counts for each patient
  const [messagesResult, notificationsResult, consultationsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('patient_id')
      .in('patient_id', patientIds)
      .eq('sender', 'patient')
      .is('read_at', null),
    supabase
      .from('notifications')
      .select('patient_id, type')
      .in('patient_id', patientIds)
      .eq('read', false),
    supabase
      .from('consultations')
      .select('patient_id, date')
      .in('patient_id', patientIds),
    supabase
      .from('appointments')
      .select('patient_id, starts_at, status')
      .in('patient_id', patientIds)
      .eq('status', 'scheduled')
  ]);

  // Build counts per patient
  const unreadMessagesMap = (messagesResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.patient_id] = (acc[row.patient_id] ?? 0) + 1;
    return acc;
  }, {});

  const notificationsMap = (notificationsResult.data ?? []).reduce<Record<string, { questionnaire: boolean; circular: boolean }>>((acc, row) => {
    if (!acc[row.patient_id]) {
      acc[row.patient_id] = { questionnaire: false, circular: false };
    }
    if (row.type === 'questionnaire') acc[row.patient_id].questionnaire = true;
    if (row.type === 'circular') acc[row.patient_id].circular = true;
    return acc;
  }, {});

  const lastConsultationMap = (consultationsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
    const existing = acc[row.patient_id];
    if (!existing || new Date(row.date) > new Date(existing)) {
      acc[row.patient_id] = row.date;
    }
    return acc;
  }, {});

  const nextAppointmentMap = (appointmentsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
    const now = new Date();
    const apptDate = new Date(row.starts_at);
    if (apptDate > now) {
      const existing = acc[row.patient_id];
      if (!existing || apptDate < new Date(existing)) {
        acc[row.patient_id] = row.starts_at;
      }
    }
    return acc;
  }, {});

  return safePatients.map((patient) => ({
    id: patient.id,
    name: patient.name,
    age: patient.age,
    city: patient.city,
    isPremium: patient.is_premium ?? false,
    lastConsultation: lastConsultationMap[patient.id] ?? null,
    nextConsultation: nextAppointmentMap[patient.id] ?? null,
    flags: {
      newQuestionnaire: notificationsMap[patient.id]?.questionnaire ?? false,
      newCircularData: notificationsMap[patient.id]?.circular ?? false,
      unreadMessages: unreadMessagesMap[patient.id] ?? 0
    }
  }));
}

export async function getItemById(id: string) {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !patient) {
    console.error('Error fetching patient by id:', error);
    return null;
  }

  // Get unread messages count
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', id)
    .eq('sender', 'patient')
    .is('read_at', null);

  // Get notification flags
  const { data: notifications } = await supabase
    .from('notifications')
    .select('type')
    .eq('patient_id', id)
    .eq('read', false);

  const hasNewQuestionnaire = notifications?.some((n) => n.type === 'questionnaire') ?? false;
  const hasNewCircularData = notifications?.some((n) => n.type === 'circular') ?? false;

  // Get last consultation
  const { data: lastConsult } = await supabase
    .from('consultations')
    .select('date')
    .eq('patient_id', id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // Get next appointment
  const { data: nextAppt } = await supabase
    .from('appointments')
    .select('starts_at')
    .eq('patient_id', id)
    .eq('status', 'scheduled')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .single();

  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    city: patient.city,
    isPremium: patient.is_premium ?? false,
    lastConsultation: lastConsult?.date ?? null,
    nextConsultation: nextAppt?.starts_at ?? null,
    flags: {
      newQuestionnaire: hasNewQuestionnaire,
      newCircularData: hasNewCircularData,
      unreadMessages: unreadMessages ?? 0
    }
  };
}
