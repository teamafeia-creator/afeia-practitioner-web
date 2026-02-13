import { createAdminClient } from '../supabase/admin';
import type { WaitlistEntry, WaitlistInsert } from '../types';

// ============================================
// WAITLIST QUERIES (server-side only)
// Uses admin client to bypass RLS
// ============================================

/**
 * Insert a new waitlist entry (public — called from the booking page).
 * Uses admin client since anon insert requires RLS policy check.
 */
export async function createWaitlistEntry(
  data: WaitlistInsert
): Promise<WaitlistEntry> {
  const supabase = createAdminClient();

  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .insert({
      practitioner_id: data.practitioner_id,
      consultation_type_id: data.consultation_type_id || null,
      email: data.email,
      first_name: data.first_name,
      phone: data.phone || null,
      preferred_time_of_day: data.preferred_time_of_day,
      preferred_days: data.preferred_days,
    })
    .select()
    .single();

  if (error || !entry) {
    throw new Error(error?.message || 'Erreur creation waitlist entry.');
  }

  return entry as WaitlistEntry;
}

/**
 * Check if an active entry already exists for this email + practitioner.
 */
export async function hasActiveWaitlistEntry(
  practitionerId: string,
  email: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('practitioner_id', practitionerId)
    .eq('email', email)
    .is('fulfilled_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (error) {
    console.error('Error checking waitlist duplicate:', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Get active waitlist entries for a practitioner (not notified, not fulfilled, not expired).
 */
export async function getActiveWaitlistEntries(
  practitionerId: string
): Promise<WaitlistEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('waitlist_entries')
    .select(`
      *,
      consultation_type:consultation_types(name)
    `)
    .eq('practitioner_id', practitionerId)
    .is('fulfilled_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching active waitlist entries:', error);
    throw new Error(error.message);
  }

  return (data || []) as WaitlistEntry[];
}

/**
 * Get entries matching a freed slot (for notification).
 * Matches on: day of week, time of day preference, consultation type.
 * Returns max 3 entries ordered by created_at (first-come first-served).
 */
export async function getMatchingWaitlistEntries(
  practitionerId: string,
  slot: { startsAt: Date; consultationTypeId: string }
): Promise<WaitlistEntry[]> {
  const supabase = createAdminClient();

  // Determine day of week (ISO: 1=Monday, 6=Saturday)
  const jsDay = slot.startsAt.getDay(); // 0=Sunday, 1=Monday...
  const isoDay = jsDay === 0 ? 7 : jsDay; // Convert to ISO (1-7, Sunday=7)

  // Determine time of day
  const hour = slot.startsAt.getHours();
  let timeCategories: string[];
  if (hour < 12) {
    timeCategories = ['morning', 'any'];
  } else if (hour < 17) {
    timeCategories = ['afternoon', 'any'];
  } else {
    timeCategories = ['evening', 'any'];
  }

  // Base query: active entries for this practitioner
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .is('notified_at', null)
    .is('fulfilled_at', null)
    .gt('expires_at', new Date().toISOString())
    .in('preferred_time_of_day', timeCategories)
    .or(`consultation_type_id.eq.${slot.consultationTypeId},consultation_type_id.is.null`)
    .order('created_at', { ascending: true })
    .limit(10); // Fetch extra to filter preferred_days in JS

  if (error) {
    console.error('Error fetching matching waitlist entries:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Filter by preferred_days in JS (Supabase array contains is limited)
  const filtered = (data as WaitlistEntry[]).filter(entry => {
    // Empty preferred_days means all days
    if (entry.preferred_days.length === 0) return true;
    return entry.preferred_days.includes(isoDay);
  });

  return filtered.slice(0, 3);
}

/**
 * Mark entries as notified for a specific slot.
 */
export async function markAsNotified(
  ids: string[],
  slotStartsAt: Date
): Promise<void> {
  if (ids.length === 0) return;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('waitlist_entries')
    .update({
      notified_at: new Date().toISOString(),
      notified_for_slot: slotStartsAt.toISOString(),
    })
    .in('id', ids);

  if (error) {
    console.error('Error marking waitlist entries as notified:', error);
  }
}

/**
 * Mark entries as fulfilled when a notified slot is actually booked.
 */
export async function markAsFulfilled(
  practitionerId: string,
  slotStartsAt: Date
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ fulfilled_at: new Date().toISOString() })
    .eq('practitioner_id', practitionerId)
    .eq('notified_for_slot', slotStartsAt.toISOString())
    .not('notified_at', 'is', null);

  if (error) {
    console.error('Error marking waitlist entries as fulfilled:', error);
  }
}

/**
 * Delete a waitlist entry (practitioner action).
 */
export async function deleteWaitlistEntry(
  id: string,
  practitionerId: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('waitlist_entries')
    .delete()
    .eq('id', id)
    .eq('practitioner_id', practitionerId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Cleanup expired or old fulfilled entries.
 * Returns the number of deleted rows.
 */
export async function cleanupExpiredEntries(): Promise<number> {
  const supabase = createAdminClient();

  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Delete expired entries
  const { data: expired, error: expiredError } = await supabase
    .from('waitlist_entries')
    .delete()
    .lt('expires_at', now)
    .select('id');

  if (expiredError) {
    console.error('Error cleaning up expired waitlist entries:', expiredError);
  }

  // Delete old fulfilled entries
  const { data: fulfilled, error: fulfilledError } = await supabase
    .from('waitlist_entries')
    .delete()
    .not('fulfilled_at', 'is', null)
    .lt('fulfilled_at', sevenDaysAgo)
    .select('id');

  if (fulfilledError) {
    console.error('Error cleaning up fulfilled waitlist entries:', fulfilledError);
  }

  return (expired?.length ?? 0) + (fulfilled?.length ?? 0);
}

/**
 * Count active waitlist entries for a practitioner (for badge display).
 */
export async function getWaitlistCount(
  practitionerId: string
): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('waitlist_entries')
    .select('id', { count: 'exact', head: true })
    .eq('practitioner_id', practitionerId)
    .is('fulfilled_at', null)
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error counting waitlist entries:', error);
    return 0;
  }

  return count ?? 0;
}
