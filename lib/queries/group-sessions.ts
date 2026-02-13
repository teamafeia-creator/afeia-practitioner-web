import { supabase } from '../supabase';
import type { GroupSession, GroupSessionRegistration } from '../types';

// ============================================
// GROUP SESSIONS (SEANCES COLLECTIVES)
// ============================================

export async function getGroupSessionsForRange(
  startDate: string,
  endDate: string
): Promise<(GroupSession & { registration_count: number })[]> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select(`
      *,
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents, is_group, max_participants)
    `)
    .gte('starts_at', startDate)
    .lte('starts_at', endDate)
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Error fetching group sessions:', error);
    throw new Error(error.message);
  }

  // Get registration counts for each session
  const sessions = data || [];
  const sessionsWithCounts = await Promise.all(
    sessions.map(async (session) => {
      const { data: countData } = await supabase
        .rpc('get_group_session_registration_count', { p_session_id: session.id });
      return {
        ...session,
        registration_count: countData ?? 0,
      } as GroupSession & { registration_count: number };
    })
  );

  return sessionsWithCounts;
}

export async function getGroupSessionById(
  sessionId: string
): Promise<(GroupSession & { registrations: GroupSessionRegistration[] }) | null> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select(`
      *,
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents, is_group, max_participants),
      registrations:group_session_registrations(*)
    `)
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching group session:', error);
    return null;
  }

  return data as GroupSession & { registrations: GroupSessionRegistration[] };
}

export async function createGroupSession(sessionData: {
  consultation_type_id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  location_type: 'in_person' | 'video' | 'home_visit';
  location_details?: string | null;
  max_participants: number;
  notes_internal?: string | null;
}): Promise<GroupSession> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Non authentifie.');

  const { data, error } = await supabase
    .from('group_sessions')
    .insert({
      ...sessionData,
      practitioner_id: userData.user.id,
      status: 'scheduled',
    })
    .select(`
      *,
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents, is_group, max_participants)
    `)
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur creation seance collective.');
  return data as GroupSession;
}

export async function updateGroupSession(
  sessionId: string,
  updates: {
    consultation_type_id?: string;
    title?: string;
    description?: string | null;
    starts_at?: string;
    ends_at?: string;
    location_type?: 'in_person' | 'video' | 'home_visit';
    location_details?: string | null;
    max_participants?: number;
    notes_internal?: string | null;
    status?: string;
  }
): Promise<GroupSession> {
  const { data, error } = await supabase
    .from('group_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select(`
      *,
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents, is_group, max_participants)
    `)
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur mise a jour seance collective.');
  return data as GroupSession;
}

export async function cancelGroupSession(
  sessionId: string,
  reason: string
): Promise<GroupSession> {
  const { data, error } = await supabase
    .from('group_sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select(`
      *,
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents, is_group, max_participants)
    `)
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur annulation seance collective.');
  return data as GroupSession;
}

export async function completeGroupSession(sessionId: string): Promise<GroupSession> {
  return updateGroupSession(sessionId, { status: 'completed' });
}

export async function addRegistration(data: {
  group_session_id: string;
  consultant_id?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  source?: 'manual' | 'online_booking';
  notes?: string | null;
}): Promise<GroupSessionRegistration> {
  // Get session to find practitioner_id and max_participants
  const { data: session, error: sessionError } = await supabase
    .from('group_sessions')
    .select('practitioner_id, max_participants')
    .eq('id', data.group_session_id)
    .single();

  if (sessionError || !session) throw new Error('Seance collective introuvable.');

  // Check available spots
  const { data: countData } = await supabase
    .rpc('get_group_session_registration_count', { p_session_id: data.group_session_id });

  const currentCount = countData ?? 0;
  if (currentCount >= session.max_participants) {
    throw new Error('Plus de places disponibles pour cette seance.');
  }

  const { data: registration, error } = await supabase
    .from('group_session_registrations')
    .insert({
      group_session_id: data.group_session_id,
      consultant_id: data.consultant_id || null,
      practitioner_id: session.practitioner_id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      source: data.source || 'manual',
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error || !registration) {
    if (error?.code === '23505') {
      throw new Error('Cette adresse email est deja inscrite a cette seance.');
    }
    throw new Error(error?.message || 'Erreur inscription.');
  }

  return registration as GroupSessionRegistration;
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: 'registered' | 'confirmed' | 'attended' | 'no_show' | 'cancelled'
): Promise<GroupSessionRegistration> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('group_session_registrations')
    .update(updates)
    .eq('id', registrationId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur mise a jour inscription.');
  return data as GroupSessionRegistration;
}

export async function removeRegistration(registrationId: string): Promise<void> {
  await updateRegistrationStatus(registrationId, 'cancelled');
}

export async function getUpcomingGroupSessions(
  consultationTypeId: string,
  practitionerId: string
): Promise<(GroupSession & { registration_count: number })[]> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select(`
      *,
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents, is_group, max_participants)
    `)
    .eq('consultation_type_id', consultationTypeId)
    .eq('practitioner_id', practitionerId)
    .in('status', ['scheduled', 'confirmed'])
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming group sessions:', error);
    throw new Error(error.message);
  }

  const sessions = data || [];
  const sessionsWithCounts = await Promise.all(
    sessions.map(async (session) => {
      const { data: countData } = await supabase
        .rpc('get_group_session_registration_count', { p_session_id: session.id });
      return {
        ...session,
        registration_count: countData ?? 0,
      } as GroupSession & { registration_count: number };
    })
  );

  return sessionsWithCounts;
}
