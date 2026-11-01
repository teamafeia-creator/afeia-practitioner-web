import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

process.env.POLAR_CLIENT_ID = 'client-id-test';
process.env.POLAR_CLIENT_SECRET = 'client-secret-test';
process.env.POLAR_REDIRECT_URI = 'https://afeia.fr/api/wearables/polar/callback';
process.env.POLAR_STATE_SECRET = 'state-secret-for-tests-0123456789abcdef';
process.env.CRON_SECRET = 'cron-secret-for-tests';

const TOKEN = 'polar-access-token-SECRET';
const A = { consultantId: '00000000-0000-0000-0000-0000000000a1', providerUserId: '101', lastSyncAt: null };
const B = { consultantId: '00000000-0000-0000-0000-0000000000a2', providerUserId: '102', lastSyncAt: null };

// --- Connexions -----------------------------------------------------------------
let activeConnections = [A, B];
const markError = vi.fn();
const markSynced = vi.fn();
const getAccessToken = vi.fn(async (_id: string) => TOKEN);
vi.mock('@/lib/wearables/connections', () => ({
  listActiveConnections: async () => activeConnections,
  getAccessToken: (id: string) => getAccessToken(id),
  markError: (...a: unknown[]) => markError(...a),
  markSynced: (...a: unknown[]) => markSynced(...a),
  sanitizeErrorMessage: (m: string) => m.slice(0, 500),
}));

// --- Stockage brut simulé : upsert sur (data_type, provider_record_id), comme wearable_raw ---
const raw = new Map<string, unknown>();
const ingest = vi.fn(async (dataType: string, json: unknown, _consultantId: string, ctx: { providerUserId: string; date: string | null }) => {
  raw.set(`${dataType}|${ctx.providerUserId}:${ctx.date}`, json);
  return 1;
});
vi.mock('@/lib/wearables/ingest', async (orig) => ({
  ...(await orig<typeof import('@/lib/wearables/ingest')>()),
  ingestPolarResource: (...a: Parameters<typeof ingest>) => ingest(...a),
}));

// --- File d'événements et traitement ----------------------------------------------
let dueEvents: { id: string; event_type: string; attempts: number }[] = [];
const requeueDueEvents = vi.fn(async () => dueEvents);
vi.mock('@/lib/wearables/events', () => ({ requeueDueEvents: (...a: unknown[]) => requeueDueEvents(...(a as [])) }));
type Outcome = 'done' | 'failed' | 'ignored' | 'skipped';
const processPolarEvent = vi.fn(async (_id: string): Promise<Outcome> => 'done');
vi.mock('@/lib/wearables/polar/process-event', () => ({
  processPolarEvent: (id: string) => processPolarEvent(id),
  REVOKED_MESSAGE: 'Accès révoqué côté Polar, reconnexion nécessaire',
}));

// --- E-mail équipe (même canal que les inscriptions praticien) ----------------------
const sendEmail = vi.fn();
vi.mock('@/lib/server/email', () => ({ sendEmail: (p: unknown) => sendEmail(p) }));
vi.mock('@/lib/server/verification', () => ({
  adminEmails: async () => ['equipe@afeia.fr'],
  emailLayout: (o: { title: string; paragraphs: string[] }) => ({ html: `<h1>${o.title}</h1>`, text: [o.title, ...o.paragraphs].join('\n') }),
}));

// --- Polar simulé -------------------------------------------------------------------
let webhook: unknown = { data: [{ id: 'abdf33', url: 'https://afeia.fr/api/webhooks/polar', events: ['SLEEP'], active: true }] };
const defaultFetch = async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const auth = (init?.headers as Record<string, string>)?.Authorization ?? '';
  if (url.pathname === '/v3/webhooks') {
    expect(auth.startsWith('Basic ')).toBe(true);
    return new Response(JSON.stringify(webhook), { status: 200 });
  }
  expect(auth).toBe(`Bearer ${TOKEN}`);
  const [, , , kind, date] = url.pathname.split('/'); // /v3/users/<kind>/<date>
  return new Response(JSON.stringify({ kind, date }), { status: 200 });
};
const fetchMock = vi.fn(defaultFetch);

