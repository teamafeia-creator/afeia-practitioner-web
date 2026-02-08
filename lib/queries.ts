import { supabase } from './supabase';
import type { 
  Consultant, 
  Anamnese, 
  Consultation, 
  Appointment,
  Plan, 
  PlanVersion, 
  PlanSection,
  ConsultantPlan,
  JournalEntry, 
  Message, 
  WearableSummary, 
  WearableInsight,
  Notification,
  ConsultantAnamnesis,
  PractitionerNote,
  ConsultantWithDetails,
  ConsultantWithUnreadCounts
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
// CONSULTANTS
// ============================================

export async function getConsultants(): Promise<Consultant[]> {
  console.log('[consultants] fetch start');
  const { data, error } = await supabase
    .from('consultants')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  
  if (error) {
    console.error('Error fetching consultants:', error);
    throw new Error(describeSupabaseError(error));
  }
  console.log('[consultants] fetch success', { count: data?.length ?? 0 });
  return data || [];
}

export async function getConsultantsWithUnreadCounts(): Promise<ConsultantWithUnreadCounts[]> {
  console.log('[consultants] fetch with counts start');
  const { data: consultants, error } = await supabase
    .from('consultants')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching consultants with counts:', error);
    throw new Error(describeSupabaseError(error));
  }

  const safeConsultants = consultants || [];
  const consultantIds = safeConsultants.map((consultant) => consultant.id);
  if (consultantIds.length === 0) {
    return [];
  }

  const [messagesResult, notificationsResult, consultationsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('consultant_id')
      .in('consultant_id', consultantIds)
      .eq('sender', 'consultant')
      .is('read_at', null),
    supabase
      .from('notifications')
      .select('consultant_id')
      .in('consultant_id', consultantIds)
      .eq('read', false),
    supabase
      .from('consultations')
      .select('consultant_id, date')
      .in('consultant_id', consultantIds)
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

  console.log('[consultants] fetch with counts success', {
    count: safeConsultants.length,
    unreadMessagesCount: messagesResult.data?.length ?? 0,
    unreadNotificationsCount: notificationsResult.data?.length ?? 0
  });

  const unreadMessagesMap = (messagesResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.consultant_id] = (acc[row.consultant_id] ?? 0) + 1;
    return acc;
  }, {});

  const unreadNotificationsMap = (notificationsResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.consultant_id] = (acc[row.consultant_id] ?? 0) + 1;
    return acc;
  }, {});

  const lastConsultationMap = (consultationsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
    const existing = acc[row.consultant_id];
    if (!existing || new Date(row.date) > new Date(existing)) {
      acc[row.consultant_id] = row.date;
    }
    return acc;
  }, {});

  return safeConsultants.map((consultant) => ({
    ...consultant,
    unreadMessages: unreadMessagesMap[consultant.id] ?? 0,
    unreadNotifications: unreadNotificationsMap[consultant.id] ?? 0,
    lastConsultationAt: lastConsultationMap[consultant.id] ?? null
  }));
}

export async function getConsultantsWithUnreadCountsPaged({
  page,
  pageSize,
  search
}: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ consultants: ConsultantWithUnreadCounts[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const trimmedSearch = search?.trim();

  console.log('[consultants] fetch with counts paged start', { page, pageSize, search: trimmedSearch });
  let query = supabase
    .from('consultants')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (trimmedSearch) {
    query = query.or(`name.ilike.%${trimmedSearch}%,city.ilike.%${trimmedSearch}%`);
  }

  const { data: consultants, error, count } = await query.order('name').range(from, to);

  if (error) {
    console.error('Error fetching consultants with counts paged:', error);
    throw new Error(describeSupabaseError(error));
  }

  const safeConsultants = consultants || [];
  const consultantIds = safeConsultants.map((consultant) => consultant.id);
  if (consultantIds.length === 0) {
    return { consultants: [], total: count ?? 0 };
  }

  const [messagesResult, notificationsResult, consultationsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('consultant_id')
      .in('consultant_id', consultantIds)
      .eq('sender', 'consultant')
      .is('read_at', null),
    supabase
      .from('notifications')
      .select('consultant_id')
      .in('consultant_id', consultantIds)
      .eq('read', false),
    supabase
      .from('consultations')
      .select('consultant_id, date')
      .in('consultant_id', consultantIds)
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

  const unreadMessagesMap = (messagesResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.consultant_id] = (acc[row.consultant_id] ?? 0) + 1;
    return acc;
  }, {});

  const unreadNotificationsMap = (notificationsResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.consultant_id] = (acc[row.consultant_id] ?? 0) + 1;
    return acc;
  }, {});

  const lastConsultationMap = (consultationsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
    const existing = acc[row.consultant_id];
    if (!existing || new Date(row.date) > new Date(existing)) {
      acc[row.consultant_id] = row.date;
    }
    return acc;
  }, {});

  console.log('[consultants] fetch with counts paged success', {
    count: safeConsultants.length,
    total: count ?? 0
  });

  return {
    consultants: safeConsultants.map((consultant) => ({
      ...consultant,
      unreadMessages: unreadMessagesMap[consultant.id] ?? 0,
      unreadNotifications: unreadNotificationsMap[consultant.id] ?? 0,
      lastConsultationAt: lastConsultationMap[consultant.id] ?? null
    })),
    total: count ?? 0
  };
}

