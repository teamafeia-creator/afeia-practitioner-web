import { supabase } from '../lib/supabase';

export type PlanContent = {
  title: string;
  description?: string;
  objectives?: string[];
  recommendations?: Array<{
    category: string;
    title: string;
    details?: string;
  }>;
  supplements?: Array<{
    name: string;
    dosage?: string;
    instructions?: string;
  }>;
  notes?: string;
};

export type Plan = {
  id: string;
  patientId: string;
  patientName?: string;
  version: number;
  status: 'draft' | 'shared';
  content: PlanContent;
  sharedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchPlansForPatient(patientId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('patient_plans')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    // Try care_plans table as fallback
    const { data: carePlans, error: carePlansError } = await supabase
      .from('care_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (carePlansError) {
      console.error('Error fetching plans:', carePlansError);
      return [];
    }

    return (carePlans || []).map((p) => ({
      id: p.id,
      patientId: p.patient_id,
      version: 1,
      status: p.status === 'sent' || p.status === 'viewed' ? 'shared' : 'draft',
      content: p.content || { title: p.title, description: p.description },
      sharedAt: p.sent_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  }

  return (data || []).map((p) => ({
    id: p.id,
    patientId: p.patient_id,
    version: p.version || 1,
    status: p.status,
    content: p.content,
    sharedAt: p.shared_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function createPlan(
  patientId: string,
  content: PlanContent
): Promise<{ planId: string } | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Not authenticated');
    return null;
  }

  // Try patient_plans first
  const { data, error } = await supabase
    .from('patient_plans')
    .insert({
      patient_id: patientId,
      practitioner_id: userData.user.id,
      version: 1,
      status: 'draft',
      content: content,
    })
    .select('id')
    .single();

  if (error) {
    // Try care_plans as fallback
    const { data: carePlan, error: carePlanError } = await supabase
      .from('care_plans')
      .insert({
        patient_id: patientId,
        practitioner_id: userData.user.id,
        title: content.title,
        description: content.description,
        content: content,
        status: 'draft',
      })
      .select('id')
      .single();

    if (carePlanError) {
      console.error('Error creating plan:', carePlanError);
      return null;
    }

    return { planId: carePlan.id };
  }

  return { planId: data.id };
}

export async function updatePlan(
  planId: string,
  content: PlanContent
): Promise<boolean> {
  // Try patient_plans first
  const { error } = await supabase
    .from('patient_plans')
    .update({
      content: content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId);

  if (error) {
    // Try care_plans as fallback
    const { error: carePlanError } = await supabase
      .from('care_plans')
      .update({
        title: content.title,
        description: content.description,
        content: content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (carePlanError) {
      console.error('Error updating plan:', carePlanError);
      return false;
    }
  }

  return true;
}

export async function sharePlanWithPatient(planId: string): Promise<boolean> {
  const now = new Date().toISOString();

  // Try patient_plans first
  const { error } = await supabase
    .from('patient_plans')
    .update({
      status: 'shared',
      shared_at: now,
      updated_at: now,
    })
    .eq('id', planId);

  if (error) {
    // Try care_plans as fallback
    const { error: carePlanError } = await supabase
      .from('care_plans')
      .update({
        status: 'sent',
        sent_at: now,
        updated_at: now,
      })
      .eq('id', planId);

    if (carePlanError) {
      console.error('Error sharing plan:', carePlanError);
      return false;
    }
  }

  return true;
}

export async function deletePlan(planId: string): Promise<boolean> {
  // Try patient_plans first
  const { error } = await supabase
    .from('patient_plans')
    .delete()
    .eq('id', planId);

  if (error) {
    // Try care_plans as fallback
    const { error: carePlanError } = await supabase
      .from('care_plans')
      .delete()
      .eq('id', planId);

    if (carePlanError) {
      console.error('Error deleting plan:', carePlanError);
      return false;
    }
  }

  return true;
}
