import { beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import sleep from '@/lib/wearables/polar/__fixtures__/sleep-by-date.json';
import nightlyRecharge from '@/lib/wearables/polar/__fixtures__/nightly-recharge-by-date.json';
import continuousHr from '@/lib/wearables/polar/__fixtures__/continuous-heart-rate-by-date.json';
import activity from '@/lib/wearables/polar/__fixtures__/activity-by-date.json';
import { writeNormalized } from '@/lib/wearables/normalized';

// Faux client : upsert PostgREST sur les colonnes onConflict, une table par nom.
const tables = new Map<string, Map<string, Record<string, unknown>>>();
const client = {
  from: (name: string) => ({
    upsert: async (rows: Record<string, unknown>[], opts: { onConflict: string }) => {
      const t = tables.get(name) ?? new Map();
      tables.set(name, t);
      for (const r of rows) t.set(opts.onConflict.split(',').map((c) => r[c]).join('|'), { ...t.get(opts.onConflict.split(',').map((c) => r[c]).join('|')), ...r });
      return { error: null };
    },
  }),
} as unknown as SupabaseClient;

const CONSULTANT = '00000000-0000-0000-0000-0000000000b1';
const RAW = [
  { type: 'sleep', payload: sleep, id: 'raw-1' },
  { type: 'nightly_recharge', payload: nightlyRecharge, id: 'raw-2' },
  { type: 'continuous_hr', payload: continuousHr, id: 'raw-3' },
  { type: 'daily_activity', payload: activity, id: 'raw-4' },
] as const;

async function rebuild() {
  for (const r of RAW) {
    await writeNormalized(client, {
      type: r.type, provider: 'polar', payload: r.payload, consultantId: CONSULTANT, sourceRawId: r.id, timezone: null, requestedDate: '2026-10-31',
    });
  }
}
const sizes = () => Object.fromEntries([...tables].map(([k, v]) => [k, v.size]));

beforeEach(() => tables.clear());

describe('writeNormalized', () => {
  it('une ligne par enregistrement journalier, une par échantillon de FC, avec consultant/provider/source', async () => {
    await rebuild();
    expect(sizes()).toEqual({ sleep_sessions: 1, hrv_nightly: 1, hr_samples: 3, daily_activity: 1 });
    expect([...tables.get('sleep_sessions')!.values()][0]).toMatchObject({ consultant_id: CONSULTANT, provider: 'polar', source_raw_id: 'raw-1', night_date: '2026-10-31' });
  });

  it('reconstruction rejouée deux fois → mêmes lignes, aucun doublon', async () => {
    await rebuild();
    const first = JSON.stringify([...tables].map(([k, v]) => [k, [...v]]));
    await rebuild();
    expect(JSON.stringify([...tables].map(([k, v]) => [k, [...v]]))).toBe(first);
  });

  it('fuseau absent du consultant → Europe/Paris', async () => {
    await rebuild();
    expect([...tables.get('hr_samples')!.values()][0].recorded_at).toBe('2026-10-30T23:02:08.000Z');
  });
});
