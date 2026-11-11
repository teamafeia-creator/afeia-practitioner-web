import { describe, expect, it } from 'vitest';
import type { WearableSummaryDay } from '../../lib/wearables/summary';
import {
  Series,
  addDays,
  beforeAfter,
  buildRecapText,
  computeInsights,
  computeRecap,
  dayRange,
  habitsVsMeasures,
  pickPoints,
  pointsToDiscuss,
  sinceWindow,
  type InsightsInput,
  type Point,
} from '../../lib/wearables/insights';

const TODAY = '2026-11-12';

/** Série de `n` jours jusqu'à aujourd'hui ; `f(i, date)` renvoie les valeurs du jour. */
function makeDays(n: number, f: (i: number, date: string) => Partial<WearableSummaryDay>): WearableSummaryDay[] {
  return dayRange(addDays(TODAY, -(n - 1)), TODAY).map((date, i) => ({ date, sleepMin: 400, hrvMs: 40, nightHrBpm: 60, steps: 6000, ...f(i, date) }));
}

/** Petite variation déterministe autour d'une valeur. */
const wobble = (i: number, amp: number) => [0, 1, -1, 2, -2, 1, 0][i % 7] * amp;

function input(days: WearableSummaryDay[], over: Partial<InsightsInput> = {}): InsightsInput {
  return { days, today: TODAY, firstName: 'Amina', lastSessionDate: null, planShares: [], items: [], logs: [], ...over };
}

describe('exclusions', () => {
  it('écarte les nuits de moins de 3 h pour toutes les mesures de la nuit, et les pas du jour', () => {
    const days = makeDays(3, (i) => (i === 0 ? { sleepMin: 150 } : {}));
    const s = new Series(days, TODAY);
    expect(s.value('hrv', days[0].date)).toBeNull();
    expect(s.value('sleep', days[1].date)).toBe(400);
    expect(s.value('steps', TODAY)).toBeNull();
    expect(s.nightValid(days[0].date)).toBe(false);
  });
});

describe('périodes', () => {
  it('« depuis » commence le lendemain, « avant » a la même durée, le jour de référence est exclu', () => {
    const { after, before } = sinceWindow('2026-11-01', TODAY);
    expect(after[0]).toBe('2026-11-02');
    expect(after[after.length - 1]).toBe('2026-11-11');
    expect(before.length).toBe(after.length);
    expect(before[before.length - 1]).toBe('2026-10-31');
  });
  it('« depuis » est plafonné à 28 jours', () => {
    expect(sinceWindow('2026-09-01', TODAY).after.length).toBe(28);
  });
});

describe('points à aborder', () => {
  const session = '2026-10-25';
  it('repère un changement net depuis la séance (double seuil) et un écart en cours', () => {
    const days = makeDays(70, (i, date) => ({
      sleepMin: 380 + wobble(i, 5) + (date > session ? 45 : 0),
      hrvMs: 40 + wobble(i, 1),
      nightHrBpm: 60 + wobble(i, 1),
    }));
    const r = pointsToDiscuss(input(days, { lastSessionDate: session }), new Series(days, TODAY));
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    const sleep = r.points.find((p) => p.metric === 'sleep')!;
    expect(sleep.kind).toBe('fav');
    expect(sleep.text).toMatch(/^Amina dort 45 min de plus/);
    expect(r.points.filter((p) => p.metric === 'sleep')).toHaveLength(1);
  });
  it('n’affiche rien sous les seuils', () => {
    const days = makeDays(70, (i, date) => ({ sleepMin: 400 + wobble(i, 12) + (date > session ? 10 : 0) }));
    const r = pointsToDiscuss(input(days, { lastSessionDate: session }), new Series(days, TODAY));
    expect(r.status === 'ok' && r.candidates).toEqual([]);
  });
  it('demande 7 nuits mesurées depuis la séance', () => {
    const days = makeDays(40, () => ({}));
    const r = pointsToDiscuss(input(days, { lastSessionDate: '2026-11-08' }), new Series(days, TODAY));
    expect(r).toMatchObject({ status: 'not_enough', nights: 3, needed: 7 });
  });
  it('signale l’objet non porté 3 nuits ou plus', () => {
    const off = new Set(['2026-11-01', '2026-11-03', '2026-11-05']);
    const days = makeDays(70, (_i, date) => (off.has(date) ? { sleepMin: null, hrvMs: null, nightHrBpm: null } : {}));
    const r = pointsToDiscuss(input(days, { lastSessionDate: session }), new Series(days, TODAY));
    expect(r.status === 'ok' && r.points.map((p) => p.id)).toContain('wear');
  });
  it('garde 3 points au maximum, un par mesure, favorable puis attention puis données', () => {
    const p = (id: string, metric: Point['metric'], kind: Point['kind'], score: number): Point => ({ id, metric, kind, score, text: id, how: '' });
    const picked = pickPoints([p('a', 'sleep', 'fav', 1), p('b', 'sleep', 'fav', 3), p('c', 'hr', 'att', 1), p('d', 'wear', 'data', 0), p('e', 'hrv', 'fav', 2)]);
    expect(picked.map((x) => x.id)).toEqual(['b', 'c', 'd']);
  });
});

