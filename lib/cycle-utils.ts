/**
 * Pure utility functions for menstrual cycle phase calculation.
 * No database dependency — all functions work with in-memory data.
 */

import type { CycleEntry, CyclePhase, CyclePhaseRange } from './types';

// ============================================
// DATE HELPERS
// ============================================

/** Strip time component — work with date-only strings (YYYY-MM-DD) */
function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  const da = toDateOnly(a);
  const db = toDateOnly(b);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

function addDays(d: Date, n: number): Date {
  const r = toDateOnly(d);
  r.setDate(r.getDate() + n);
  return r;
}

function parseDate(s: string): Date {
  // "YYYY-MM-DD" → local date (no timezone shift)
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ============================================
// CYCLE START IDENTIFICATION
// ============================================

/**
 * Identify cycle start dates (J1) from raw entries.
 *
 * A "cycle start" is a day with is_period=true preceded by at least
 * `minGapDays` consecutive days without is_period=true (or it is the very
 * first period entry). This distinguishes a new cycle from consecutive
 * period days within the same cycle.
 */
export function identifyCycleStarts(
  entries: CycleEntry[],
  minGapDays = 14
): Date[] {
  // Sort chronologically
  const sorted = [...entries]
    .filter((e) => e.is_period)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return [];

  const starts: Date[] = [];
  let lastPeriodDate: Date | null = null;

  for (const entry of sorted) {
    const d = parseDate(entry.date);
    if (lastPeriodDate === null) {
      // Very first period entry → first cycle start
      starts.push(d);
    } else {
      const gap = daysBetween(lastPeriodDate, d);
      if (gap >= minGapDays) {
        starts.push(d);
      }
    }
    lastPeriodDate = d;
  }

  return starts;
}

// ============================================
// PHASE CALCULATION
// ============================================

/**
 * Get the cycle day number for a given date relative to a cycle start.
 * J1 = 1.
 */
export function getCycleDay(date: Date | string, cycleStart: Date | string): number {
  const d = typeof date === 'string' ? parseDate(date) : toDateOnly(date);
  const cs = typeof cycleStart === 'string' ? parseDate(cycleStart) : toDateOnly(cycleStart);
  return daysBetween(cs, d) + 1;
}

/**
 * Determine the cycle phase for a given cycle day.
 *
 * Rule: The luteal phase is ~14 days (biological constant).
 * Ovulation ≈ cycleLength - 14.
 * The follicular phase varies with cycle length.
 */
export function getCyclePhaseForDay(
  cycleDay: number,
  cycleLength: number,
  periodLength: number
): CyclePhase {
  const ovulationDay = cycleLength - 14;

  if (cycleDay >= 1 && cycleDay <= periodLength) {
    return 'menstrual';
  }
  if (cycleDay <= ovulationDay - 2) {
    return 'follicular';
  }
  if (cycleDay <= ovulationDay + 1) {
    return 'ovulation';
  }
  if (cycleDay <= cycleLength - 7) {
    return 'luteal_early';
  }
  // luteal_late: last ~7 days or beyond cycle length (late period)
  return 'luteal_late';
}

/**
 * Convenience wrapper: phase for a date given cycle start + profile params.
 */
export function getCyclePhaseForDate(
  date: Date | string,
  cycleStart: Date | string,
  cycleLength: number,
  periodLength: number
): CyclePhase {
  const day = getCycleDay(date, cycleStart);
  return getCyclePhaseForDay(day, cycleLength, periodLength);
}

/**
 * Return an array of 5 CyclePhaseRange objects for one cycle.
 */
export function getCyclePhases(
  cycleStart: Date | string,
  cycleLength: number,
  periodLength: number
): CyclePhaseRange[] {
  const cs = typeof cycleStart === 'string' ? parseDate(cycleStart) : toDateOnly(cycleStart);
  const ovulationDay = cycleLength - 14;

  return [
    {
      phase: 'menstrual' as CyclePhase,
      start: cs,
      end: addDays(cs, periodLength - 1),
    },
    {
      phase: 'follicular' as CyclePhase,
      start: addDays(cs, periodLength),
      end: addDays(cs, ovulationDay - 3),
    },
    {
      phase: 'ovulation' as CyclePhase,
      start: addDays(cs, ovulationDay - 2),
      end: addDays(cs, ovulationDay),
    },
    {
      phase: 'luteal_early' as CyclePhase,
      start: addDays(cs, ovulationDay + 1),
      end: addDays(cs, cycleLength - 8),
    },
    {
      phase: 'luteal_late' as CyclePhase,
      start: addDays(cs, cycleLength - 7),
      end: addDays(cs, cycleLength - 1),
    },
  ];
}

// ============================================
// PREDICTIONS & AVERAGES
// ============================================

/**
 * Predict the next period start date.
 */
export function predictNextPeriod(
  lastPeriodStart: Date | string,
  averageCycleLength: number
): Date {
  const lps = typeof lastPeriodStart === 'string' ? parseDate(lastPeriodStart) : toDateOnly(lastPeriodStart);
  return addDays(lps, averageCycleLength);
}

/**
 * Calculate average cycle length from identified cycle start dates.
 * Returns 28 if fewer than 2 starts.
 */
export function calculateAverageCycleLength(cycleStarts: Date[]): number {
  if (cycleStarts.length < 2) return 28;

  const sorted = [...cycleStarts].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += daysBetween(sorted[i - 1], sorted[i]);
  }
  return Math.round(total / (sorted.length - 1));
}

