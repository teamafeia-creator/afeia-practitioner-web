import { describe, expect, it } from 'vitest';
import sleep from '@/lib/wearables/polar/__fixtures__/sleep-by-date.json';
import nightlyRecharge from '@/lib/wearables/polar/__fixtures__/nightly-recharge-by-date.json';
import continuousHr from '@/lib/wearables/polar/__fixtures__/continuous-heart-rate-by-date.json';
import activity from '@/lib/wearables/polar/__fixtures__/activity-by-date.json';
import flowTotals from '@/lib/wearables/polar/__fixtures__/flow-totals.json';
import { mapContinuousHr, mapDailyActivity, mapNightlyRecharge, mapSleep } from '@/lib/wearables/polar/mappers';
import { totalSleepSeconds } from '@/lib/wearables/polar/mappers/sleep';
import { activityDate } from '@/lib/wearables/polar/mappers/dailyActivity';
import { isoDurationToSeconds, localDay, resolveTimezone, toUtcIso } from '@/lib/wearables/time';

const PARIS = { timezone: 'Europe/Paris' };
const fixtures: Record<string, unknown> = { 'sleep-by-date.json': sleep };

// ---------------------------------------------------------------------------
describe('mapSleep', () => {
  it('fixture → sleep_sessions (UTC, secondes, total = léger + profond + paradoxal + non reconnu)', () => {
    const { rows, warnings } = mapSleep(sleep, PARIS);
    expect(warnings).toEqual([]);
    expect(rows).toEqual([
      {
        night_date: '2026-10-31',
        sleep_start_at: '2026-10-30T22:39:07.000Z',
        sleep_end_at: '2026-10-31T06:19:37.000Z',
        total_sleep_s: 14430 + 5400 + 5400 + 600,
        light_sleep_s: 14430,
        deep_sleep_s: 5400,
        rem_sleep_s: 5400,
        unrecognized_sleep_s: 600,
        interruption_s: 1800,
        sleep_score: 80,
      },
    ]);
  });

  it('cohérence : total_sleep_s = (fin − début) − interruptions, à 60 s près', () => {
    const [row] = mapSleep(sleep, PARIS).rows;
    const inBed = (Date.parse(row.sleep_end_at!) - Date.parse(row.sleep_start_at!)) / 1000;
    expect(Math.abs(inBed - row.interruption_s! - row.total_sleep_s!)).toBeLessThanOrEqual(60);
  });

  it('champs manquants → null, jamais 0 ; pas de total partiel', () => {
    const partial = { date: '2026-10-31', light_sleep: 14430, rem_sleep: 5400 };
    const [row] = mapSleep(partial, PARIS).rows;
    expect(row).toEqual({
      night_date: '2026-10-31',
      sleep_start_at: null,
      sleep_end_at: null,
      total_sleep_s: null, // deep_sleep absent
      light_sleep_s: 14430,
      deep_sleep_s: null,
      rem_sleep_s: 5400,
      unrecognized_sleep_s: null,
      interruption_s: null,
      sleep_score: null,
    });
  });

  it('valeurs à 0 fournies par Polar → 0 (pas null)', () => {
    const [row] = mapSleep({ ...sleep, unrecognized_sleep_stage: 0 }, PARIS).rows;
    expect(row.unrecognized_sleep_s).toBe(0);
  });

  it('total : non reconnu absent compte pour 0, léger/profond/paradoxal absents → null', () => {
    expect(totalSleepSeconds({ light: 100, deep: 50, rem: 25, unrecognized: null })).toBe(175);
    expect(totalSleepSeconds({ light: 100, deep: null, rem: 25, unrecognized: 10 })).toBeNull();
  });

  it('sans date ni date demandée → aucune ligne, avertissement', () => {
    expect(mapSleep({ light_sleep: 1 }, PARIS)).toEqual({ rows: [], warnings: ['sommeil sans date : ignoré'] });
  });

  // Règle total_sleep_s à confirmer contre l'app Polar Flow sur de vraies nuits (fixtures du spike).
  for (const [file, flowTotal] of Object.entries(flowTotals).filter(([k]) => !k.startsWith('_'))) {
    const test = typeof flowTotal === 'number' && fixtures[file] ? it : it.todo;
    test(`total_sleep_s = total affiché dans Polar Flow (${file})`, () => {
      const [row] = mapSleep(fixtures[file], PARIS).rows;
      expect(Math.abs(row.total_sleep_s! - Number(flowTotal))).toBeLessThanOrEqual(60);
    });
  }
});