describe('avant / après le conseillancier', () => {
  it('compare deux périodes de même durée et applique le double seuil', () => {
    const share = '2026-10-29';
    const days = makeDays(60, (i, date) => ({ hrvMs: 38 + wobble(i, 1) + (date > share ? 5 : 0), steps: 6000 + wobble(i, 300) + (date > share ? 400 : 0) }));
    const r = beforeAfter(input(days, { planShares: ['2026-09-01', share] }), new Series(days, TODAY));
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.shareDate).toBe(share);
    const hrv = r.rows.find((x) => x.metric === 'hrv')!;
    expect(hrv.verdict).toBe('fav');
    expect(hrv.sentence).toBe('Sa VFC la nuit est plus haute de 5 ms.');
    const steps = r.rows.find((x) => x.metric === 'steps')!;
    expect(steps.verdict).toBe('flat');
    expect(steps.sentence).toBe('Un peu plus, dans ses variations habituelles.');
    expect(hrv.nightsBefore).toBe(hrv.nightsAfter);
  });
  it('sans conseillancier partagé', () => {
    expect(beforeAfter(input(makeDays(10, () => ({}))), new Series([], TODAY))).toEqual({ status: 'no_plan' });
  });
});

describe('conseils suivis × mesures', () => {
  const daily = { mode: 'daily' } as const;
  it('compare le jour J à la nuit J+1, sur les seuls jours avec au moins une coche', () => {
    const window = dayRange(addDays(TODAY, -14), addDays(TODAY, -1));
    const tisane = new Set(window.filter((_d, i) => i % 2 === 0));
    // La nuit qui suit un jour « tisane » a une VFC plus haute de 6 ms.
    const days = makeDays(20, (_i, date) => ({ hrvMs: tisane.has(addDays(date, -1)) ? 46 : 40 }));
    const logs = window.flatMap((d) => [
      ...(tisane.has(d) ? [{ itemId: 'tisane', date: d, done: true }] : []),
      { itemId: 'eau', date: d, done: true },
    ]);
    const items = [
      { id: 'tisane', label: 'Tisane le soir', category: 'phytotherapie', freq: daily },
      { id: 'eau', label: 'Boire 1,5 L', category: 'hydratation', freq: daily },
      { id: 'cure', label: 'Cure', category: 'complement', freq: { mode: 'custom', count: 1, unit: 'month' } as const },
    ];
    const r = habitsVsMeasures(input(days, { items, logs }), new Series(days, TODAY));
    expect(r.counted).toBe(14);
    const t = r.rows.find((x) => x.itemId === 'tisane')!;
    expect(t.metric).toBe('hrv');
    expect(t.effect).toBe('VFC plus haute la nuit qui suit (+6 ms).');
    expect(r.rows.find((x) => x.itemId === 'eau')!.effect).toBe('Fait tous les jours : rien à comparer.');
    expect(r.rows.find((x) => x.itemId === 'cure')!.eligible).toBe(false);
  });
  it('exige 4 jours de chaque côté', () => {
    const window = dayRange(addDays(TODAY, -14), addDays(TODAY, -1));
    const logs = window.map((d, i) => ({ itemId: i < 3 ? 'a' : 'b', date: d, done: true }));
    const items = [{ id: 'a', label: 'A', category: 'autre', freq: daily }];
    const days = makeDays(20, () => ({}));
    const r = habitsVsMeasures(input(days, { items, logs }), new Series(days, TODAY));
    expect(r.rows[0].effect).toBe('Pas encore assez de jours pour comparer.');
  });
});

