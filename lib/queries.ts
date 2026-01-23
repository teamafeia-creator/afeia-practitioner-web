import { supabase } from './supabase';
import type { 
  Patient, 
  Anamnese, 
  Consultation, 
  Plan, 
  PlanVersion, 
  PlanSection,
  JournalEntry, 
  Message, 
  WearableSummary, 
  WearableInsight,
  Notification,
  PatientWithDetails,
  PatientWithUnreadCounts
} from './types';

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function describeSupabaseError(error: SupabaseErrorLike | null | undefined) {
  if (!error) return 'Erreur inconnue.';
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  const code = error.code ? `code: ${error.code}` : null;
  return [...parts, code].filter(Boolean).join(' | ');
}

// ============================================
// PATIENTS
// ============================================

export async function getPatients(): Promise<Patient[]> {
  console.log('[patients] fetch start');
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  
  if (error) {
    console.error('Error fetching patients:', error);
    throw new Error(describeSupabaseError(error));
  }
  console.log('[patients] fetch success', { count: data?.length ?? 0 });
  return data || [];
}

export async function getPatientsWithUnreadCounts(): Promise<PatientWithUnreadCounts[]> {
  console.log('[patients] fetch with counts start');
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching patients with counts:', error);
    throw new Error(describeSupabaseError(error));
  }

  const safePatients = patients || [];
  const patientIds = safePatients.map((patient) => patient.id);
  if (patientIds.length === 0) {
    return [];
  }

  const [messagesResult, notificationsResult, consultationsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('patient_id')
      .in('patient_id', patientIds)
      .eq('sender', 'patient')
      .is('read_at', null),
    supabase
      .from('notifications')
      .select('patient_id')
      .in('patient_id', patientIds)
      .eq('read', false),
    supabase
      .from('consultations')
      .select('patient_id, date')
      .in('patient_id', patientIds)
  ]);

  if (messagesResult.error) {
    console.error('Error fetching unread messages:', messagesResult.error);
  }
  if (notificationsResult.error) {
    console.error('Error fetching unread notifications:', notificationsResult.error);
  }
  if (consultationsResult.error) {
    console.error('Error fetching consultations:', consultationsResult.error);
  }

  console.log('[patients] fetch with counts success', {
    count: safePatients.length,
    unreadMessagesCount: messagesResult.data?.length ?? 0,
    unreadNotificationsCount: notificationsResult.data?.length ?? 0
  });

  const unreadMessagesMap = (messagesResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.patient_id] = (acc[row.patient_id] ?? 0) + 1;
    return acc;
  }, {});

  const unreadNotificationsMap = (notificationsResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.patient_id] = (acc[row.patient_id] ?? 0) + 1;
    return acc;
  }, {});

  const lastConsultationMap = (consultationsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
    const existing = acc[row.patient_id];
    if (!existing || new Date(row.date) > new Date(existing)) {
      acc[row.patient_id] = row.date;
    }
    return acc;
  }, {});

  return safePatients.map((patient) => ({
    ...patient,
    unreadMessages: unreadMessagesMap[patient.id] ?? 0,
    unreadNotifications: unreadNotificationsMap[patient.id] ?? 0,
    lastConsultationAt: lastConsultationMap[patient.id] ?? null
  }));
}