export async function getConsultantById(id: string): Promise<ConsultantWithDetails | null> {
  console.log('[consultants] fetch detail start', { consultantId: id });

  // First fetch the consultant (required before anything else)
  const { data: consultant, error: consultantError } = await supabase
    .from('consultants')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (consultantError || !consultant) {
    console.error('Error fetching consultant:', consultantError);
    return null;
  }
  console.log('[consultants] fetch detail success', { consultantId: id });

  // Run all independent queries in parallel
  const [
    anameseResult,
    consultationsResult,
    appointmentsResult,
    planResult,
    journalResult,
    consultantAnamnesisResult,
    anamneseInstanceResult,
    practitionerNoteResult,
    messagesResult,
    wearableSummariesResult,
    wearableInsightsResult,
    consultantPlansResult,
    analysisResultsResult
  ] = await Promise.all([
    supabase.from('anamneses').select('*').eq('consultant_id', id).single(),
    supabase.from('consultations').select('*').eq('consultant_id', id).order('date', { ascending: false }),
    supabase.from('appointments').select('*').eq('consultant_id', id).order('starts_at', { ascending: false }),
    supabase.from('plans').select('*').eq('consultant_id', id).single(),
    supabase.from('journal_entries').select('*').eq('consultant_id', id).order('date', { ascending: false }).limit(100),
    supabase.from('consultant_anamnesis').select('*').eq('consultant_id', id).maybeSingle(),
    supabase.from('anamnese_instances').select('answers').eq('consultant_id', id).maybeSingle(),
    supabase.from('practitioner_notes').select('*').eq('consultant_id', id).maybeSingle(),
    supabase.from('messages').select('*').eq('consultant_id', id).order('sent_at', { ascending: true }).limit(100),
    supabase.from('wearable_summaries').select('*').eq('consultant_id', id).order('date', { ascending: false }).limit(50),
    supabase.from('wearable_insights').select('*').eq('consultant_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('consultant_plans').select('*').eq('consultant_id', id).order('version', { ascending: false }),
    supabase.from('consultant_analysis_results').select('*').eq('consultant_id', id).order('analysis_date', { ascending: false })
  ]);

  // Handle plan -> versions -> sections (dependent chain, but eliminate N+1)
  const plan = planResult.data;
  let planWithVersions = plan;
  if (plan) {
    const { data: versions } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('plan_id', plan.id)
      .order('version', { ascending: false });

    if (versions && versions.length > 0) {
      // Fetch ALL sections for all versions in a single query (eliminates N+1)
      const versionIds = versions.map((v) => v.id);
      const { data: allSections } = await supabase
        .from('plan_sections')
        .select('*')
        .in('plan_version_id', versionIds)
        .order('sort_order');

      // Group sections by version ID
      const sectionsByVersion = (allSections || []).reduce<Record<string, typeof allSections>>((acc, section) => {
        const vid = section.plan_version_id;
        if (!acc[vid]) acc[vid] = [];
        acc[vid]!.push(section);
        return acc;
      }, {});

      const versionsWithSections = versions.map((version) => ({
        ...version,
        sections: sectionsByVersion[version.id] || []
      }));
      planWithVersions = { ...plan, versions: versionsWithSections };
    }
  }

  const anamnese = anameseResult.data;
  const consultantAnamnesis = consultantAnamnesisResult.data;
  const anamneseInstance = anamneseInstanceResult.data;

  return {
    ...consultant,
    anamnese: anamnese || undefined,
    consultations: consultationsResult.data || [],
    appointments: appointmentsResult.data || [],
    plan: planWithVersions || undefined,
    consultant_anamnesis:
      consultantAnamnesis ||
      (anamneseInstance?.answers
        ? ({
            id: 'legacy',
            consultant_id: id,
            answers: anamneseInstance.answers as Record<string, string>,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as ConsultantAnamnesis)
        : null),
    practitioner_note: practitionerNoteResult.data || null,
    journal_entries: journalResult.data || [],
    messages: messagesResult.data || [],
    wearable_summaries: wearableSummariesResult.data || [],
    wearable_insights: wearableInsightsResult.data || [],
    consultant_plans: consultantPlansResult.data || [],
    analysis_results: analysisResultsResult.data || []
  };
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getNotifications(): Promise<(Notification & { consultant?: Consultant })[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      consultant:consultants(*)
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

export async function getConsultationById(id: string): Promise<(Consultation & { consultant?: Consultant }) | null> {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      consultant:consultants(*)
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
  consultant?: Consultant, 
  versions?: (PlanVersion & { sections?: PlanSection[] })[] 
}) | null> {
  const { data: plan, error } = await supabase
    .from('plans')
    .select(`
      *,
      consultant:consultants(*)
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

export async function sendMessage(consultantId: string, text: string, sender: 'consultant' | 'praticien'): Promise<Message | null> {
  const now = new Date().toISOString();
  const senderRole = sender === 'praticien' ? 'practitioner' : sender;
  const { data, error } = await supabase
    .from('messages')
    .insert({ consultant_id: consultantId, text, body: text, sender, sender_role: senderRole, sent_at: now, created_at: now })
    .select()
    .single();
  
  if (error) {
    console.error('Error sending message:', error);
    return null;
  }
  return data;
}

export async function markMessagesAsRead(consultantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('consultant_id', consultantId)
    .eq('sender', 'consultant')
    .is('read_at', null);

  if (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
  return true;
}

export async function getUnreadMessagesCount(consultantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_id', consultantId)
    .eq('sender', 'consultant')
    .is('read_at', null);

  if (error) {
    console.error('Error counting unread messages:', error);
    return 0;
  }
  return count ?? 0;
}

export async function getUnreadNotificationsCount(consultantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_id', consultantId)
    .eq('read', false);

  if (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
  return count ?? 0;
}

// ============================================
// CONSULTANTS - CREATE/UPDATE
// ============================================

export async function createConsultant(
  consultant: Omit<Consultant, 'id' | 'created_at' | 'updated_at' | 'practitioner_id'>
): Promise<Consultant | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    return null;
  }

  const { data, error } = await supabase
    .from('consultants')
    .insert({ ...consultant, practitioner_id: userData.user.id })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating consultant:', error);
    return null;
  }
  return data;
}

export async function updateAnamnese(
  consultantId: string,
  data: { motif?: string | null; objectifs?: string | null }
): Promise<Anamnese | null> {
  const { data: updated, error } = await supabase
    .from('anamneses')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('consultant_id', consultantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating anamnese:', error);
    return null;
  }
  return updated;
}

export async function updateConsultant(id: string, updates: Partial<Consultant>): Promise<Consultant> {
  const { data, error } = await supabase
    .from('consultants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating consultant:', error);
    throw new Error(describeSupabaseError(error));
  }
  return data;
}

export async function createAppointment({
  consultantId,
  startsAt,
  endsAt,
  notes
}: {
  consultantId: string;
  startsAt: string;
  endsAt?: string | null;
  notes?: string | null;
}): Promise<Appointment> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Veuillez vous reconnecter pour planifier un rendez-vous.');
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      consultant_id: consultantId,
      practitioner_id: userData.user.id,
      starts_at: startsAt,
      ends_at: endsAt,
      notes: notes ?? null,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating appointment:', error);
    throw new Error(describeSupabaseError(error));
  }
  return data;
}

export async function upsertConsultantAnamnesis(
  consultantId: string,
  answers: Record<string, string>
): Promise<ConsultantAnamnesis | null> {
  const { data, error } = await supabase
    .from('consultant_anamnesis')
    .upsert(
      {
        consultant_id: consultantId,
        answers,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'consultant_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting consultant anamnesis:', error);
    return null;
  }
  return data;
}

export async function upsertJournalEntry(
  consultantId: string,
  entry: Partial<JournalEntry> & { date: string }
): Promise<JournalEntry | null> {
  if (entry.id) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        mood: entry.mood ?? null,
        energy: entry.energy ?? null,
        text: entry.text ?? null,
        adherence_hydratation: entry.adherence_hydratation ?? false,
        adherence_respiration: entry.adherence_respiration ?? false,
        adherence_mouvement: entry.adherence_mouvement ?? false,
        adherence_plantes: entry.adherence_plantes ?? false,
        date: entry.date
      })
      .eq('id', entry.id)
      .eq('consultant_id', consultantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating journal entry:', error);
      return null;
    }
    return data;
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      consultant_id: consultantId,
      date: entry.date,
      mood: entry.mood ?? null,
      energy: entry.energy ?? null,
      text: entry.text ?? null,
      adherence_hydratation: entry.adherence_hydratation ?? false,
      adherence_respiration: entry.adherence_respiration ?? false,
      adherence_mouvement: entry.adherence_mouvement ?? false,
      adherence_plantes: entry.adherence_plantes ?? false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating journal entry:', error);
    return null;
  }
  return data;
}

export async function deleteConsultant(consultantId: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    throw new Error('Veuillez vous reconnecter pour supprimer ce consultant.');
  }

  console.log('[consultants] delete start', { consultantId, practitionerId: userData.user.id });
  const { data, error } = await supabase
    .from('consultants')
    .delete()
    .eq('id', consultantId)
    .eq('practitioner_id', userData.user.id)
    .select('id');

  if (error) {
    console.error('Error deleting consultant:', error);
    throw new Error(describeSupabaseError(error));
  }

  if (!data || data.length === 0) {
    throw new Error('Suppression impossible pour ce consultant.');
  }
  console.log('[consultants] delete success', { consultantId });
}

export async function getConsultantPlans(consultantId: string): Promise<ConsultantPlan[]> {
  const { data, error } = await supabase
    .from('consultant_plans')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Error fetching consultant plans:', error);
    throw new Error(describeSupabaseError(error));
  }

  return (data ?? []) as ConsultantPlan[];
}

export async function createConsultantPlanVersion({
  consultantId,
  version,
  content
}: {
  consultantId: string;
  version: number;
  content: Record<string, string>;
}): Promise<ConsultantPlan> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Veuillez vous reconnecter pour créer un plan.');
  }

  const { data, error } = await supabase
    .from('consultant_plans')
    .insert({
      consultant_id: consultantId,
      practitioner_id: userData.user.id,
      version,
      status: 'draft',
      content
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating consultant plan:', error);
    throw new Error(describeSupabaseError(error));
  }

  return data as ConsultantPlan;
}

export async function updateConsultantPlanContent({
  planId,
  content
}: {
  planId: string;
  content: Record<string, string>;
}): Promise<ConsultantPlan> {
  const { data, error } = await supabase
    .from('consultant_plans')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating consultant plan:', error);
    throw new Error(describeSupabaseError(error));
  }

  return data as ConsultantPlan;
}

export async function shareConsultantPlanVersion(planId: string): Promise<ConsultantPlan> {
  const { data, error } = await supabase
    .from('consultant_plans')
    .update({
      status: 'shared',
      shared_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', planId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error sharing consultant plan:', error);
    throw new Error(describeSupabaseError(error));
  }

  return data as ConsultantPlan;
}

// ============================================
// PRACTITIONERS
// ============================================

export async function getPractitionerProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    throw new Error(describeSupabaseError(userError));
  }

  const { data, error } = await supabase
    .from('practitioners')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching practitioner profile:', error);
    throw new Error(describeSupabaseError(error));
  }

  return data;
}

export async function updatePractitionerProfile({
  full_name,
  email,
  default_consultation_reason
}: {
  full_name?: string | null;
  email?: string | null;
  default_consultation_reason?: string | null;
}): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    throw new Error('Veuillez vous reconnecter pour enregistrer votre profil.');
  }

  if (email) {
    const { error: authError } = await supabase.auth.updateUser({ email });
    if (authError) {
      console.error('Error updating practitioner auth email:', authError);
      throw new Error(describeSupabaseError(authError));
    }
  }

  const { data, error } = await supabase
    .from('practitioners')
    .update({
      ...(full_name !== undefined ? { full_name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(default_consultation_reason !== undefined
        ? { default_consultation_reason }
        : {}),
      updated_at: new Date().toISOString()
    })
    .eq('id', userData.user.id)
    .select('id');

  if (error) {
    console.error('Error updating practitioner profile:', error);
    throw new Error(describeSupabaseError(error));
  }

  if (!data || data.length === 0) {
    throw new Error('Impossible de mettre à jour le profil.');
  }
}

export async function upsertPractitionerNote(
  consultantId: string,
  content: string
): Promise<PractitionerNote | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError);
    throw new Error('Veuillez vous reconnecter pour enregistrer la note.');
  }

  const { data, error } = await supabase
    .from('practitioner_notes')
    .upsert(
      {
        consultant_id: consultantId,
        practitioner_id: userData.user.id,
        content,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'consultant_id,practitioner_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting practitioner note:', error);
    throw new Error(describeSupabaseError(error));
  }

  return data;
}
