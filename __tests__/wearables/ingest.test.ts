import { beforeEach, describe, expect, it, vi } from 'vitest';
import sleep from '@/lib/wearables/polar/__fixtures__/sleep-by-date.json';
import nightlyRecharge from '@/lib/wearables/polar/__fixtures__/nightly-recharge-by-date.json';
import continuousHr from '@/lib/wearables/polar/__fixtures__/continuous-heart-rate-by-date.json';
import activity from '@/lib/wearables/polar/__fixtures__/activity-by-date.json';
import activityList from '@/lib/wearables/polar/__fixtures__/activity-list-multi.json';

// Faux wearable_raw : upsert PostgREST (merge-duplicates) sur les colonnes onConflict.
type Row = Record<string, unknown> & { id: string };
const table = new Map<string, Row>();
let lastOnConflict: string | undefined;
const upsert = vi.fn(async (rows: Record<string, unknown>[], opts: { onConflict?: string }) => {
  lastOnConflict = opts.onConflict;
  const cols = (opts.onConflict ?? '').split(',');
  for (const row of rows) {
    const key = cols.map((c) => row[c]).join('|');
    const existing = table.get(key);
    table.set(key, { ...(existing ?? { id: `raw-${table.size + 1}` }), ...row } as Row);
  }
  return { error: null };
});
vi.mock('@/lib/server/supabaseAdmin', () => ({
  createSupabaseAdminClient: () => ({ from: (name: string) => (expect(name).toBe('wearable_raw'), { upsert }) }),
}));

const normalize = vi.fn();
vi.mock('@/lib/wearables/normalize', () => ({ normalize: (...a: unknown[]) => normalize(...a) }));

const { ingestPolarResource, extractPolarRecords, IngestError, dataTypeForEvent } = await import('@/lib/wearables/ingest');

const CONSULTANT = '00000000-0000-0000-0000-0000000000b1';
const rows = () => [...table.values()];

beforeEach(() => {
  table.clear();
  upsert.mockClear();
  normalize.mockReset();
  lastOnConflict = undefined;
});

describe('extractPolarRecords : règles par type (fixtures)', () => {
  it.each([
    ['sleep', sleep],
    ['nightly_recharge', nightlyRecharge],
    ['continuous_hr', continuousHr],
  ] as const)('%s : provider_record_id = <utilisateur polar_user>:<date>', (type, fixture) => {
    expect(extractPolarRecords(type, fixture)).toEqual([
      { providerRecordId: '123456:2026-10-31', dataDate: '2026-10-31', payload: fixture },
    ]);
  });

  it("daily_activity : date = jour de start_time, utilisateur fourni par l'appelant", () => {
    expect(extractPolarRecords('daily_activity', activity, { providerUserId: '123456' })).toEqual([
      { providerRecordId: '123456:2026-10-31', dataDate: '2026-10-31', payload: activity },
    ]);
  });

  it('daily_activity : plusieurs enregistrements le même jour → le plus récent (end_time max)', () => {
    const records = extractPolarRecords('daily_activity', activityList, { providerUserId: '123456' });
    expect(records.map((r) => [r.providerRecordId, r.payload.steps])).toEqual([
      ['123456:2026-10-31', 8823],
      ['123456:2026-10-30', 6412],
    ]);
  });

  it('listes AccessLink (nights / recharges) → un enregistrement par nuit', () => {
    const other = { ...sleep, date: '2026-10-30' };
    expect(extractPolarRecords('sleep', { nights: [sleep, other] }).map((r) => r.providerRecordId)).toEqual([
      '123456:2026-10-31',
      '123456:2026-10-30',
    ]);
    expect(extractPolarRecords('nightly_recharge', { recharges: [nightlyRecharge] })).toHaveLength(1);
  });

  it('erreurs explicites : utilisateur ou date introuvable', () => {
    expect(() => extractPolarRecords('daily_activity', activity)).toThrow(IngestError);
    expect(() => extractPolarRecords('sleep', { ...sleep, date: undefined, polar_user: undefined }, { providerUserId: '1' })).toThrow(/date introuvable/);
  });

  it('types d’événements Polar → types de données', () => {
    expect(['SLEEP', 'NIGHTLY_RECHARGE', 'CONTINUOUS_HEART_RATE', 'ACTIVITY_SUMMARY', 'EXERCISE'].map(dataTypeForEvent)).toEqual([
      'sleep', 'nightly_recharge', 'continuous_hr', 'daily_activity', null,
    ]);
  });
});

describe('ingestPolarResource', () => {
  it('upsert sur (provider, data_type, provider_record_id) puis normalisation', async () => {
    const n = await ingestPolarResource('sleep', sleep, CONSULTANT, { sourceEventId: 'ev-1' });
    expect(n).toBe(1);
    expect(lastOnConflict).toBe('provider,data_type,provider_record_id');
    expect(rows()[0]).toMatchObject({
      consultant_id: CONSULTANT,
      provider: 'polar',
      data_type: 'sleep',
      provider_record_id: '123456:2026-10-31',
      data_date: '2026-10-31',
      payload: sleep,
      source_event_id: 'ev-1',
    });
    expect(normalize).toHaveBeenCalledWith('sleep', sleep, CONSULTANT, { dataDate: '2026-10-31', providerRecordId: '123456:2026-10-31' });
  });

  it.each([
    ['sleep', sleep, {}],
    ['nightly_recharge', nightlyRecharge, {}],
    ['continuous_hr', continuousHr, {}],
    ['daily_activity', activity, { providerUserId: '123456' }],
  ] as const)('%s : ingérer deux fois la même fixture = une seule ligne', async (type, fixture, opts) => {
    await ingestPolarResource(type, fixture, CONSULTANT, { ...opts, now: new Date('2026-11-01T08:00:00Z') });
    await ingestPolarResource(type, fixture, CONSULTANT, { ...opts, now: new Date('2026-11-01T09:00:00Z') });
    expect(rows()).toHaveLength(1);
    expect(rows()[0].fetched_at).toBe('2026-11-01T09:00:00.000Z'); // fetched_at mis à jour
  });

  it('une version plus récente remplace l’ancienne (même ligne, nouveau payload)', async () => {
    await ingestPolarResource('sleep', sleep, CONSULTANT, { now: new Date('2026-11-01T08:00:00Z') });
    const id = rows()[0].id;
    const v2 = { ...sleep, sleep_score: 86, deep_sleep: 6000 };
    await ingestPolarResource('sleep', v2, CONSULTANT, { now: new Date('2026-11-01T12:00:00Z') });
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ id, payload: v2, fetched_at: '2026-11-01T12:00:00.000Z' });
    expect(normalize).toHaveBeenLastCalledWith('sleep', v2, CONSULTANT, expect.anything());
  });

  it('activité : un résumé partiel puis le résumé complet du jour → une ligne, la version complète', async () => {
    const [partial, full] = activityList;
    await ingestPolarResource('daily_activity', partial, CONSULTANT, { providerUserId: '123456' });
    await ingestPolarResource('daily_activity', full, CONSULTANT, { providerUserId: '123456' });
    expect(rows()).toHaveLength(1);
    expect((rows()[0].payload as { steps: number }).steps).toBe(8823);
  });

  it('réponse vide → rien écrit', async () => {
    expect(await ingestPolarResource('sleep', { nights: [] }, CONSULTANT)).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });
});