export async function getPatientById(id: string): Promise<PatientWithDetails | null> {
  // Récupérer le patient
  console.log('[patients] fetch detail start', { patientId: id });
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  
  if (patientError || !patient) {
    console.error('Error fetching patient:', patientError);
    return null;
  }
  console.log('[patients] fetch detail success', { patientId: id });

  // Récupérer l'anamnèse
  const { data: anamnese } = await supabase
    .from('anamneses')
    .select('*')
    .eq('patient_id', id)
    .single();

  // Récupérer les consultations
  const { data: consultations } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', id)
    .order('date', { ascending: false });

  // Récupérer le plan avec ses versions et sections
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('patient_id', id)
    .single();

  let planWithVersions = plan;
  if (plan) {
    const { data: versions } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('plan_id', plan.id)
      .order('version', { ascending: false });

    if (versions) {
      const versionsWithSections = await Promise.all(
        versions.map(async (version) => {
          const { data: sections } = await supabase
            .from('plan_sections')
            .select('*')
            .eq('plan_version_id', version.id)
            .order('sort_order');
          return { ...version, sections: sections || [] };
        })
      );
      planWithVersions = { ...plan, versions: versionsWithSections };
    }
  }

  // Récupérer le journal
  const { data: journal_entries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('patient_id', id)
    .order('date', { ascending: false });

  // Récupérer les messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('patient_id', id)
    .order('sent_at', { ascending: true });

  // Récupérer les données wearable
  const { data: wearable_summaries } = await supabase
    .from('wearable_summaries')
    .select('*')
    .eq('patient_id', id)
    .order('date', { ascending: false });

  // Récupérer les insights wearable
  const { data: wearable_insights } = await supabase
    .from('wearable_insights')
    .select('*')
    .eq('patient_id', id)
    .order('created_at', { ascending: false });

  return {
    ...patient,
    anamnese: anamnese || undefined,
    consultations: consultations || [],
    plan: planWithVersions || undefined,
    journal_entries: journal_entries || [],
    messages: messages || [],
    wearable_summaries: wearable_summaries || [],
    wearable_insights: wearable_insights || []
  };
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getNotifications(): Promise<(Notification & { patient?: Patient })[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      patient:patients(*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data || [];
}

// ============================================
// CONSULTATIONS
// ============================================

export async function getConsultationById(id: string): Promise<(Consultation & { patient?: Patient }) | null> {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      patient:patients(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching consultation:', error);
    return null;
  }
  return data;
}

// ============================================
// PLANS
// ============================================

export async function getPlanById(id: string): Promise<(Plan & { 
  patient?: Patient, 
  versions?: (PlanVersion & { sections?: PlanSection[] })[] 
}) | null> {
  const { data: plan, error } = await supabase
    .from('plans')
    .select(`
      *,
      patient:patients(*)
    `)
    .eq('id', id)
    .single();
  
  if (error || !plan) {
    console.error('Error fetching plan:', error);
    return null;
  }

  // Récupérer les versions
  const { data: versions } = await supabase
    .from('plan_versions')
    .select('*')
    .eq('plan_id', id)
    .order('version', { ascending: false });

  if (versions) {
    const versionsWithSections = await Promise.all(
      versions.map(async (version) => {
        const { data: sections } = await supabase
          .from('plan_sections')
          .select('*')
          .eq('plan_version_id', version.id)
          .order('sort_order');
        return { ...version, sections: sections || [] };
      })
    );
    return { ...plan, versions: versionsWithSections };
  }

  return plan;
}

// ============================================
// MESSAGES
// ============================================

export async function sendMessage(patientId: string, text: string, sender: 'patient' | 'praticien'): Promise<Message | null> {
  const now = new Date().toISOString();
  const senderRole = sender === 'praticien' ? 'practitioner' : sender;
  const { data, error } = await supabase
    .from('messages')
    .insert({ patient_id: patientId, text, body: text, sender, sender_role: senderRole, sent_at: now, created_at: now })
    .select()
    .single();
  
  if (error) {
    console.error('Error sending message:', error);
    return null;
  }
  return data;
}

export async function markMessagesAsRead(patientId: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('patient_id', patientId)
    .eq('sender', 'patient')
    .is('read_at', null);

  if (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
  return true;
}

export async function getUnreadMessagesCount(patientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .eq('sender', 'patient')
    .is('read_at', null);

  if (error) {
    console.error('Error counting unread messages:', error);
    return 0;
  }
  return count ?? 0;
}

export async function getUnreadNotificationsCount(patientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .eq('read', false);

  if (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
  return count ?? 0;
}

// ============================================
// PATIENTS - CREATE/UPDATE
// ============================================

export async function createPatient(
  patient: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'practitioner_id'>
): Promise<Patient | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    return null;
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({ ...patient, practitioner_id: userData.user.id })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating patient:', error);
    return null;
  }
  return data;
}

export async function updateAnamnese(
  patientId: string,
  data: { motif?: string | null; objectifs?: string | null }
): Promise<Anamnese | null> {
  const { data: updated, error } = await supabase
    .from('anamneses')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating anamnese:', error);
    return null;
  }
  return updated;
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating patient:', error);
    return null;
  }
  return data;
}

export async function deletePatient(patientId: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    throw new Error('Veuillez vous reconnecter pour supprimer ce patient.');
  }

  console.log('[patients] delete start', { patientId, practitionerId: userData.user.id });
  const { data, error } = await supabase
    .from('patients')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', patientId)
    .eq('practitioner_id', userData.user.id)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    console.error('Error deleting patient:', error);
    throw new Error(describeSupabaseError(error));
  }

  if (!data || data.length === 0) {
    throw new Error('Suppression impossible pour ce patient.');
  }
  console.log('[patients] delete success', { patientId });
}

// ============================================
// PRACTITIONERS
// ============================================

export async function getPractitionerCalendlyUrl(): Promise<string | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    throw new Error(describeSupabaseError(userError));
  }

  console.log('[calendly] fetch url start', { practitionerId: userData.user.id });
  const { data, error } = await supabase
    .from('practitioners')
    .select('calendly_url')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching practitioner calendly URL:', error);
    throw new Error(describeSupabaseError(error));
  }

  console.log('[calendly] fetch url success', { calendlyUrl: data?.calendly_url ?? null });
  return data?.calendly_url ?? null;
}

export async function updatePractitionerCalendlyUrl(calendlyUrl: string | null): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    throw new Error('Veuillez vous reconnecter pour enregistrer ce lien.');
  }

  console.log('[calendly] update start', {
    practitionerId: userData.user.id,
    calendlyUrl
  });
  const { data, error } = await supabase
    .from('practitioners')
    .update({ calendly_url: calendlyUrl, updated_at: new Date().toISOString() })
    .eq('id', userData.user.id)
    .select('id');

  if (error) {
    console.error('Error updating practitioner calendly URL:', error);
    throw new Error(describeSupabaseError(error));
  }

  if (!data || data.length === 0) {
    throw new Error('Impossible d’enregistrer le lien Calendly.');
  }
  console.log('[calendly] update success', { practitionerId: userData.user.id });
}
