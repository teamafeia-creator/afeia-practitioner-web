import { createAdminClient } from '../supabase/admin';
import type {
  ConsultationType,
  AvailabilitySchedule,
  AvailabilityOverride,
} from '../types';

// ============================================
// PUBLIC BOOKING QUERIES (server-side only)
// Uses admin client to bypass RLS where needed
// ============================================

export interface PractitionerPublicProfile {
  id: string;
  full_name: string;
  booking_intro_text: string | null;
  booking_address: string | null;
  booking_phone: string | null;
  cancellation_policy_hours: number | null;
  cancellation_policy_text: string | null;
  consultation_types: Array<{
    id: string;
    name: string;
    duration_minutes: number;
    price_cents: number | null;
    color: string;
    description: string | null;
    buffer_minutes: number;
    sort_order: number;
  }>;
}

export async function getPractitionerBySlug(slug: string): Promise<PractitionerPublicProfile | null> {
  const supabase = createAdminClient();

  const { data: practitioner, error } = await supabase
    .from('practitioners')
    .select('id, full_name, booking_intro_text, booking_address, booking_phone, cancellation_policy_hours, cancellation_policy_text, booking_enabled')
    .eq('booking_slug', slug)
    .single();

  if (error || !practitioner) return null;
  if (!practitioner.booking_enabled) return null;

  const { data: types } = await supabase
    .from('consultation_types')
    .select('id, name, duration_minutes, price_cents, color, description, buffer_minutes, sort_order')
    .eq('practitioner_id', practitioner.id)
    .eq('is_active', true)
    .eq('is_bookable_online', true)
    .order('sort_order', { ascending: true });

  return {
    id: practitioner.id,
    full_name: practitioner.full_name,
    booking_intro_text: practitioner.booking_intro_text,
    booking_address: practitioner.booking_address,
    booking_phone: practitioner.booking_phone,
    cancellation_policy_hours: practitioner.cancellation_policy_hours,
    cancellation_policy_text: practitioner.cancellation_policy_text,
    consultation_types: types || [],
  };
}

export async function getPractitionerPublicInfo(slug: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('practitioners')
    .select('id, full_name, booking_enabled, booking_address')
    .eq('booking_slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

// ============================================
// SLOT CALCULATION ENGINE
// ============================================

interface TimeSlot {
  start: string; // "HH:MM"
  end: string;
}

export async function getAvailableDaysForMonth(
  practitionerId: string,
  consultationTypeId: string,
  year: number,
  month: number // 1-12
): Promise<string[]> {
  const supabase = createAdminClient();

  // Get consultation type for duration + buffer
  const { data: ct } = await supabase
    .from('consultation_types')
    .select('duration_minutes, buffer_minutes')
    .eq('id', consultationTypeId)
    .single();

  if (!ct) return [];

  const totalMinutes = ct.duration_minutes + ct.buffer_minutes;

  // Get the date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Max 60 days in future
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);

  // Get schedules
  const { data: schedules } = await supabase
    .from('availability_schedules')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('is_active', true);

  if (!schedules || schedules.length === 0) return [];

  // Get overrides for this month
  const monthStart = startDate.toISOString().split('T')[0];
  const monthEnd = endDate.toISOString().split('T')[0];

  const { data: overrides } = await supabase
    .from('availability_overrides')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .gte('date', monthStart)
    .lte('date', monthEnd);

  // Get existing appointments for this month
  const { data: appointments } = await supabase
    .from('appointments')
    .select('starts_at, ends_at, status')
    .eq('practitioner_id', practitionerId)
    .not('status', 'in', '("cancelled","rescheduled")')
    .gte('starts_at', `${monthStart}T00:00:00`)
    .lte('starts_at', `${monthEnd}T23:59:59`);

  const availableDays: string[] = [];

  // Check each day in the month
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d < today) continue;
    if (d > maxDate) continue;

    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = convertJSDayToDBDay(d.getDay());

    // Check if day has any slots
    const hasSlots = dayHasAvailableSlots(
      dateStr,
      dayOfWeek,
      totalMinutes,
      schedules as AvailabilitySchedule[],
      (overrides || []) as AvailabilityOverride[],
      appointments || [],
      today
    );

    if (hasSlots) {
      availableDays.push(dateStr);
    }
  }

  return availableDays;
}

