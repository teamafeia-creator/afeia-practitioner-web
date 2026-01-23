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
  PatientWithDetails
} from './types';

// ============================================
// PATIENTS
// ============================================

export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
  return data || [];
}

export async function getPatientById(id: string): Promise<PatientWithDetails | null> {
  // Récupérer le patient
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();
  
  if (patientError || !patient) {
    console.error('Error fetching patient:', patientError);
    return null;
  }

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

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating patient:', error);
    return null;
  }
  return data;
}