const { GET } = await import('@/app/api/cron/polar-sync/route');
const { runPolarSync, lastDays } = await import('@/lib/wearables/polar/sync');

const cronRequest = (auth?: string) =>
  new NextRequest('https://afeia.fr/api/cron/polar-sync', { headers: auth ? { authorization: auth } : {} });

const logs: string[] = [];
beforeEach(() => {
  activeConnections = [A, B];
  raw.clear();
  ingest.mockClear();
  markError.mockReset();
  markSynced.mockReset();
  getAccessToken.mockReset().mockImplementation(async () => TOKEN);
  dueEvents = [];
  requeueDueEvents.mockClear();
  processPolarEvent.mockReset().mockResolvedValue('done');
  sendEmail.mockReset();
  webhook = { data: [{ id: 'abdf33', url: 'https://afeia.fr/api/webhooks/polar', events: ['SLEEP'], active: true }] };
  fetchMock.mockReset().mockImplementation(defaultFetch);
  vi.stubGlobal('fetch', fetchMock);
  logs.length = 0;
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    });
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  expect(logs.join('\n')).not.toContain(TOKEN);
});

describe('GET /api/cron/polar-sync : protection', () => {
  it('401 sans en-tête Authorization', async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401 avec un mauvais secret', async () => {
    expect((await GET(cronRequest('Bearer nope'))).status).toBe(401);
    expect((await GET(cronRequest('cron-secret-for-tests'))).status).toBe(401);
  });

  it('401 si CRON_SECRET n’est pas défini, même avec « Bearer »', async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      expect((await GET(cronRequest('Bearer '))).status).toBe(401);
      expect((await GET(cronRequest('Bearer undefined'))).status).toBe(401);
    } finally {
      process.env.CRON_SECRET = saved;
    }
  });

  it('200 avec le bon secret, récapitulatif renvoyé', async () => {
    const res = await GET(cronRequest('Bearer cron-secret-for-tests'));
    expect(res.status).toBe(200);
    const { summary } = await res.json();
    expect(summary.connections).toMatchObject({ total: 2, processed: 2, errors: 0 });
    expect(logs.some((l) => l.includes('récapitulatif'))).toBe(true);
  });
});

