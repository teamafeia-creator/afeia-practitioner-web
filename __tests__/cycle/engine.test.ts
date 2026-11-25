import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildCycles,
  compareToUsual,
  computeDurations,
  computeOverview,
  dayInfo,
  feelsByPhase,
  phaseForDay,
  previewPeriodNote,
  trackingMode,
} from '@/lib/cycle/engine';
import type { CycleEntry, CycleProfile } from '@/lib/types';

function entry(date: string, over: Partial<CycleEntry> = {}): CycleEntry {
  return {
    id: date,
    consultant_id: 'c1',
    date,
    is_period: false,
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
    created_at: date,
    ...over,
  };
}

/**
 * 3 cycles complets de 28 j (règles 5 j) + le cycle en cours commencé le 24 oct., aujourd'hui = 4 nov. (J12).
 * Habitudes : migraine J1-J2, crampes J1-J3, fatigue J3-J4, douleur modérée J1-J4.
 */
function fixture(opts: { migraineDays?: number[]; strongPain?: boolean; extraFatigue?: boolean } = {}) {
  const starts = ['2026-08-07', '2026-09-04', '2026-10-02', '2026-10-24'];
  const today = '2026-11-04';
  const entries: CycleEntry[] = [];
  starts.forEach((start, i) => {
    const last = i === starts.length - 1;
    const len = last ? 12 : 28;
    for (let d = 0; d < len; d++) {
      const date = addDays(start, d);
      const cd = d + 1;
      const period = cd <= 5;
      const migraine = last ? (opts.migraineDays ?? [1, 2]).includes(cd) : cd <= 2;
      entries.push(
        entry(date, {
          is_period: period,
          flow_intensity: period ? (cd === 2 || cd === 3 ? 'heavy' : 'medium') : null,
          period_pain: period && cd <= 4 ? (last && opts.strongPain ? 8 : 5) : 0,
          symptom_headache: migraine,
          symptom_cramps: cd <= 3,
          symptom_fatigue: cd === 3 || cd === 4 || (last && opts.extraFatigue === true && cd >= 6),
          temperature: 36.3,
        })
      );
    }
  });
  return { entries, today };
}

const profile = (over: Partial<CycleProfile> = {}): CycleProfile => ({
  id: 'p',
  consultant_id: 'c1',
  practitioner_id: 'pr',
  is_tracking: true,
  average_cycle_length: 28,
  average_period_length: 5,
  cycle_regularity: 'regular',
  contraception: 'aucune',
  notes: null,
  created_at: '2026-08-01',
  updated_at: '2026-08-01',
  ...over,
});

describe('Cycles et phases', () => {
  it('découpe les cycles : un nouveau cycle commence après 14 jours sans règles', () => {
    const { entries } = fixture();
    const cycles = buildCycles(entries);
    expect(cycles.map((c) => c.start)).toEqual(['2026-08-07', '2026-09-04', '2026-10-02', '2026-10-24']);
    expect(cycles.map((c) => c.length)).toEqual([28, 28, 22, null]);
    expect(cycles.every((c) => c.periodDays === 5)).toBe(true);
  });

  it('des règles notées 10 jours après les précédentes prolongent les mêmes règles', () => {
    const entries = [entry('2026-10-01', { is_period: true }), entry('2026-10-11', { is_period: true }), entry('2026-10-30', { is_period: true })];
    expect(buildCycles(entries).map((c) => c.start)).toEqual(['2026-10-01', '2026-10-30']);
  });

  it('calcule les durées sur les 3 derniers cycles complets, sauf saisie à la main', () => {
    const { entries } = fixture();
    const cycles = buildCycles(entries);
    const d = computeDurations(cycles, profile());
    expect(d.cycleSamples).toEqual([22, 28, 28]);
    expect(d.cycleLength).toBe(26);
    expect(d.periodLength).toBe(5);
    expect(d.regularity).toBe('somewhat_irregular');
    const manual = computeDurations(cycles, profile({ cycle_length_manual: true, average_cycle_length: 30 }));
    expect(manual.cycleLength).toBe(30);
  });

  it('phases sur 28 jours : règles ≤ 5, ovulation J13-J15, lutéale ensuite', () => {
    expect(phaseForDay(3, 28, 5)).toBe('menstrual');
    expect(phaseForDay(8, 28, 5)).toBe('follicular');
    expect(phaseForDay(14, 28, 5)).toBe('ovulation');
    expect(phaseForDay(20, 28, 5)).toBe('luteal');
  });

  it('un jour de règles prévues mais non déclarées est estimé ; les jours futurs sont estimés', () => {
    const { entries, today } = fixture();
    const cycles = buildCycles(entries);
    const d = computeDurations(cycles, profile({ cycle_length_manual: true, average_cycle_length: 28 }));
    const byDate = new Map(entries.map((e) => [e.date, e]));
    expect(dayInfo('2026-10-24', cycles, d, byDate, today)).toMatchObject({ cycleDay: 1, phase: 'menstrual', estimated: false });
    expect(dayInfo('2026-11-04', cycles, d, byDate, today)).toMatchObject({ cycleDay: 12, phase: 'follicular', estimated: false });
    expect(dayInfo('2026-11-21', cycles, d, byDate, today)).toMatchObject({ cycleDay: 1, phase: 'menstrual', estimated: true });
    expect(dayInfo('2026-11-30', cycles, d, byDate, today)).toMatchObject({ cycleDay: 10, phase: 'follicular', estimated: true });
  });
});