// ---------------------------------------------------------------------------
describe('mapNightlyRecharge', () => {
  it('fixture → hrv_nightly', () => {
    expect(mapNightlyRecharge(nightlyRecharge, PARIS).rows).toEqual([
      {
        night_date: '2026-10-31',
        hrv_rmssd_avg_ms: 42,
        hr_avg_bpm: 58,
        beat_to_beat_avg_ms: 1034,
        breathing_rate_avg_per_min: 14.1,
        recovery_status: 4,
        ans_charge: 3.2,
        ans_charge_status: 4,
      },
    ]);
  });

  it('champs manquants → null, jamais 0 ; ans_charge à 0 reste 0', () => {
    const [row] = mapNightlyRecharge({ date: '2026-10-31', heart_rate_avg: 58, ans_charge: 0 }, PARIS).rows;
    expect(row).toEqual({
      night_date: '2026-10-31',
      hrv_rmssd_avg_ms: null,
      hr_avg_bpm: 58,
      beat_to_beat_avg_ms: null,
      breathing_rate_avg_per_min: null,
      recovery_status: null,
      ans_charge: 0,
      ans_charge_status: null,
    });
  });
});

// ---------------------------------------------------------------------------
describe('mapContinuousHr', () => {
  it('fixture → hr_samples, heure appareil convertie depuis le fuseau du consultant (UTC+1 en hiver)', () => {
    expect(mapContinuousHr(continuousHr, PARIS).rows).toEqual([
      { recorded_at: '2026-10-30T23:02:08.000Z', hr_bpm: 63 },
      { recorded_at: '2026-10-30T23:07:08.000Z', hr_bpm: 62 },
      { recorded_at: '2026-10-31T07:12:08.000Z', hr_bpm: 71 },
    ]);
  });

  it('autre fuseau du consultant pris en compte', () => {
    const [first] = mapContinuousHr(continuousHr, { timezone: 'America/Montreal' }).rows;
    expect(first.recorded_at).toBe('2026-10-31T04:02:08.000Z');
  });

  it('échantillons incomplets ignorés (jamais de 0 bpm), avertissement', () => {
    const json = {
      date: '2026-10-31',
      heart_rate_samples: [{ heart_rate: 63, sample_time: '00:02:08' }, { sample_time: '00:07:08' }, { heart_rate: 70 }, { heart_rate: 0, sample_time: '00:12:08' }],
    };
    const { rows, warnings } = mapContinuousHr(json, PARIS);
    expect(rows).toEqual([{ recorded_at: '2026-10-30T23:02:08.000Z', hr_bpm: 63 }]);
    expect(warnings[0]).toMatch(/3 échantillon/);
  });

  it('sans échantillons → aucune ligne', () => {
    expect(mapContinuousHr({ date: '2026-10-31' }, PARIS).rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('mapDailyActivity', () => {
  it('fixture → daily_activity (active_s en secondes)', () => {
    expect(mapDailyActivity(activity, { ...PARIS, requestedDate: '2026-10-31' })).toEqual({
      rows: [
        {
          activity_date: '2026-10-31',
          steps: 8823,
          active_calories_kcal: 1500,
          total_calories_kcal: 2500,
          active_s: 3 * 3600 + 11 * 60,
          distance_m: 4590.53,
        },
      ],
      warnings: [],
    });
  });

  it('champs manquants → null, jamais 0', () => {
    const [row] = mapDailyActivity({ start_time: '2026-10-31T00:00:00', steps: 0 }, PARIS).rows;
    expect(row).toEqual({
      activity_date: '2026-10-31',
      steps: 0,
      active_calories_kcal: null,
      total_calories_kcal: null,
      active_s: null,
      distance_m: null,
    });
  });

  it('date : celle de la réponse prime sur la date demandée, avec avertissement si elles divergent', () => {
    const { rows, warnings } = mapDailyActivity(activity, { ...PARIS, requestedDate: '2026-11-01' });
    expect(rows[0].activity_date).toBe('2026-10-31');
    expect(warnings).toEqual(['activité : date de la réponse (2026-10-31) ≠ date demandée (2026-11-01)']);
  });

  it('date : ordre date → samples.date → jour local de start_time → date demandée', () => {
    expect(activityDate({ date: '2026-10-29', samples: { date: '2026-10-30' } }, PARIS).date).toBe('2026-10-29');
    expect(activityDate({ samples: { date: '2026-10-30' }, start_time: '2026-10-31T00:00:00' }, PARIS).date).toBe('2026-10-30');
    expect(activityDate({ start_time: '2026-10-31T08:00:00' }, PARIS).date).toBe('2026-10-31');
    // start_time en UTC : 23:30Z le 30 = 00:30 le 31 à Paris
    expect(activityDate({ start_time: '2026-10-30T23:30:00Z' }, PARIS).date).toBe('2026-10-31');
    expect(activityDate({}, { ...PARIS, requestedDate: '2026-10-28' })).toEqual({ date: '2026-10-28', warning: null });
  });
});

// ---------------------------------------------------------------------------
describe('time', () => {
  it('heure locale → UTC, changements d’heure Europe/Paris', () => {
    expect(toUtcIso('2026-07-01T12:00:00', 'Europe/Paris')).toBe('2026-07-01T10:00:00.000Z'); // été UTC+2
    expect(toUtcIso('2026-12-01T12:00:00', 'Europe/Paris')).toBe('2026-12-01T11:00:00.000Z'); // hiver UTC+1
    expect(toUtcIso('2026-10-25T01:30:00', 'Europe/Paris')).toBe('2026-10-24T23:30:00.000Z'); // avant le passage à l'heure d'hiver
    expect(toUtcIso('2026-10-25T04:00:00', 'Europe/Paris')).toBe('2026-10-25T03:00:00.000Z'); // après
    expect(toUtcIso('2026-03-29T03:30:00', 'Europe/Paris')).toBe('2026-03-29T01:30:00.000Z'); // après le passage à l'heure d'été
  });

  it('décalage fourni → utilisé tel quel, quel que soit le fuseau', () => {
    expect(toUtcIso('2026-10-30T23:39:07+01:00', 'America/Montreal')).toBe('2026-10-30T22:39:07.000Z');
    expect(toUtcIso('2026-10-30T23:39:07Z', 'Europe/Paris')).toBe('2026-10-30T23:39:07.000Z');
    expect(toUtcIso('pas une date', 'Europe/Paris')).toBeNull();
  });

  it('fuseau du consultant invalide ou absent → Europe/Paris', () => {
    expect(resolveTimezone('Mars/Olympus')).toBe('Europe/Paris');
    expect(resolveTimezone(null)).toBe('Europe/Paris');
    expect(resolveTimezone('Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  it('jour local et durées ISO 8601', () => {
    expect(localDay('2026-10-31T00:00:00', 'Europe/Paris')).toBe('2026-10-31');
    expect(isoDurationToSeconds('PT3H11M')).toBe(11460);
    expect(isoDurationToSeconds('PT18H23M30S')).toBe(66210);
    expect(isoDurationToSeconds('P1DT2H')).toBe(93600);
    expect(isoDurationToSeconds('PT')).toBeNull();
    expect(isoDurationToSeconds(undefined)).toBeNull();
  });
});