export async function getSlotsForDay(
  practitionerId: string,
  consultationTypeId: string,
  dateStr: string
): Promise<string[]> {
  const supabase = createAdminClient();

  // Get consultation type
  const { data: ct } = await supabase
    .from('consultation_types')
    .select('duration_minutes, buffer_minutes')
    .eq('id', consultationTypeId)
    .single();

  if (!ct) return [];

  const totalMinutes = ct.duration_minutes + ct.buffer_minutes;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const dayOfWeek = convertJSDayToDBDay(date.getDay());

  // Max 60 days in future
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  if (date > maxDate) return [];

  // Get schedules for this day of week
  const { data: schedules } = await supabase
    .from('availability_schedules')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true);

  if (!schedules || schedules.length === 0) {
    // Check overrides that add availability
    const { data: addOverrides } = await supabase
      .from('availability_overrides')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('date', dateStr)
      .eq('is_available', true);

    if (!addOverrides || addOverrides.length === 0) return [];

    // Use overrides as time ranges
    return computeSlotsFromRanges(
      dateStr,
      addOverrides.map(o => ({ start: o.start_time!, end: o.end_time! })),
      totalMinutes,
      await getAppointmentsForDate(supabase, practitionerId, dateStr),
      today
    );
  }

  // Get overrides for this date
  const { data: overrides } = await supabase
    .from('availability_overrides')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('date', dateStr);

  const existingAppointments = await getAppointmentsForDate(supabase, practitionerId, dateStr);

  // Build available time ranges
  let ranges: TimeSlot[] = schedules.map(s => ({
    start: s.start_time,
    end: s.end_time,
  }));

  // Apply overrides
  if (overrides && overrides.length > 0) {
    for (const override of overrides) {
      if (!override.is_available) {
        // Remove this time range
        if (override.start_time && override.end_time) {
          ranges = subtractRange(ranges, override.start_time, override.end_time);
        } else {
          // Entire day blocked
          ranges = [];
        }
      } else if (override.start_time && override.end_time) {
        // Add this time range
        ranges.push({ start: override.start_time, end: override.end_time });
      }
    }
  }

  return computeSlotsFromRanges(dateStr, ranges, totalMinutes, existingAppointments, today);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getAppointmentsForDate(
  supabase: ReturnType<typeof createAdminClient>,
  practitionerId: string,
  dateStr: string
) {
  const { data } = await supabase
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('practitioner_id', practitionerId)
    .not('status', 'in', '("cancelled","rescheduled")')
    .gte('starts_at', `${dateStr}T00:00:00`)
    .lte('starts_at', `${dateStr}T23:59:59`);

  return data || [];
}

function computeSlotsFromRanges(
  dateStr: string,
  ranges: TimeSlot[],
  totalMinutes: number,
  existingAppointments: Array<{ starts_at: string; ends_at: string }>,
  now: Date
): string[] {
  const slots: string[] = [];
  const step = 15; // 15-minute intervals

  for (const range of ranges) {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);
    const rangeStartMin = startH * 60 + startM;
    const rangeEndMin = endH * 60 + endM;

    for (let min = rangeStartMin; min + totalMinutes <= rangeEndMin; min += step) {
      const slotStart = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
      const slotEndMin = min + totalMinutes;
      const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

      // Check if slot is in the past
      const slotDateTime = new Date(`${dateStr}T${slotStart}:00`);
      if (slotDateTime <= now) continue;

      // Check for conflicts with existing appointments
      const slotStartISO = `${dateStr}T${slotStart}:00`;
      const slotEndISO = `${dateStr}T${slotEnd}:00`;

      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.starts_at).getTime();
        const aptEnd = new Date(apt.ends_at).getTime();
        const sStart = new Date(slotStartISO).getTime();
        const sEnd = new Date(slotEndISO).getTime();
        return sStart < aptEnd && sEnd > aptStart;
      });

      if (!hasConflict) {
        slots.push(slotStart);
      }
    }
  }

  return [...new Set(slots)].sort();
}

