import { describe, expect, it } from 'vitest';
import type { WearableSummaryDay } from '../../lib/wearables/summary';
import { Series, addDays, computeInsights, dayRange, habitsVsMeasures, rhythm, type InsightsInput } from '../../lib/wearables/insights';
import { essentialFeel, essentialNight, essentialRhythm, essentialSession, essentialWeek } from '../../lib/wearables/insights/story';

const TODAY = '2026-11-12';
function makeDays(n: number, f: (i: number, date: string) => Partial<WearableSummaryDay>): WearableSummaryDay[] {
  return dayRange(addDays(TODAY, -(n - 1)), TODAY).map((date, i) => ({ date, sleepMin: 400, hrvMs: 40, nightHrBpm: 60, steps: 6000, ...f(i, date) }));
}
function input(days: WearableSummaryDay[], over: Partial<InsightsInput> = {}): InsightsInput {
  return { days, today: TODAY, firstName: 'Amina', lastSessionDate: null, planShares: [], items: [], logs: [], ...over };
}
/** Nuit du jour `day` (réveil) : coucher la veille à `h:m`, lever à `eh:em`, heure de Paris. */
function night(day: string, h: number, m: number, eh: number, em: number) {
  const prev = addDays(day, -1);
  const start = new Date(`${prev}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+01:00`).toISOString();
  const end = new Date(`${day}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00+01:00`).toISOString();
  return { day, startAt: start, endAt: end, totalMin: 420 };
}

describe('rythme', () => {
  it('coucher régulier : médian, nuits à ± 30 min, phrase', () => {
    const recent = dayRange(addDays(TODAY, -14), addDays(TODAY, -1)).map((d, i) => night(d, 23, i % 2 ? 10 : 20, 7, 0));
    const r = rhythm(recent, TODAY);
    expect(r.known).toBe(14);
    expect(r.regular).toBe(14);
    expect(r.medianStartLabel).toBe('23 h 15');
    expect(r.medianEndLabel).toBe('7 h 00');
    expect(r.sentence).toMatch(/^Coucher régulier, vers 23 h 15 : 14 nuits sur 14/);
    expect(essentialRhythm(computeInsights(input(makeDays(40, () => ({})), { recentNights: recent }))).tone).toBe('good');
  });
  it('couchers tardifs le week-end : le dit', () => {
    const recent = dayRange(addDays(TODAY, -14), addDays(TODAY, -1)).map((d) => {
      const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
      // nuit rattachée au réveil : les réveils de samedi et dimanche suivent les soirées de vendredi et samedi
      return wd === 6 || wd === 0 ? night(d, 1, 30, 9, 0) : night(d, 23, 0, 7, 0);
    });
    const r = rhythm(recent, TODAY);
    expect(r.sentence).toContain('week-end');
    expect(r.nights.filter((n) => n.weekend && n.startMin !== null && n.startMin > 300).length).toBe(4);
  });
  it('un coucher après minuit reste sur l’axe 20 h → 12 h', () => {
    const r = rhythm([night(addDays(TODAY, -1), 0, 45, 8, 0)], TODAY);
    expect(r.nights.find((n) => n.startMin !== null)!.startMin).toBe(4 * 60 + 45);
  });
});

describe('l’essentiel de chaque écran', () => {
  it('nuit dans l’habituel', () => {
    const ins = computeInsights(input(makeDays(40, () => ({})), { lastSessionDate: addDays(TODAY, -10) }));
    expect(essentialNight(ins).text).toBe('La nuit dernière : 6 h 40 de sommeil, tout dans son habituel.');
    expect(essentialWeek(ins).text).toBe('Dans son habituel sur 7 nuits.');
  });
  it('nuit courte : la nomme', () => {
    const ins = computeInsights(input(makeDays(40, (_i, d) => ({ sleepMin: d === TODAY ? 300 : 400 })), { lastSessionDate: addDays(TODAY, -10) }));
    const e = essentialNight(ins);
    expect(e.tone).toBe('watch');
    expect(e.text).toMatch(/^La nuit dernière : sommeil 100 min de moins\./);
  });
  it('séance : compte les points', () => {
    const short = new Set([-1, -2, -3, -4].map((k) => addDays(TODAY, k)));
    const ins = computeInsights(input(makeDays(40, (_i, d) => ({ sleepMin: short.has(d) ? 300 : 400 + ((d.charCodeAt(9) % 3) - 1) * 10 })), { lastSessionDate: addDays(TODAY, -12) }));
    const e = essentialSession(ins);
    expect(e.tone).toBe('watch');
    expect(e.text).toMatch(/de moins|en dessous de son habituel|points à aborder/);
  });
  it('ressenti sans journal : rien à signaler', () => {
    const ins = computeInsights(input(makeDays(40, () => ({}))));
    expect(essentialFeel(ins).text).toMatch(/même sens|décalage/);
  });
});

describe('respiration × VFC', () => {
  it('annonce l’effet attendu et l’effet observé sur la VFC', () => {
    const window = dayRange(addDays(TODAY, -14), addDays(TODAY, -1));
    const done = new Set(window.filter((_d, i) => i % 2 === 0));
    const days = makeDays(20, (_i, date) => ({ hrvMs: done.has(addDays(date, -1)) ? 44 : 40 }));
    const logs = window.flatMap((d) => [...(done.has(d) ? [{ itemId: 'resp', date: d, done: true }] : []), { itemId: 'eau', date: d, done: true }]);
    const items = [
      { id: 'resp', label: 'Cohérence cardiaque 5 min', category: 'respiration', freq: { mode: 'daily' } as const },
      { id: 'eau', label: 'Boire 1,5 L', category: 'hydratation', freq: { mode: 'daily' } as const },
    ];
    const r = habitsVsMeasures(input(days, { items, logs }), new Series(days, TODAY));
    const resp = r.rows.find((x) => x.itemId === 'resp')!;
    expect(resp.expected).toContain('VFC plus haute');
    expect(resp.observed).toContain('VFC +4 ms');
    expect(r.rows.find((x) => x.itemId === 'eau')!.expected).toBeUndefined();
  });
});

describe('« Mes nuits » (patient)', () => {
  it('trois thèmes, valeurs et écart en mots, sans point à aborder', async () => {
    const { patientThemes } = await import('../../lib/wearables/patient-overview');
    const ins = computeInsights(input(makeDays(40, (_i, d) => ({ sleepMin: d === TODAY ? 300 : 400 })), { lastSessionDate: addDays(TODAY, -10) }));
    const themes = patientThemes(ins);
    expect(themes.map((t) => t.key)).toEqual(['sleep', 'recovery', 'activity']);
    expect(themes[0].value).toBe('5 h 00');
    expect(themes[0].note).toBe('100 min de moins que d’habitude.');
    expect(themes[0].tone).toBe('watch');
    expect(themes[1].note).toBe('Comme d’habitude.');
    expect(themes[1].secondary?.label).toBe('Cœur la nuit');
    expect(JSON.stringify(themes)).not.toMatch(/aborder|point/i);
  });
});
