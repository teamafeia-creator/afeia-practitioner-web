import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.POLAR_CLIENT_ID = 'client-id-test';
process.env.POLAR_CLIENT_SECRET = 'client-secret-test';
process.env.POLAR_REDIRECT_URI = 'https://afeia.fr/api/wearables/polar/callback';
process.env.POLAR_STATE_SECRET = 'state-secret-for-tests-0123456789abcdef';

const TOKEN = 'polar-access-token-SECRET';
const TODAY = '2026-11-01';
const CONSULTANT = '00000000-0000-0000-0000-0000000000b1';

// --- Connexion et avancement (mêmes règles que wearable_claim_backfill, testée en pgTAP) ---
type Conn = { status: 'pending' | 'running' | 'done' | 'failed'; cursor: string | null; days: number };
let conn: Conn;
const progress: { status: string; cursor?: string | null }[] = [];
const markError = vi.fn();
const markSynced = vi.fn();
let token: string | null = TOKEN;
let providerUserId = '475';
vi.mock('@/lib/wearables/connections', () => ({
  claimBackfill: async (id: string) => {
    if (conn.status !== 'pending' && conn.status !== 'running') return null;
    conn.status = 'running';
    return { connectionId: id, consultantId: CONSULTANT, providerUserId, cursor: conn.cursor, days: conn.days };
  },
  saveBackfillProgress: async (_id: string, p: { status: Conn['status']; cursor?: string | null }) => {
    progress.push(p);
    conn.status = p.status;
    if (p.cursor !== undefined) conn.cursor = p.cursor;
  },
  getAccessToken: async () => token,
  markError: (...a: unknown[]) => markError(...a),
  markSynced: (...a: unknown[]) => markSynced(...a),
  sanitizeErrorMessage: (m: string) => m,
}));

// --- wearable_raw simulée : upsert sur (data_type, provider_record_id) -------------------
const raw = new Map<string, unknown>();
const ingest = vi.fn(async (type: string, json: unknown, _c: string, opts: { date: string | null }) => {
  const items = Array.isArray(json)
    ? json
    : (json as { nights?: unknown[]; recharges?: unknown[] }).nights ?? (json as { recharges?: unknown[] }).recharges ?? [json];
  for (const item of items as { date?: string; start_time?: string }[]) {
    raw.set(`${type}|475:${item.date ?? item.start_time?.slice(0, 10) ?? opts.date}`, item);
  }
  return items.length;
});
vi.mock('@/lib/wearables/ingest', () => ({ ingestPolarResource: (...a: Parameters<typeof ingest>) => ingest(...a) }));
vi.mock('@/lib/wearables/polar/process-event', () => ({ REVOKED_MESSAGE: 'Accès révoqué côté Polar, reconnexion nécessaire' }));

// --- Polar simulé ------------------------------------------------------------------------
const addDays = (s: string, n: number) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
function range(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
let override: ((url: URL) => Response | null) | null = null;
const requests: URL[] = [];
const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  requests.push(url);
  expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  const o = override?.(url);
  if (o) return o;
  const p = url.pathname;
  if (p === '/v3/users/activities') {
    const days = range(url.searchParams.get('from')!, url.searchParams.get('to')!);
    return new Response(JSON.stringify(days.map((d) => ({ start_time: `${d}T00:00:00`, steps: 1000 }))));
  }
  if (p === '/v3/users/sleep') return new Response(JSON.stringify({ nights: range(addDays(TODAY, -27), TODAY).map((date) => ({ date })) }));
  if (p === '/v3/users/nightly-recharge') return new Response(JSON.stringify({ recharges: range(addDays(TODAY, -27), TODAY).map((date) => ({ date })) }));
  const hr = p.match(/^\/v3\/users\/continuous-heart-rate\/(\d{4}-\d{2}-\d{2})$/);
  if (hr) return new Response(JSON.stringify({ date: hr[1], heart_rate_samples: [] }));
  return new Response('', { status: 404 });
});

const { runBackfill, planChunks, clipToDepth, periodStart } = await import('@/lib/wearables/polar/backfill');

