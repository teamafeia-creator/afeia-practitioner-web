import type { SupabaseClient } from '@supabase/supabase-js';

export type ConflictingAppointment = {
  id: string;
  starts_at: string;
  booking_name: string | null;
  patient: { name: string | null; first_name: string | null; last_name: string | null } | null;
};

/**
 * Séances du praticien (ni annulées ni reportées) qui chevauchent [startsAt, endsAt[.
 * Partagé entre l'agenda (client navigateur) et les routes serveur (client admin).
 */
export async function findAppointmentConflicts(
  client: SupabaseClient,
  practitionerId: string,
  startsAt: string,
  endsAt: string,
  excludeId?: string
): Promise<ConflictingAppointment[]> {
  let query = client
    .from('appointments')
    .select('id, starts_at, booking_name, patient:consultants(name, first_name, last_name)')
    .eq('practitioner_id', practitionerId)
    .not('status', 'in', '("cancelled","rescheduled")')
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt)
    .order('starts_at', { ascending: true });

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return (data ?? []) as unknown as ConflictingAppointment[];
}

/** Nom affiché d'une séance en conflit : dossier, sinon nom de réservation. */
export function conflictName(a: ConflictingAppointment): string {
  const p = a.patient;
  return (p && (p.name || [p.first_name, p.last_name].filter(Boolean).join(' '))) || a.booking_name || 'Consultant';
}
