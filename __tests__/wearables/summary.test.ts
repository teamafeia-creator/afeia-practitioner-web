import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { averageOf, getWearableSummary } from '@/lib/wearables/summary';

const PATIENT = '00000000-0000-0000-0000-00000000005a';

type Row = { day: string; sleep_min: number | null; hrv_ms: number | null; night_hr_bpm: number | null; steps: number | null };

/** Faux client de session : renvoie les lignes de wearable_daily_summary (logique SQL testée en pgTAP). */
function sessionClient(rows: Row[] | null, error: { message: string; code?: string } | null = null) {
  const rpc = vi.fn(async () => ({ data: rows, error }));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

const day = (d: string, v: Partial<Row> = {}): Row => ({ day: d, sleep_min: null, hrv_ms: null, night_hr_bpm: null, steps: null, ...v });
const range = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));

describe('getWearableSummary', () => {
  it('7 jours : période affichée + précédente en une requête, avec la session', async () => {
    const { client, rpc } = sessionClient(range('2026-10-18', 14).map((d) => day(d)));
    const summary = await getWearableSummary(PATIENT, { days: 7, client, today: '2026-10-31' });
    expect(rpc).toHaveBeenCalledWith('wearable_daily_summary', { p_consultant_id: PATIENT, p_days: 14, p_today: '2026-10-31' });
    expect(summary.days.map((d) => d.date)).toEqual(range('2026-10-25', 7));
  });

  it('trous → null (pas 0) ; moyennes sur les seuls jours renseignés', async () => {
    const rows = [
      ...range('2026-10-18', 7).map((d, i) => day(d, { sleep_min: 400 + i * 10, steps: 5000 })),
      day('2026-10-25', { sleep_min: 420, hrv_ms: 40, night_hr_bpm: 55, steps: 8000 }),
      day('2026-10-26', { sleep_min: 451, steps: 9000 }),
      day('2026-10-27', { steps: 7000 }),
      day('2026-10-28', { sleep_min: 400, steps: 6500 }),
      day('2026-10-29', { hrv_ms: 45, steps: 10000 }),
      day('2026-10-30'),
      day('2026-10-31', { steps: 0 }),
    ];
    const { client } = sessionClient(rows);
    const s = await getWearableSummary(PATIENT, { days: 7, client, today: '2026-10-31' });

    expect(s.days[2]).toEqual({ date: '2026-10-27', sleepMin: null, hrvMs: null, nightHrBpm: null, steps: 7000 });
    expect(s.days[5]).toEqual({ date: '2026-10-30', sleepMin: null, hrvMs: null, nightHrBpm: null, steps: null });
    expect(s.days[6].steps).toBe(0); // 0 réel conservé

    expect(s.partialDay).toBe('2026-10-31');
    expect(s.averages.current).toEqual({
      sleepMin: 423.7, // (420 + 451 + 400) / 3 : les trous ne comptent pas
      hrvMs: 42.5,
      nightHrBpm: 55,
      steps: 8100, // (8000 + 9000 + 7000 + 6500 + 10000) / 5 : journée en cours (0 pas à 12 h) exclue
    });
    expect(s.averages.previous).toEqual({ sleepMin: 430, hrvMs: null, nightHrBpm: null, steps: 5000 });
  });

  it('30 jours → 60 jours demandés, 30 renvoyés', async () => {
    const { client, rpc } = sessionClient(range('2026-09-02', 60).map((d) => day(d, { steps: 1 })));
    const s = await getWearableSummary(PATIENT, { days: 30, client });
    expect(rpc).toHaveBeenCalledWith('wearable_daily_summary', { p_consultant_id: PATIENT, p_days: 60 });
    expect(s.days).toHaveLength(30);
    expect(s.days[0].date).toBe('2026-10-02');
  });

  it('praticien non rattaché (RLS : aucune ligne) → liste vide, moyennes nulles', async () => {
    const { client } = sessionClient([]);
    expect(await getWearableSummary(PATIENT, { days: 7, client })).toEqual({
      days: [],
      partialDay: null,
      averages: {
        current: { sleepMin: null, hrvMs: null, nightHrBpm: null, steps: null },
        previous: { sleepMin: null, hrvMs: null, nightHrBpm: null, steps: null },
      },
    });
  });

  it('lignes non triées → remises dans l’ordre chronologique', async () => {
    const rows = range('2026-10-18', 14).map((d) => day(d)).reverse();
    const { client } = sessionClient(rows);
    const s = await getWearableSummary(PATIENT, { days: 7, client });
    expect(s.days.map((d) => d.date)).toEqual(range('2026-10-25', 7));
  });

  it('erreur Supabase → erreur explicite, sans détail technique', async () => {
    const { client } = sessionClient(null, { message: 'permission denied for function', code: '42501' });
    await expect(getWearableSummary(PATIENT, { days: 7, client })).rejects.toThrow("Lecture des données de l'objet connecté impossible (42501)");
  });
});

describe('journée en cours', () => {
  it('pas exclus de la moyenne courante ; un 0 un autre jour reste compté ; autres métriques inchangées', async () => {
    const rows = [
      ...range('2026-10-18', 7).map((d) => day(d, { steps: 5000 })),
      ...range('2026-10-25', 5).map((d) => day(d, { steps: 6000, sleep_min: 400 })),
      day('2026-10-30', { steps: 0, sleep_min: 400 }),
      day('2026-10-31', { steps: 1200, sleep_min: 470 }),
    ];
    const { client } = sessionClient(rows);
    const s = await getWearableSummary(PATIENT, { days: 7, client, today: '2026-10-31' });
    // (6000 × 5 + 0) / 6 = 5000 : le 31 (en cours) exclu, le 0 du 30 compté. Avec le 31 : 4457,1.
    expect(s.averages.current.steps).toBe(5000);
    expect(s.averages.current.sleepMin).toBe(410); // le sommeil de la nuit du 31 est complet : compté
    expect(s.averages.previous.steps).toBe(5000);
  });
});

describe('averageOf', () => {
  it('ignore les null, garde les 0, arrondit à 0,1', () => {
    expect(averageOf([null, null])).toBeNull();
    expect(averageOf([0, null, 3])).toBe(1.5);
    expect(averageOf([1, 2, 2])).toBe(1.7);
  });
});