describe('À surveiller en priorité (écarts à l’habitude)', () => {
  it('rien ne ressort quand le cycle en cours suit les habitudes', () => {
    const { entries, today } = fixture();
    const cycles = buildCycles(entries);
    const c = compareToUsual(entries, cycles, computeDurations(cycles, profile()), today)!;
    expect(c.possible).toBe(true);
    expect(c.cycleDay).toBe(12);
    expect(c.flags).toEqual([]);
    expect(c.okNames).toContain('durée des règles');
    expect(c.okNames).toContain('maux de tête');
    expect(c.lowData).toBe(false);
  });

  it('un symptôme 3 fois plus fréquent ressort avec son écart ; une douleur forte jamais notée ressort dès 2 jours', () => {
    const { entries, today } = fixture({ migraineDays: [1, 2, 3, 4, 5, 6], strongPain: true });
    const cycles = buildCycles(entries);
    const c = compareToUsual(entries, cycles, computeDurations(cycles, profile()), today)!;
    const labels = c.flags.map((f) => f.label);
    expect(labels).toContain('Maux de tête');
    expect(labels).toContain('Douleur forte');
    const migraine = c.flags.find((f) => f.label === 'Maux de tête')!;
    expect(migraine.value).toBe('6 j');
    expect(migraine.gap).toBe('+4 j');
    expect(migraine.usual).toBe('d’habitude 2 j');
    const strong = c.flags.find((f) => f.label === 'Douleur forte')!;
    expect(strong.usual).toBe('presque jamais noté avant');
    expect(strong.value).toBe('4 j');
  });

  it('pas de comparaison avec moins de 2 cycles précédents', () => {
    const { entries, today } = fixture();
    const recent = entries.filter((e) => e.date >= '2026-10-02');
    const cycles = buildCycles(recent);
    const c = compareToUsual(recent, cycles, computeDurations(cycles, profile()), today)!;
    expect(c.possible).toBe(false);
    expect(c.previousCycles).toBe(1);
  });

  it('signale des règles en retard de 5 jours ou plus', () => {
    const { entries } = fixture();
    const cycles = buildCycles(entries);
    const d = computeDurations(cycles, profile({ cycle_length_manual: true, average_cycle_length: 28 }));
    const c = compareToUsual(entries, cycles, d, '2026-11-26')!; // J34
    expect(c.lateDays).toBe(6);
    expect(c.flags.some((f) => f.label === 'Durée du cycle' && f.gap === '+6 j')).toBe(true);
  });
});

describe('Ressentis selon la phase', () => {
  it('compte, pour chaque ressenti, les cycles où il est noté dans chaque phase et repère le point saillant', () => {
    const { entries, today } = fixture();
    const cycles = buildCycles(entries);
    const r = feelsByPhase(entries, cycles, computeDurations(cycles, profile()), today);
    expect(r.cyclesUsed).toBe(3);
    const migraine = r.rows.find((x) => x.symptom === 'headache')!;
    expect(migraine.counts).toEqual([3, 0, 0, 0]);
    expect(r.highlight?.symptom).toBe('headache');
    expect(r.highlight?.sentence).toMatch(/maux de tête sur \d+ sont notées pendant les 2 premiers jours des règles/);
  });
});

describe('Vue d’ensemble et états', () => {
  it('états : non activé, en attente, actif, désactivé avec données conservées', () => {
    const { entries } = fixture();
    const cycles = buildCycles(entries);
    expect(trackingMode(null, [])).toBe('off');
    expect(trackingMode(profile({ is_tracking: false }), cycles)).toBe('off');
    expect(trackingMode(profile({ is_tracking: false, tracking_paused_at: '2026-11-04' }), cycles)).toBe('paused');
    expect(trackingMode(profile(), [])).toBe('waiting');
    expect(trackingMode(profile(), cycles)).toBe('on');
  });

  it('résume le cycle en cours : jour, phase, prochaines règles', () => {
    const { entries, today } = fixture();
    const o = computeOverview(entries, profile({ cycle_length_manual: true, average_cycle_length: 28 }), today);
    expect(o.mode).toBe('on');
    expect(o.current).toEqual({ cycleDay: 12, phase: 'follicular', estimated: false });
    expect(o.nextPeriod).toEqual({ date: '2026-11-21', inDays: 17 });
  });

  it('une grossesse suspend les phases et les estimations, le calendrier reste', () => {
    const { entries, today } = fixture();
    const o = computeOverview(entries, profile({ situation: 'grossesse' }), today);
    expect(o.estimatesPaused).toBe(true);
    expect(o.current).toBeNull();
    expect(o.comparison).toBeNull();
  });

  it('aperçu d’une date de règles notée par le praticien', () => {
    const { entries } = fixture();
    const cycles = buildCycles(entries);
    expect(previewPeriodNote('2026-11-02', null, cycles, null)).toMatch(/^Moins de 14 jours après le début des règles précédentes \(24 oct\.\)/);
    expect(previewPeriodNote('2026-11-21', '2026-11-25', cycles, null)).toBe('Nouveau cycle à partir du 21 nov. · le cycle précédent aura duré 28 jours · règles de 5 jours. Les phases suivantes seront recalculées.');
    expect(previewPeriodNote('2026-10-23', null, cycles, '2026-10-24')).toBe('Le cycle qui commençait le 24 oct. commencera le 23 oct. Les phases et l’historique seront recalculés.');
  });
});