const activityRequests = () => requests.filter((u) => u.pathname === '/v3/users/activities');
const span = (u: URL) => range(u.searchParams.get('from')!, u.searchParams.get('to')!).length;

beforeEach(() => {
  conn = { status: 'pending', cursor: null, days: 90 };
  progress.length = 0;
  raw.clear();
  ingest.mockClear();
  markError.mockReset();
  markSynced.mockReset();
  token = TOKEN;
  override = null;
  requests.length = 0;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('planChunks / clipToDepth', () => {
  it('90 jours → tranches de 28 jours max, du plus récent au plus ancien, contiguës', () => {
    const chunks = planChunks(TODAY, 90, null);
    expect(chunks).toEqual([
      { from: '2026-10-05', to: '2026-11-01' },
      { from: '2026-09-07', to: '2026-10-04' },
      { from: '2026-08-10', to: '2026-09-06' },
      { from: '2026-08-04', to: '2026-08-09' },
    ]);
    expect(Math.max(...chunks.map((c) => range(c.from, c.to).length))).toBeLessThanOrEqual(28);
    expect(chunks.reduce((n, c) => n + range(c.from, c.to).length, 0)).toBe(90);
    expect(periodStart(TODAY, 90)).toBe('2026-08-04');
  });

  it('reprise : la tranche suivante finit la veille du curseur', () => {
    expect(planChunks(TODAY, 90, '2026-09-07')[0]).toEqual({ from: '2026-08-10', to: '2026-09-06' });
    expect(planChunks(TODAY, 90, '2026-08-04')).toEqual([]);
  });

  it('profondeur par type : activité 365 j, sommeil / Nightly Recharge / FC continue 28 j', () => {
    const old = { from: '2026-09-07', to: '2026-10-04' };
    expect(clipToDepth(old, 'daily_activity', TODAY)).toEqual(old);
    expect(clipToDepth(old, 'sleep', TODAY)).toBeNull();
    expect(clipToDepth({ from: '2026-10-05', to: TODAY }, 'continuous_hr', TODAY)).toEqual({ from: '2026-10-05', to: TODAY });
  });
});

describe('runBackfill', () => {
  it('connexion de démonstration (« seed-… ») → skipped, aucun appel Polar, rien enregistré', async () => {
    providerUserId = 'seed-demo-1';
    try {
      const result = await runBackfill('conn-seed', { maxDurationMs: 60_000, today: TODAY });
      expect(result.outcome).toBe('skipped');
      expect(requests).toHaveLength(0);
      expect(progress).toHaveLength(0);
      expect(markError).not.toHaveBeenCalled();
      expect(markSynced).not.toHaveBeenCalled();
    } finally {
      providerUserId = '475';
    }
  });

  it('import complet : 90 jours d’activité en tranches ≤ 28 j, 28 nuits, FC 28 jours, puis done', async () => {
    const result = await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY });
    expect(result.outcome).toBe('done');
    expect(activityRequests()).toHaveLength(4);
    expect(activityRequests().every((u) => span(u) <= 28)).toBe(true);
    expect(requests.filter((u) => u.pathname === '/v3/users/sleep')).toHaveLength(1);
    expect(requests.filter((u) => u.pathname === '/v3/users/nightly-recharge')).toHaveLength(1);
    expect(requests.filter((u) => u.pathname.startsWith('/v3/users/continuous-heart-rate/'))).toHaveLength(28);
    expect([...raw.keys()].filter((k) => k.startsWith('sleep|'))).toHaveLength(28); // les 28 dernières nuits
    expect([...raw.keys()].filter((k) => k.startsWith('daily_activity|'))).toHaveLength(90);
    expect(conn).toMatchObject({ status: 'done', cursor: '2026-08-04' });
    expect(progress.map((p) => p.cursor)).toEqual(['2026-10-05', '2026-09-07', '2026-08-10', '2026-08-04', '2026-08-04']);
    expect(markSynced).toHaveBeenCalledWith(CONSULTANT, 'polar');
  });

  it('interrompu (durée) entre deux tranches → pending avec curseur, puis reprise là où il s’était arrêté', async () => {
    let clock = 0;
    let first = true;
    // Le temps « passe » après la première tranche du premier passage.
    const now = () => clock;
    override = (url) => {
      if (first && url.pathname === '/v3/users/activities' && url.searchParams.get('to') === '2026-10-04') clock = 10_000_000;
      return null;
    };
    const paused = await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY, now });
    // La 2e tranche (activité seule) se termine ; l'arrêt a lieu avant la 3e.
    expect(paused.outcome).toBe('paused');
    expect(conn).toMatchObject({ status: 'pending', cursor: '2026-09-07' });

    first = false;
    requests.length = 0;
    clock = 0;
    const resumed = await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY, now });
    expect(resumed.outcome).toBe('done');
    // La première tranche n'est pas refaite : ni sommeil, ni FC, ni activité d'octobre.
    expect(requests.some((u) => u.pathname === '/v3/users/sleep')).toBe(false);
    expect(requests.some((u) => u.pathname.startsWith('/v3/users/continuous-heart-rate/'))).toBe(false);
    expect(activityRequests().map((u) => u.searchParams.get('to'))).toEqual(['2026-09-06', '2026-08-09']);
    expect([...raw.keys()].filter((k) => k.startsWith('daily_activity|'))).toHaveLength(90);
  });

  it('interrompu au milieu d’une tranche → la tranche est refaite à la reprise, sans doublon', async () => {
    let clock = 0;
    let hrCalls = 0;
    override = (url) => {
      if (url.pathname.startsWith('/v3/users/continuous-heart-rate/') && ++hrCalls === 10) clock = 10_000_000;
      return null;
    };
    const paused = await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY, now: () => clock });
    expect(paused.outcome).toBe('paused');
    expect(conn).toMatchObject({ status: 'pending', cursor: null }); // première tranche non validée

    clock = 0;
    override = null;
    const resumed = await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY, now: () => clock });
    expect(resumed.outcome).toBe('done');
    expect([...raw.keys()].filter((k) => k.startsWith('continuous_hr|'))).toHaveLength(28);
    expect([...raw.keys()].filter((k) => k.startsWith('sleep|'))).toHaveLength(28);
  });

  it('relancer l’import (reconnexion) ne crée aucun doublon', async () => {
    await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY });
    const before = new Map(raw);
    conn = { status: 'pending', cursor: null, days: 90 }; // reconnexion : wearable_save_connection remet pending
    await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY });
    expect(raw.size).toBe(before.size);
    expect([...raw.keys()].sort()).toEqual([...before.keys()].sort());
  });

  it('déjà terminé ou pris par un autre processus → skipped, aucun appel Polar', async () => {
    conn.status = 'done';
    expect((await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY })).outcome).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('profondeur configurable (backfill_days = 10) → une tranche de 10 jours', async () => {
    conn.days = 10;
    await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY });
    expect(activityRequests().map(span)).toEqual([10]);
    expect(requests.filter((u) => u.pathname.startsWith('/v3/users/continuous-heart-rate/'))).toHaveLength(10);
    expect(conn).toMatchObject({ status: 'done', cursor: '2026-10-23' });
  });

  it('401 → connexion en erreur, import failed', async () => {
    override = () => new Response('', { status: 401 });
    const r = await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY });
    expect(r.outcome).toBe('failed');
    expect(markError).toHaveBeenCalledWith(CONSULTANT, 'polar', 'Accès révoqué côté Polar, reconnexion nécessaire');
    expect(conn.status).toBe('failed');
  });

  it('quota Polar atteint → pending (reprise au prochain cron), curseur conservé', async () => {
    override = (url) => (url.pathname === '/v3/users/sleep' ? new Response('', { status: 429, headers: { 'Retry-After': '900' } }) : null);
    const r = await runBackfill('conn-1', { maxDurationMs: 60_000, today: TODAY });
    expect(r.outcome).toBe('rate_limited');
    expect(conn).toMatchObject({ status: 'pending', cursor: null });
    expect(markError).not.toHaveBeenCalled();
  });
});
