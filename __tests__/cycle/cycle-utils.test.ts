/**
 * Tests for cycle phase calculation utilities.
 */

import {
  identifyCycleStarts,
  getCycleDay,
  getCyclePhaseForDay,
  getCyclePhaseForDate,
  getCyclePhases,
  predictNextPeriod,
  calculateAverageCycleLength,
  getCycleContext,
  findCurrentCycleStart,
  buildPhaseMap,
} from '@/lib/cycle-utils';
import type { CycleEntry } from '@/lib/types';

// Helper to create a minimal CycleEntry
function makeEntry(
  date: string,
  isPeriod: boolean,
  overrides: Partial<CycleEntry> = {}
): CycleEntry {
  return {
    id: `entry-${date}`,
    consultant_id: 'test-consultant',
    date,
    is_period: isPeriod,
    flow_intensity: null,
    period_pain: null,
    symptom_cramps: false,
    symptom_bloating: false,
    symptom_headache: false,
    symptom_breast_tenderness: false,
    symptom_mood_swings: false,
    symptom_fatigue: false,
    symptom_acne: false,
    symptom_cravings: false,
    symptom_insomnia: false,
    symptom_water_retention: false,
    symptom_back_pain: false,
    symptom_nausea: false,
    symptom_libido_high: false,
    symptom_cervical_mucus: null,
    temperature: null,
    notes: null,
    source: 'consultant',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('identifyCycleStarts', () => {
  it('should return empty array for no entries', () => {
    expect(identifyCycleStarts([])).toEqual([]);
  });

  it('should identify first period as cycle start', () => {
    const entries = [makeEntry('2025-01-01', true)];
    const starts = identifyCycleStarts(entries);
    expect(starts).toHaveLength(1);
    expect(starts[0].toISOString().slice(0, 10)).toBe('2025-01-01');
  });

  it('should not count consecutive period days as new cycles', () => {
    const entries = [
      makeEntry('2025-01-01', true),
      makeEntry('2025-01-02', true),
      makeEntry('2025-01-03', true),
      makeEntry('2025-01-04', true),
      makeEntry('2025-01-05', true),
    ];
    const starts = identifyCycleStarts(entries);
    expect(starts).toHaveLength(1);
    expect(starts[0].toISOString().slice(0, 10)).toBe('2025-01-01');
  });

  it('should identify two cycle starts with 28-day gap', () => {
    const entries = [
      // Cycle 1 period: Jan 1-5
      makeEntry('2025-01-01', true),
      makeEntry('2025-01-02', true),
      makeEntry('2025-01-03', true),
      makeEntry('2025-01-04', true),
      makeEntry('2025-01-05', true),
      // Cycle 2 period: Jan 29 - Feb 2 (28-day cycle)
      makeEntry('2025-01-29', true),
      makeEntry('2025-01-30', true),
      makeEntry('2025-01-31', true),
      makeEntry('2025-02-01', true),
      makeEntry('2025-02-02', true),
    ];
    const starts = identifyCycleStarts(entries);
    expect(starts).toHaveLength(2);
    expect(starts[0].toISOString().slice(0, 10)).toBe('2025-01-01');
    expect(starts[1].toISOString().slice(0, 10)).toBe('2025-01-29');
  });

  it('should identify three cycles', () => {
    const entries = [
      makeEntry('2025-01-01', true),
      makeEntry('2025-01-02', true),
      makeEntry('2025-01-29', true),
      makeEntry('2025-01-30', true),
      makeEntry('2025-02-26', true),
      makeEntry('2025-02-27', true),
    ];
    const starts = identifyCycleStarts(entries);
    expect(starts).toHaveLength(3);
    expect(starts[2].toISOString().slice(0, 10)).toBe('2025-02-26');
  });

  it('should handle entries with gaps (non-period days in between)', () => {
    const entries = [
      makeEntry('2025-01-01', true),
      makeEntry('2025-01-05', false), // non-period entry
      makeEntry('2025-01-10', false),
      makeEntry('2025-01-29', true), // 28 days later → new cycle
    ];
    const starts = identifyCycleStarts(entries);
    expect(starts).toHaveLength(2);
  });
});

describe('getCycleDay', () => {
  it('should return 1 for the cycle start date', () => {
    expect(getCycleDay('2025-01-01', '2025-01-01')).toBe(1);
  });

  it('should return correct day number', () => {
    expect(getCycleDay('2025-01-14', '2025-01-01')).toBe(14);
  });

  it('should return 28 for the last day of a 28-day cycle', () => {
    expect(getCycleDay('2025-01-28', '2025-01-01')).toBe(28);
  });
});

describe('getCyclePhaseForDay - 28 day cycle', () => {
  const cycleLength = 28;
  const periodLength = 5;

  it('J1-J5 should be menstrual', () => {
    expect(getCyclePhaseForDay(1, cycleLength, periodLength)).toBe('menstrual');
    expect(getCyclePhaseForDay(3, cycleLength, periodLength)).toBe('menstrual');
    expect(getCyclePhaseForDay(5, cycleLength, periodLength)).toBe('menstrual');
  });

  it('J6-J12 should be follicular', () => {
    expect(getCyclePhaseForDay(6, cycleLength, periodLength)).toBe('follicular');
    expect(getCyclePhaseForDay(10, cycleLength, periodLength)).toBe('follicular');
    expect(getCyclePhaseForDay(12, cycleLength, periodLength)).toBe('follicular');
  });

  it('J13-J15 should be ovulation (ovulationDay=14, window J12-J15)', () => {
    // ovulationDay = 28-14 = 14
    // ovulation window: ovulationDay-2 to ovulationDay+1 → J12 to J15
    // But follicular ends at ovulationDay-3 = J11
    // So J12 is ovulation start
    expect(getCyclePhaseForDay(13, cycleLength, periodLength)).toBe('ovulation');
    expect(getCyclePhaseForDay(14, cycleLength, periodLength)).toBe('ovulation');
    expect(getCyclePhaseForDay(15, cycleLength, periodLength)).toBe('ovulation');
  });

  it('J16-J21 should be luteal_early', () => {
    expect(getCyclePhaseForDay(16, cycleLength, periodLength)).toBe('luteal_early');
    expect(getCyclePhaseForDay(18, cycleLength, periodLength)).toBe('luteal_early');
    expect(getCyclePhaseForDay(21, cycleLength, periodLength)).toBe('luteal_early');
  });

  it('J22-J28 should be luteal_late', () => {
    expect(getCyclePhaseForDay(22, cycleLength, periodLength)).toBe('luteal_late');
    expect(getCyclePhaseForDay(25, cycleLength, periodLength)).toBe('luteal_late');
    expect(getCyclePhaseForDay(28, cycleLength, periodLength)).toBe('luteal_late');
  });
});

describe('getCyclePhaseForDay - 32 day cycle', () => {
  const cycleLength = 32;
  const periodLength = 5;

  it('J1-J5 should be menstrual', () => {
    expect(getCyclePhaseForDay(1, cycleLength, periodLength)).toBe('menstrual');
    expect(getCyclePhaseForDay(5, cycleLength, periodLength)).toBe('menstrual');
  });

  it('follicular extends longer for 32-day cycle (J6-J16)', () => {
    // ovulationDay = 32-14 = 18
    // follicular: periodLength+1 to ovulationDay-2 → J6 to J16
    expect(getCyclePhaseForDay(6, cycleLength, periodLength)).toBe('follicular');
    expect(getCyclePhaseForDay(10, cycleLength, periodLength)).toBe('follicular');
    expect(getCyclePhaseForDay(16, cycleLength, periodLength)).toBe('follicular');
  });

  it('ovulation at J17-J19 (ovulationDay=18)', () => {
    expect(getCyclePhaseForDay(17, cycleLength, periodLength)).toBe('ovulation');
    expect(getCyclePhaseForDay(18, cycleLength, periodLength)).toBe('ovulation');
    expect(getCyclePhaseForDay(19, cycleLength, periodLength)).toBe('ovulation');
  });

  it('luteal early J20-J25', () => {
    expect(getCyclePhaseForDay(20, cycleLength, periodLength)).toBe('luteal_early');
    expect(getCyclePhaseForDay(25, cycleLength, periodLength)).toBe('luteal_early');
  });

  it('luteal late J26-J32', () => {
    expect(getCyclePhaseForDay(26, cycleLength, periodLength)).toBe('luteal_late');
    expect(getCyclePhaseForDay(32, cycleLength, periodLength)).toBe('luteal_late');
  });
});

describe('getCyclePhaseForDate', () => {
  it('should compute phase for a specific date', () => {
    const phase = getCyclePhaseForDate('2025-01-14', '2025-01-01', 28, 5);
    expect(phase).toBe('ovulation');
  });
});

describe('getCyclePhases', () => {
  it('should return 5 phase ranges for a 28-day cycle', () => {
    const phases = getCyclePhases('2025-01-01', 28, 5);
    expect(phases).toHaveLength(5);
    expect(phases[0].phase).toBe('menstrual');
    expect(phases[1].phase).toBe('follicular');
    expect(phases[2].phase).toBe('ovulation');
    expect(phases[3].phase).toBe('luteal_early');
    expect(phases[4].phase).toBe('luteal_late');
  });

  it('menstrual phase should span J1-J5 for periodLength=5', () => {
    const phases = getCyclePhases('2025-01-01', 28, 5);
    expect(phases[0].start.toISOString().slice(0, 10)).toBe('2025-01-01');
    expect(phases[0].end.toISOString().slice(0, 10)).toBe('2025-01-05');
  });
});

describe('predictNextPeriod', () => {
  it('should predict next period correctly', () => {
    const next = predictNextPeriod('2025-01-01', 28);
    expect(next.toISOString().slice(0, 10)).toBe('2025-01-29');
  });

  it('should handle 32-day cycle', () => {
    const next = predictNextPeriod('2025-01-01', 32);
    expect(next.toISOString().slice(0, 10)).toBe('2025-02-02');
  });
});

describe('calculateAverageCycleLength', () => {
  it('should return 28 for fewer than 2 starts', () => {
    expect(calculateAverageCycleLength([])).toBe(28);
    expect(calculateAverageCycleLength([new Date('2025-01-01')])).toBe(28);
  });

  it('should calculate average for 2 starts', () => {
    const starts = [new Date('2025-01-01'), new Date('2025-01-29')];
    expect(calculateAverageCycleLength(starts)).toBe(28);
  });

  it('should calculate average for 3 starts', () => {
    const starts = [
      new Date('2025-01-01'),
      new Date('2025-01-29'), // 28 days
      new Date('2025-02-28'), // 30 days
    ];
    expect(calculateAverageCycleLength(starts)).toBe(29);
  });
});

describe('findCurrentCycleStart', () => {
  it('should find the most recent cycle start before today', () => {
    const starts = [
      new Date('2025-01-01'),
      new Date('2025-01-29'),
      new Date('2025-02-26'),
    ];
    const current = findCurrentCycleStart(starts, '2025-03-01');
    expect(current?.toISOString().slice(0, 10)).toBe('2025-02-26');
  });

  it('should return null when no starts before date', () => {
    const starts = [new Date('2025-06-01')];
    const current = findCurrentCycleStart(starts, '2025-03-01');
    expect(current).toBeNull();
  });
});

describe('getCycleContext', () => {
  it('should return null with no entries', () => {
    expect(getCycleContext([], 28, 5)).toBeNull();
  });

  it('should return full context for entries with period data', () => {
    const entries = [
      makeEntry('2025-01-01', true),
      makeEntry('2025-01-02', true),
      makeEntry('2025-01-03', true),
    ];
    const ctx = getCycleContext(entries, 28, 5, '2025-01-14');
    expect(ctx).not.toBeNull();
    expect(ctx!.phase).toBe('ovulation');
    expect(ctx!.cycleDay).toBe(14);
    expect(ctx!.nextPeriod.toISOString().slice(0, 10)).toBe('2025-01-29');
  });

  it('should handle single cycle with only one start', () => {
    const entries = [makeEntry('2025-01-01', true)];
    const ctx = getCycleContext(entries, 28, 5, '2025-01-25');
    expect(ctx).not.toBeNull();
    expect(ctx!.phase).toBe('luteal_late');
    expect(ctx!.cycleDay).toBe(25);
  });
});

describe('buildPhaseMap', () => {
  it('should build a map of date → phase for a given range', () => {
    const starts = [new Date('2025-01-01')];
    const map = buildPhaseMap(starts, 28, 5, '2025-01-01', '2025-01-28');
    expect(map.size).toBe(28);
    expect(map.get('2025-01-01')?.phase).toBe('menstrual');
    expect(map.get('2025-01-14')?.phase).toBe('ovulation');
    expect(map.get('2025-01-25')?.phase).toBe('luteal_late');
  });

  it('should mark predicted phases beyond the last known start', () => {
    const starts = [new Date('2025-01-01')];
    const map = buildPhaseMap(starts, 28, 5, '2025-01-01', '2025-02-28');
    // Jan 1-28 is the known cycle, Jan 29+ is predicted
    expect(map.get('2025-01-15')?.predicted).toBe(false);
    expect(map.get('2025-01-29')?.predicted).toBe(true);
    expect(map.get('2025-02-01')?.predicted).toBe(true);
  });

  it('should return empty map for no cycle starts', () => {
    const map = buildPhaseMap([], 28, 5, '2025-01-01', '2025-01-28');
    expect(map.size).toBe(0);
  });
});

describe('getCyclePhaseForDay - beyond cycle length', () => {
  it('should return luteal_late for days beyond cycle length (late period)', () => {
    expect(getCyclePhaseForDay(30, 28, 5)).toBe('luteal_late');
    expect(getCyclePhaseForDay(35, 28, 5)).toBe('luteal_late');
  });
});
