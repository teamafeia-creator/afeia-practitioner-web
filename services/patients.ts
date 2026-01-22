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

type PatientRow = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  status: 'standard' | 'premium' | null;
  circular_enabled: boolean | null;
  last_circular_sync_at: string | null;
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
      circular_enabled: input.circularEnabled
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Impossible de créer le patient.');
  }

  return { patientId: data.id, practitionerId: userData.user.id };
}