// ============================================
// CURRENT CYCLE INFO (composite helper)
// ============================================

/**
 * Find the most recent cycle start that is <= today.
 */
export function findCurrentCycleStart(
  cycleStarts: Date[],
  today: Date | string = new Date()
): Date | null {
  const t = typeof today === 'string' ? parseDate(today) : toDateOnly(today);
  const sorted = [...cycleStarts].sort((a, b) => b.getTime() - a.getTime());
  for (const cs of sorted) {
    if (cs.getTime() <= t.getTime()) return cs;
  }
  return null;
}

/**
 * Get full cycle context for a given date: phase, day, next period prediction.
 * Returns null if no cycle data available.
 */
export function getCycleContext(
  entries: CycleEntry[],
  averageCycleLength: number,
  periodLength: number,
  date: Date | string = new Date()
): {
  phase: CyclePhase;
  cycleDay: number;
  cycleStart: Date;
  nextPeriod: Date;
  phases: CyclePhaseRange[];
} | null {
  const cycleStarts = identifyCycleStarts(entries);
  const currentStart = findCurrentCycleStart(cycleStarts, date);

  if (!currentStart) return null;

  const d = typeof date === 'string' ? parseDate(date) : toDateOnly(date);
  const day = getCycleDay(d, currentStart);
  const phase = getCyclePhaseForDay(day, averageCycleLength, periodLength);
  const nextPeriod = predictNextPeriod(currentStart, averageCycleLength);
  const phases = getCyclePhases(currentStart, averageCycleLength, periodLength);

  return { phase, cycleDay: day, cycleStart: currentStart, nextPeriod, phases };
}

/**
 * Build a map of date string → CyclePhase for a range of dates.
 * Useful for coloring calendars & overlays.
 */
export function buildPhaseMap(
  cycleStarts: Date[],
  averageCycleLength: number,
  periodLength: number,
  startDate: Date | string,
  endDate: Date | string
): Map<string, { phase: CyclePhase; cycleDay: number; predicted: boolean }> {
  const map = new Map<string, { phase: CyclePhase; cycleDay: number; predicted: boolean }>();
  const sd = typeof startDate === 'string' ? parseDate(startDate) : toDateOnly(startDate);
  const ed = typeof endDate === 'string' ? parseDate(endDate) : toDateOnly(endDate);

  if (cycleStarts.length === 0) return map;

  const sorted = [...cycleStarts].sort((a, b) => a.getTime() - b.getTime());
  const lastKnownStart = sorted[sorted.length - 1];

  // Build extended starts including predicted future cycle starts
  const extendedStarts = [...sorted];
  let nextPredicted = addDays(lastKnownStart, averageCycleLength);
  while (nextPredicted.getTime() <= ed.getTime()) {
    extendedStarts.push(nextPredicted);
    nextPredicted = addDays(nextPredicted, averageCycleLength);
  }

  let current = sd;
  while (current.getTime() <= ed.getTime()) {
    // Find the relevant cycle start for this date
    let relevantStart: Date | null = null;
    for (let i = extendedStarts.length - 1; i >= 0; i--) {
      if (extendedStarts[i].getTime() <= current.getTime()) {
        relevantStart = extendedStarts[i];
        break;
      }
    }

    if (relevantStart) {
      const day = getCycleDay(current, relevantStart);
      const phase = getCyclePhaseForDay(day, averageCycleLength, periodLength);
      const predicted = relevantStart.getTime() > lastKnownStart.getTime();
      const key = current.toISOString().slice(0, 10);
      map.set(key, { phase, cycleDay: day, predicted });
    }

    current = addDays(current, 1);
  }

  return map;
}

// Re-export helpers for external use
export { parseDate, daysBetween, addDays };