describe('runPolarSync', () => {
  it('3 derniers jours × 4 ressources par connexion active, via ingestPolarResource', async () => {
    const now = new Date('2026-11-01T03:00:00Z');
    const summary = await runPolarSync({ now });
    expect(lastDays(3, now)).toEqual(['2026-10-31', '2026-10-30', '2026-10-29']);
    expect(ingest).toHaveBeenCalledTimes(2 * 3 * 4);
    expect(summary.resources.ingested).toBe(24);
    expect(new Set(ingest.mock.calls.map(([t]) => t))).toEqual(new Set(['sleep', 'nightly_recharge', 'continuous_hr', 'daily_activity']));
    expect(markSynced).toHaveBeenCalledWith(A.consultantId, 'polar');
    expect(markSynced).toHaveBeenCalledWith(B.consultantId, 'polar');
  });

  it('deux exécutions successives : aucun doublon (mêmes clés d’enregistrement)', async () => {
    const now = new Date('2026-11-01T03:00:00Z');
    await runPolarSync({ now });
    const afterFirst = new Map(raw);
    const keysFirst = ingest.mock.calls.map(([t, , , c]) => `${t}|${c.providerUserId}:${c.date}`);
    ingest.mockClear();

    await runPolarSync({ now });
    const keysSecond = ingest.mock.calls.map(([t, , , c]) => `${t}|${c.providerUserId}:${c.date}`);

    expect(new Set(keysFirst).size).toBe(keysFirst.length); // pas de double ingestion dans une exécution
    expect(keysSecond.sort()).toEqual(keysFirst.sort()); // mêmes enregistrements, upsertés
    expect(raw.size).toBe(afterFirst.size);
    expect(raw.size).toBe(24);
  });

  it('webhook inactif → alerte envoyée à l’équipe', async () => {
    webhook = { data: [{ id: 'abdf33', url: 'https://afeia.fr/api/webhooks/polar', events: ['SLEEP'], active: false }] };
    const summary = await runPolarSync();
    expect(summary.webhook).toEqual({ checked: true, active: false, alerted: true });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'equipe@afeia.fr', subject: '[Afeia] Webhook Polar désactivé' });
    expect(sendEmail.mock.calls[0][0].text).toContain('polar:webhook -- activate');
  });

  it('webhook absent → alerte « absent »', async () => {
    webhook = { data: [] };
    const summary = await runPolarSync();
    expect(summary.webhook.active).toBe(false);
    expect(sendEmail.mock.calls[0][0].subject).toBe('[Afeia] Webhook Polar absent');
  });

  it('webhook actif → aucune alerte', async () => {
    await runPolarSync();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('401 de Polar sur une connexion → markError avec message lisible, les autres continuent', async () => {
    // Jeton différent par connexion ; celui de A est révoqué chez Polar (401).
    const tokens: Record<string, string> = { [A.consultantId]: 'tok-A', [B.consultantId]: 'tok-B' };
    getAccessToken.mockImplementation(async (id: string) => tokens[id]);
    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/v3/webhooks') return new Response(JSON.stringify(webhook), { status: 200 });
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (auth === 'Bearer tok-A') return new Response('', { status: 401 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const summary = await runPolarSync();
    expect(markError).toHaveBeenCalledWith(A.consultantId, 'polar', 'Accès révoqué côté Polar, reconnexion nécessaire');
    expect(markError).toHaveBeenCalledOnce();
    expect(markSynced).toHaveBeenCalledWith(B.consultantId, 'polar');
    expect(markSynced).not.toHaveBeenCalledWith(A.consultantId, 'polar');
    expect(summary.connections).toMatchObject({ total: 2, revoked: 1, errors: 0 });
  });

  it('rejoue les événements dus (failed < 5 tentatives, pending) et compte les résultats', async () => {
    dueEvents = [
      { id: 'ev-1', event_type: 'SLEEP', attempts: 2 },
      { id: 'ev-2', event_type: 'NIGHTLY_RECHARGE', attempts: 0 },
    ];
    processPolarEvent.mockResolvedValueOnce('done').mockResolvedValueOnce('failed');
    const summary = await runPolarSync();
    expect(requeueDueEvents).toHaveBeenCalledWith({ maxAttempts: 5 });
    expect(processPolarEvent.mock.calls.map(([id]) => id)).toEqual(['ev-1', 'ev-2']);
    expect(summary.replay).toMatchObject({ due: 2, done: 1, failed: 1 });
  });

  it('quota Polar épuisé pendant le rattrapage → arrêt propre, connexions reportées, pas de rejeu ni de markError', async () => {
    dueEvents = [{ id: 'ev-1', event_type: 'SLEEP', attempts: 0 }];
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/v3/webhooks') return new Response(JSON.stringify(webhook), { status: 200 });
      return new Response('', { status: 429, headers: { 'Retry-After': '900' } }); // au-delà du plafond d'attente
    });
    const summary = await runPolarSync();
    expect(summary.rateLimited).toMatchObject({ at: 'rattrapage' });
    expect(summary.rateLimited!.retryAt).not.toBeNull();
    expect(summary.connections.deferred).toBe(2);
    expect(markError).not.toHaveBeenCalled();
    expect(processPolarEvent).not.toHaveBeenCalled();
  });

  it('budget de temps épuisé → connexions restantes reportées, pas de dépassement', async () => {
    activeConnections = Array.from({ length: 12 }, (_, i) => ({ consultantId: `c-${i}`, providerUserId: `${i}`, lastSyncAt: null }));
    const summary = await runPolarSync({ budgetMs: -1 });
    expect(summary.connections.processed).toBe(0);
    expect(summary.connections.deferred).toBe(12);
    expect(ingest).not.toHaveBeenCalled();
  });
});
