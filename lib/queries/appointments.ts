import { supabase } from '../supabase';
import type {
  Appointment,
  AppointmentStatus,
  LocationType,
  ConsultationType,
  AvailabilitySchedule,
  AvailabilityOverride,
} from '../types';

// ============================================
// CONSULTATION TYPES
// ============================================

export async function getConsultationTypes(): Promise<ConsultationType[]> {
  const { data, error } = await supabase
    .from('consultation_types')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching consultation types:', error);
    throw new Error(error.message);
  }
  return data || [];
}

export async function createConsultationType(
  ct: Omit<ConsultationType, 'id' | 'practitioner_id' | 'created_at' | 'updated_at'>
): Promise<ConsultationType> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Non authentifie.');

  const { data, error } = await supabase
    .from('consultation_types')
    .insert({ ...ct, practitioner_id: userData.user.id })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur creation type.');
  return data;
}

export async function updateConsultationType(
  id: string,
  updates: Partial<Omit<ConsultationType, 'id' | 'practitioner_id' | 'created_at'>>
): Promise<ConsultationType> {
  const { data, error } = await supabase
    .from('consultation_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur mise a jour type.');
  return data;
}

export async function deleteConsultationType(id: string): Promise<void> {
  const { error } = await supabase
    .from('consultation_types')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function ensureDefaultConsultationTypes(): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return;

  const { data: existing } = await supabase
    .from('consultation_types')
    .select('id')
    .limit(1);

  if (existing && existing.length > 0) return;

  const defaults = [
    {
      name: 'Premiere consultation',
      duration_minutes: 90,
      price_cents: 8000,
      color: '#4CAF50',
      buffer_minutes: 15,
      sort_order: 0,
      is_active: true,
      is_bookable_online: true,
      description: null,
    },
    {
      name: 'Suivi',
      duration_minutes: 60,
      price_cents: 6000,
      color: '#2196F3',
      buffer_minutes: 15,
      sort_order: 1,
      is_active: true,
      is_bookable_online: true,
      description: null,
    },
    {
      name: 'Consultation visio',
      duration_minutes: 60,
      price_cents: 5500,
      color: '#9C27B0',
      buffer_minutes: 15,
      sort_order: 2,
      is_active: true,
      is_bookable_online: true,
      description: null,
    },
  ];

  const rows = defaults.map((d) => ({ ...d, practitioner_id: userData.user.id }));
  await supabase.from('consultation_types').insert(rows);
}

// ============================================
// AVAILABILITY SCHEDULES
// ============================================

export async function getAvailabilitySchedules(): Promise<AvailabilitySchedule[]> {
  const { data, error } = await supabase
    .from('availability_schedules')
    .select('*')
    .order('day_of_week')
    .order('start_time');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveAvailabilitySchedules(
  schedules: Omit<AvailabilitySchedule, 'id' | 'practitioner_id' | 'created_at'>[]
): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Non authentifie.');

  // Delete all existing and re-insert
  await supabase
    .from('availability_schedules')
    .delete()
    .eq('practitioner_id', userData.user.id);

  if (schedules.length === 0) return;

  const rows = schedules.map((s) => ({
    ...s,
    practitioner_id: userData.user.id,
  }));

  const { error } = await supabase.from('availability_schedules').insert(rows);
  if (error) throw new Error(error.message);
}

// ============================================
// AVAILABILITY OVERRIDES
// ============================================

export async function getAvailabilityOverrides(): Promise<AvailabilityOverride[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('availability_overrides')
    .select('*')
    .gte('date', today)
    .order('date');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAvailabilityOverride(
  override: Omit<AvailabilityOverride, 'id' | 'practitioner_id' | 'created_at'>
): Promise<AvailabilityOverride> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Non authentifie.');

  const { data, error } = await supabase
    .from('availability_overrides')
    .insert({ ...override, practitioner_id: userData.user.id })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur creation override.');
  return data;
}