describe('récap', () => {
  it('propose les points positifs, en coche 3 au maximum, sans chiffre dans le texte', () => {
    const days = makeDays(50, (i) => (i >= 50 - 8 ? { sleepMin: 440, hrvMs: 46, nightHrBpm: 55, steps: 8000 } : { sleepMin: 400 + wobble(i, 5), hrvMs: 40 + wobble(i, 1), nightHrBpm: 60 + wobble(i, 1), steps: 6000 + wobble(i, 200) }));
    const r = computeRecap({ days, today: TODAY, items: [], logs: [] }, '1w');
    expect(r.status).toBe('ok');
    expect(r.options.filter((o) => o.checked)).toHaveLength(3);
    expect(r.options.map((o) => o.id).sort()).toEqual(['hr', 'hrv', 'move', 'sleepLong']);
    const { text } = buildRecapText({ firstName: 'Amina', practitionerFirstName: 'Claire', frequency: '1w', points: r.options.filter((o) => o.checked).map((o) => o.id) });
    expect(text.startsWith('Bonjour Amina,')).toBe(true);
    expect(text).toMatch(/Belle semaine,\nClaire$/);
    expect(text).not.toMatch(/\d/);
  });
  it('moins de 60 % de nuits mesurées : seulement le rappel de porter l’objet', () => {
    const days = makeDays(40, (i) => (i >= 40 - 8 && i % 2 === 0 ? { sleepMin: null, hrvMs: null, nightHrBpm: null } : {}));
    const r = computeRecap({ days, today: TODAY, items: [], logs: [] }, '1w');
    expect(r.status).toBe('not_enough');
    expect(r.options.map((o) => o.id)).toEqual(['wear']);
  });
  it('propose le rappel décoché à partir de 30 % de nuits manquantes', () => {
    const miss = new Set([1, 3, 5, 7, 9].map((n) => addDays(TODAY, -n)));
    const days = makeDays(50, (i, date) => (miss.has(date) ? { sleepMin: null, hrvMs: null, nightHrBpm: null } : i >= 35 ? { steps: 9000 } : { steps: 6000 + wobble(i, 200) }));
    const r = computeRecap({ days, today: TODAY, items: [], logs: [] }, '2w');
    expect(r.status).toBe('ok');
    expect(r.options.find((o) => o.id === 'wear')).toMatchObject({ checked: false });
  });
  it('rien de positif : aucun brouillon', () => {
    const days = makeDays(40, (i) => (i >= 32 ? { sleepMin: 360, steps: 5000 } : { sleepMin: 400 + wobble(i, 10), steps: 6000 + wobble(i, 300) }));
    const r = computeRecap({ days, today: TODAY, items: [], logs: [] }, '1w');
    expect(r.status).toBe('nothing');
  });
  it('alterne les variantes de phrase', () => {
    const a = buildRecapText({ firstName: 'A', practitionerFirstName: 'C', frequency: '1d', points: ['move'] });
    const b = buildRecapText({ firstName: 'A', practitionerFirstName: 'C', frequency: '1d', points: ['move'], lastVariants: a.variants });
    expect(a.text).not.toBe(b.text);
    expect(a.text).toMatch(/hier/);
  });
});

describe('computeInsights', () => {
  it('calcule les 4 tuiles de la semaine', () => {
    const days = makeDays(50, (i) => ({ sleepMin: i >= 42 ? 450 : 400 + wobble(i, 5) }));
    const r = computeInsights(input(days, { lastSessionDate: '2026-10-28' }));
    expect(r.tiles).toHaveLength(4);
    expect(r.tiles[0]).toMatchObject({ metric: 'sleep', tone: 'good' });
    expect(r.tiles[0].delta).toMatch(/^▲ \d+ min de plus$/);
  });
});