function dayHasAvailableSlots(
  dateStr: string,
  dayOfWeek: number,
  totalMinutes: number,
  schedules: AvailabilitySchedule[],
  overrides: AvailabilityOverride[],
  appointments: Array<{ starts_at: string; ends_at: string; status: string }>,
  now: Date
): boolean {
  const dateOverrides = overrides.filter(o => o.date === dateStr);

  // Check if entire day is blocked
  const dayBlocked = dateOverrides.some(
    o => !o.is_available && !o.start_time && !o.end_time
  );
  if (dayBlocked) return false;

  // Get base schedules for this day of week
  let ranges: TimeSlot[] = schedules
    .filter(s => s.day_of_week === dayOfWeek && s.is_active)
    .map(s => ({ start: s.start_time, end: s.end_time }));

  // Apply overrides
  for (const override of dateOverrides) {
    if (!override.is_available) {
      if (override.start_time && override.end_time) {
        ranges = subtractRange(ranges, override.start_time, override.end_time);
      } else {
        ranges = [];
      }
    } else if (override.start_time && override.end_time) {
      ranges.push({ start: override.start_time, end: override.end_time });
    }
  }

  if (ranges.length === 0) return false;

  // Check if at least one slot fits
  const dayAppointments = appointments.filter(a => a.starts_at.startsWith(dateStr));

  for (const range of ranges) {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);
    const rangeStartMin = startH * 60 + startM;
    const rangeEndMin = endH * 60 + endM;

    for (let min = rangeStartMin; min + totalMinutes <= rangeEndMin; min += 15) {
      const slotStart = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
      const slotEndMin = min + totalMinutes;
      const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

      const slotDateTime = new Date(`${dateStr}T${slotStart}:00`);
      if (slotDateTime <= now) continue;

      const slotStartISO = `${dateStr}T${slotStart}:00`;
      const slotEndISO = `${dateStr}T${slotEnd}:00`;

      const hasConflict = dayAppointments.some(apt => {
        const aptStart = new Date(apt.starts_at).getTime();
        const aptEnd = new Date(apt.ends_at).getTime();
        const sStart = new Date(slotStartISO).getTime();
        const sEnd = new Date(slotEndISO).getTime();
        return sStart < aptEnd && sEnd > aptStart;
      });

      if (!hasConflict) return true;
    }
  }

  return false;
}

function subtractRange(ranges: TimeSlot[], removeStart: string, removeEnd: string): TimeSlot[] {
  const result: TimeSlot[] = [];
  const [rsH, rsM] = removeStart.split(':').map(Number);
  const [reH, reM] = removeEnd.split(':').map(Number);
  const removeStartMin = rsH * 60 + rsM;
  const removeEndMin = reH * 60 + reM;

  for (const range of ranges) {
    const [sH, sM] = range.start.split(':').map(Number);
    const [eH, eM] = range.end.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (endMin <= removeStartMin || startMin >= removeEndMin) {
      // No overlap
      result.push(range);
    } else {
      // Before removed section
      if (startMin < removeStartMin) {
        result.push({ start: range.start, end: removeStart });
      }
      // After removed section
      if (endMin > removeEndMin) {
        result.push({ start: removeEnd, end: range.end });
      }
    }
  }

  return result;
}

/**
 * Convert JS Date.getDay() (0=Sunday) to DB day_of_week (0=Monday..6=Sunday)
 */
function convertJSDayToDBDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}