export async function deleteAvailabilityOverride(id: string): Promise<void> {
  const { error } = await supabase
    .from('availability_overrides')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================
// APPOINTMENTS (SEANCES)
// ============================================

export async function getAppointmentsForRange(
  startDate: string,
  endDate: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:consultants(id, name, first_name, last_name, email, is_premium),
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
    `)
    .gte('starts_at', startDate)
    .lte('starts_at', endDate)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    throw new Error(error.message);
  }
  return (data || []).map(normalizeAppointment);
}

export async function getAppointmentsForPatient(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
    `)
    .eq('consultant_id', patientId)
    .order('starts_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeAppointment);
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  return getAppointmentsForRange(startOfDay, endOfDay);
}

export async function getRecentCompletedWithoutNotes(): Promise<Appointment[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:consultants(id, name, first_name, last_name, email, is_premium),
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
    `)
    .eq('status', 'completed')
    .is('notes_internal', null)
    .gte('starts_at', sevenDaysAgo.toISOString())
    .order('starts_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeAppointment);
}

export async function createNativeAppointment(appointment: {
  consultant_id: string | null;
  consultation_type_id: string | null;
  starts_at: string;
  ends_at: string;
  location_type: LocationType;
  video_link?: string | null;
  notes_internal?: string | null;
  booking_name?: string | null;
  booking_email?: string | null;
  booking_phone?: string | null;
}): Promise<Appointment> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Non authentifie.');

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      ...appointment,
      practitioner_id: userData.user.id,
      status: 'confirmed',
      source: 'manual',
    })
    .select(`
      *,
      patient:consultants(id, name, first_name, last_name, email, is_premium),
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
    `)
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur creation seance.');
  return normalizeAppointment(data);
}

export async function updateNativeAppointment(
  id: string,
  updates: {
    consultant_id?: string | null;
    consultation_type_id?: string | null;
    starts_at?: string;
    ends_at?: string;
    location_type?: LocationType;
    video_link?: string | null;
    video_room_name?: string | null;
    notes_internal?: string | null;
    status?: AppointmentStatus;
  }
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      patient:consultants(id, name, first_name, last_name, email, is_premium),
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
    `)
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur mise a jour seance.');
  return normalizeAppointment(data);
}

export async function cancelAppointment(
  id: string,
  reason: string | null,
  cancelledBy: 'practitioner' | 'consultant'
): Promise<Appointment> {
  return updateNativeAppointment(id, {
    status: 'cancelled',
  }).then(async () => {
    // Update cancel fields separately since updateNativeAppointment doesn't handle them
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        patient:consultants(id, name, first_name, last_name, email, is_premium),
        consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
      `)
      .single();

    if (error || !data) throw new Error(error?.message || 'Erreur annulation.');
    return normalizeAppointment(data);
  });
}

export async function completeAppointment(id: string): Promise<Appointment> {
  return updateNativeAppointment(id, { status: 'completed' });
}

export async function rescheduleAppointment(
  oldId: string,
  newData: {
    starts_at: string;
    ends_at: string;
    consultant_id: string | null;
    consultation_type_id: string | null;
    location_type: LocationType;
    video_link?: string | null;
    notes_internal?: string | null;
  }
): Promise<Appointment> {
  // Mark old as rescheduled
  await supabase
    .from('appointments')
    .update({ status: 'rescheduled', updated_at: new Date().toISOString() })
    .eq('id', oldId);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Non authentifie.');

  // Create new appointment
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      ...newData,
      practitioner_id: userData.user.id,
      rescheduled_from_id: oldId,
      status: 'confirmed',
      source: 'manual',
    })
    .select(`
      *,
      patient:consultants(id, name, first_name, last_name, email, is_premium),
      consultation_type:consultation_types(id, name, color, duration_minutes, price_cents)
    `)
    .single();

  if (error || !data) throw new Error(error?.message || 'Erreur report.');
  return normalizeAppointment(data);
}

export async function checkAppointmentConflict(
  startsAt: string,
  endsAt: string,
  excludeId?: string
): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  let query = supabase
    .from('appointments')
    .select('id')
    .eq('practitioner_id', userData.user.id)
    .not('status', 'in', '("cancelled","rescheduled")')
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

/**
 * Link an already-created appointment as the reschedule of an old one.
 * Marks the old appointment as 'rescheduled' and sets rescheduled_from_id on the new one.
 */
export async function linkReschedule(oldId: string, newId: string): Promise<void> {
  // Mark old appointment as rescheduled
  await supabase
    .from('appointments')
    .update({ status: 'rescheduled', updated_at: new Date().toISOString() })
    .eq('id', oldId);

  // Link new appointment to old one
  await supabase
    .from('appointments')
    .update({ rescheduled_from_id: oldId, updated_at: new Date().toISOString() })
    .eq('id', newId);
}

// Helper to normalize appointment data
function normalizeAppointment(raw: Record<string, unknown>): Appointment {
  return raw as Appointment;
}
