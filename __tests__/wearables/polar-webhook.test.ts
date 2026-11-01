import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- Environnement ----------------------------------------------------------
process.env.POLAR_CLIENT_ID = 'client-id-test';
process.env.POLAR_CLIENT_SECRET = 'client-secret-test';
process.env.POLAR_REDIRECT_URI = 'https://afeia.fr/api/wearables/polar/callback';
process.env.POLAR_STATE_SECRET = 'state-secret-for-tests-0123456789abcdef';
process.env.POLAR_WEBHOOK_SECRET = 'webhook-secret-for-tests';

const ACCESS_TOKEN = 'polar-access-token-SECRET';
const CONSULTANT = '00000000-0000-0000-0000-0000000000b1';
const POLAR_USER = '475';

// --- File d'événements en mémoire (mêmes règles que les fonctions SQL, testées en pgTAP) ---
type Ev = {
  id: string; provider: 'polar'; event_type: string; provider_user_id: string; consultant_id: string | null;
  event_date: string | null; resource_url: string | null; payload: Record<string, unknown>; key: string;
  status: 'pending' | 'processing' | 'done' | 'failed' | 'ignored'; attempts: number; last_error: string | null;
  last_notified_at: number; processing_started_at: number | null; next_attempt_at: number;
};
let events: Ev[] = [];
let clock = 0;
const tick = () => ++clock;
const nowMs = () => Date.now();
const FINAL = ['done', 'failed', 'ignored'];

vi.mock('@/lib/wearables/events', () => ({
  recordEvent: async (i: { eventType: string; providerUserId: string; eventDate: string | null; resourceUrl: string | null; payload: Record<string, unknown>; idempotencyKey: string; notBefore?: Date }) => {
    let e = events.find((x) => x.key === i.idempotencyKey);
    const next = (i.notBefore ?? new Date()).getTime();
    if (!e) {
      e = {
        id: `ev-${events.length + 1}`, provider: 'polar', event_type: i.eventType, provider_user_id: i.providerUserId,
        consultant_id: null, event_date: i.eventDate, resource_url: i.resourceUrl, payload: i.payload, key: i.idempotencyKey,
        status: 'pending', attempts: 0, last_error: null, last_notified_at: tick(), processing_started_at: null, next_attempt_at: next,
      };
      events.push(e);
    } else {
      e.last_notified_at = tick();
      e.payload = i.payload;
      e.resource_url = i.resourceUrl ?? e.resource_url;
      if (FINAL.includes(e.status)) Object.assign(e, { status: 'pending', attempts: 0, next_attempt_at: next, last_error: null });
    }
    return { id: e.id, status: e.status, shouldProcess: e.status === 'pending' && e.next_attempt_at <= nowMs() };
  },
  claimEvent: async (id: string) => {
    const e = events.find((x) => x.id === id);
    if (!e || e.status !== 'pending' || e.next_attempt_at > nowMs()) return null;
    e.status = 'processing';
    e.processing_started_at = tick();
    return { ...e };
  },
  finishEvent: async (id: string, o: { status: 'done' | 'failed' | 'ignored'; error?: string | null; retryAt?: Date | null; consultantId?: string | null }) => {
    const e = events.find((x) => x.id === id)!;
    if (e.status !== 'processing') throw new Error('pas en cours de traitement');
    const requeued = e.last_notified_at > (e.processing_started_at ?? 0);
    if (requeued) Object.assign(e, { status: 'pending', attempts: 0, last_error: null, next_attempt_at: nowMs() });
    else {
      e.status = o.status;
      if (o.status === 'failed') e.attempts += 1;
      e.last_error = o.status === 'failed' ? o.error ?? null : null;
      if (o.retryAt) e.next_attempt_at = o.retryAt.getTime();
    }
    e.consultant_id = o.consultantId ?? e.consultant_id;
    e.processing_started_at = null;
    return { requeued, status: e.status, attempts: e.attempts };
  },
}));

// --- Connexions ---------------------------------------------------------------
const connections = new Map([[POLAR_USER, { consultantId: CONSULTANT, status: 'active' as const }]]);
const markError = vi.fn();
const markSynced = vi.fn();
vi.mock('@/lib/wearables/connections', async () => ({
  findConnectionByProviderUserId: async (_p: string, uid: string) => connections.get(uid) ?? null,
  getAccessToken: async () => ACCESS_TOKEN,
  markError: (...a: unknown[]) => markError(...a),
  markSynced: (...a: unknown[]) => markSynced(...a),
  sanitizeErrorMessage: (m: string) => m.slice(0, 500),
}));

// --- Ingestion (POL-10) ---------------------------------------------------------
const ingest = vi.fn(async (..._args: unknown[]) => 1);
vi.mock('@/lib/wearables/ingest', async (orig) => ({
  ...(await orig<typeof import('@/lib/wearables/ingest')>()),
  ingestPolarResource: (...a: unknown[]) => ingest(...a),
}));

// --- Arrière-plan : on garde les promesses pour les attendre ------------------
const background: Promise<unknown>[] = [];
const runInBackground = vi.fn((_label: string, task: () => Promise<unknown>) => {
  background.push(task());
});
vi.mock('@/lib/server/background', () => ({ runInBackground: (l: string, t: () => Promise<unknown>) => runInBackground(l, t) }));

async function drainBackground() {
  while (background.length) await background.shift();
}

// --- Polar simulé ---------------------------------------------------------------
let polarResponses: Record<string, () => Response | Promise<Response>> = {};
const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  expect((init?.headers as Record<string, string>)?.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  const handler = polarResponses[url];
  return handler ? handler() : new Response('', { status: 404 });
});

const { POST } = await import('@/app/api/webhooks/polar/route');
const { signPolarPayload } = await import('@/lib/wearables/polar/webhook');
const { REVOKED_MESSAGE } = await import('@/lib/wearables/polar/process-event');

const SLEEP_URL = 'https://www.polaraccesslink.com/v3/users/sleep/2026-10-31';
const NR_URL = 'https://www.polaraccesslink.com/v3/users/nightly-recharge/2026-10-31';

function sleepBody(user = POLAR_USER) {
  return JSON.stringify({ event: 'SLEEP', user_id: Number(user), date: '2026-10-31', timestamp: new Date().toISOString(), url: SLEEP_URL });
}

function webhookRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest('https://afeia.fr/api/webhooks/polar', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const WEBHOOK_SECRET = 'webhook-secret-for-tests';

function signed(body: string, event = 'SLEEP') {
  return webhookRequest(body, {
    'polar-webhook-event': event,
    'polar-webhook-signature': signPolarPayload(body, WEBHOOK_SECRET),
  });
}

const logs: string[] = [];

beforeEach(() => {
  events = [];
  background.length = 0;
  ingest.mockReset().mockResolvedValue(1);
  markError.mockReset();
  markSynced.mockReset();
  runInBackground.mockClear();
  fetchMock.mockClear();
  polarResponses = {
    [SLEEP_URL]: () => new Response(JSON.stringify({ date: '2026-10-31', sleep_score: 80 }), { status: 200 }),
    [NR_URL]: () => new Response(JSON.stringify({ date: '2026-10-31', ans_charge: 1.5 }), { status: 200 }),
  };
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
  const all = logs.join('\n');
  expect(all).not.toContain(ACCESS_TOKEN);
  expect(all).not.toContain('sleep_score'); // aucun corps de réponse dans les logs
});

// ---------------------------------------------------------------------------
describe('POST /api/webhooks/polar : signature et ping', () => {
  it('signature valide → 200, événement pending puis traité', async () => {
    const res = await POST(signed(sleepBody()));
    expect(res.status).toBe(200);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event_type: 'SLEEP', provider_user_id: POLAR_USER, event_date: '2026-10-31', resource_url: SLEEP_URL });
    expect(runInBackground).toHaveBeenCalledOnce();
    await drainBackground();
    expect(events[0].status).toBe('done');
    expect(events[0].consultant_id).toBe(CONSULTANT);
    expect(ingest).toHaveBeenCalledWith('sleep', { date: '2026-10-31', sleep_score: 80 }, CONSULTANT, expect.objectContaining({ date: '2026-10-31', providerUserId: POLAR_USER }));
    expect(ingest).toHaveBeenCalledWith('nightly_recharge', { date: '2026-10-31', ans_charge: 1.5 }, CONSULTANT, expect.anything());
    expect(markSynced).toHaveBeenCalledWith(CONSULTANT, 'polar');
  });

  it('signature invalide → 401, rien enregistré', async () => {
    const body = sleepBody();
    const res = await POST(webhookRequest(body, { 'polar-webhook-signature': signPolarPayload(body, 'wrong-secret') }));
    expect(res.status).toBe(401);
    expect(events).toHaveLength(0);
  });

  it('corps modifié après signature → 401', async () => {
    const body = sleepBody();
    const sig = signPolarPayload(body, process.env.POLAR_WEBHOOK_SECRET!);
    const res = await POST(webhookRequest(body.replace('475', '476'), { 'polar-webhook-signature': sig }));
    expect(res.status).toBe(401);
    expect(events).toHaveLength(0);
  });

  it('signature absente → 401', async () => {
    const res = await POST(webhookRequest(sleepBody()));
    expect(res.status).toBe(401);
    expect(events).toHaveLength(0);
  });

  it('ping → 200, même sans signature, rien enregistré', async () => {
    const body = JSON.stringify({ timestamp: '2026-11-01T08:25:10.02Z', event: 'PING' });
    const res = await POST(webhookRequest(body, { 'polar-webhook-event': 'PING' }));
    expect(res.status).toBe(200);
    expect(events).toHaveLength(0);
    expect(runInBackground).not.toHaveBeenCalled();
  });

  it('ping → 200 même si POLAR_WEBHOOK_SECRET n’est pas encore défini (création du webhook)', async () => {
    const saved = process.env.POLAR_WEBHOOK_SECRET;
    delete process.env.POLAR_WEBHOOK_SECRET;
    vi.resetModules();
    try {
      const { POST: freshPost } = await import('@/app/api/webhooks/polar/route');
      const res = await freshPost(webhookRequest(JSON.stringify({ event: 'PING', timestamp: 'x' })));
      expect(res.status).toBe(200);
      const refused = await freshPost(signed(sleepBody()));
      expect(refused.status).toBe(401);
    } finally {
      process.env.POLAR_WEBHOOK_SECRET = saved;
      vi.resetModules();
    }
  });
});

// ---------------------------------------------------------------------------
describe('POST /api/webhooks/polar : file et traitement', () => {
  it('doublon → une seule ligne', async () => {
    await POST(signed(sleepBody()));
    await POST(signed(sleepBody()));
    await drainBackground();
    // Nightly Recharge disponible : aucun événement de rattrapage, une seule ligne SLEEP.
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('SLEEP');
  });

  it('doublon après traitement (done) → repasse en pending, attempts 0, retraité', async () => {
    await POST(signed(sleepBody()));
    await drainBackground();
    const sleep = events.find((e) => e.event_type === 'SLEEP')!;
    expect(sleep.status).toBe('done');
    sleep.attempts = 2;

    await POST(signed(sleepBody()));
    // Repassé en pending (attempts 0) : la route a relancé le traitement, déjà démarré.
    expect(sleep.attempts).toBe(0);
    expect(['pending', 'processing']).toContain(sleep.status);
    expect(runInBackground).toHaveBeenCalledTimes(2);
    await drainBackground();
    expect(sleep.status).toBe('done');
  });

  it('notification reçue pendant processing → retraité une fois, et une seule', async () => {
    let sleepFetches = 0;
    polarResponses[SLEEP_URL] = async () => {
      sleepFetches += 1;
      if (sleepFetches === 1) {
        // Polar renotifie pendant que l'on est en train de lire la ressource.
        const dup = await POST(signed(sleepBody()));
        expect(dup.status).toBe(200);
      }
      return new Response(JSON.stringify({ date: '2026-10-31', sleep_score: 80 + sleepFetches }), { status: 200 });
    };

    await POST(signed(sleepBody()));
    await drainBackground();

    const sleep = events.filter((e) => e.event_type === 'SLEEP');
    expect(sleep).toHaveLength(1);
    expect(sleep[0].status).toBe('done');
    expect(sleepFetches).toBe(2); // traité, puis retraité une seule fois
    expect(runInBackground).toHaveBeenCalledOnce(); // le doublon n'a pas lancé de second traitement en parallèle
    expect(ingest.mock.calls.filter(([type]) => type === 'sleep').map(([, json]) => (json as { sleep_score: number }).sleep_score)).toEqual([81, 82]);
  });

  it('utilisateur Polar inconnu → ignored, aucun appel Polar', async () => {
    await POST(signed(sleepBody('999')));
    await drainBackground();
    expect(events[0].status).toBe('ignored');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ingest).not.toHaveBeenCalled();
  });

  it('échec HTTP Polar → failed avec erreur, attempts 1 (4xx : pas de nouvelle tentative)', async () => {
    polarResponses[SLEEP_URL] = () => new Response('oops', { status: 400 });
    await POST(signed(sleepBody()));
    await drainBackground();
    expect(events[0]).toMatchObject({ status: 'failed', attempts: 1 });
    expect(events[0].last_error).toContain('HTTP 400');
    expect(fetchMock.mock.calls.filter(([u]) => String(u) === SLEEP_URL)).toHaveLength(1);
    expect(markSynced).not.toHaveBeenCalled();
    expect(markError).not.toHaveBeenCalled();
  });

  it('401 de Polar → failed et connexion en erreur « Accès révoqué côté Polar »', async () => {
    polarResponses[SLEEP_URL] = () => new Response('', { status: 401 });
    await POST(signed(sleepBody()));
    await drainBackground();
    expect(events[0].status).toBe('failed');
    expect(markError).toHaveBeenCalledWith(CONSULTANT, 'polar', REVOKED_MESSAGE);
  });

  it('SLEEP sans Nightly Recharge disponible → événement NIGHTLY_RECHARGE différé', async () => {
    polarResponses[NR_URL] = () => new Response(null, { status: 204 });
    await POST(signed(sleepBody()));
    await drainBackground();
    const nr = events.find((e) => e.event_type === 'NIGHTLY_RECHARGE')!;
    expect(nr).toMatchObject({ status: 'pending', event_date: '2026-10-31', resource_url: NR_URL });
    expect(nr.next_attempt_at).toBeGreaterThan(Date.now() + 5 * 3600_000);
    expect(events.find((e) => e.event_type === 'SLEEP')!.status).toBe('done');
  });

  it("URL de ressource hors API Polar → failed, le jeton n'est jamais envoyé ailleurs", async () => {
    const body = JSON.stringify({ event: 'SLEEP', user_id: 475, date: '2026-10-31', url: 'https://evil.example/steal' });
    await POST(signed(body));
    await drainBackground();
    expect(events[0].status).toBe('failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('événement hors périmètre (EXERCISE) → ignored', async () => {
    const body = JSON.stringify({ event: 'EXERCISE', user_id: 475, entity_id: 'aQlC83', url: 'https://www.polaraccesslink.com/v3/exercises/aQlC83' });
    await POST(signed(body, 'EXERCISE'));
    await drainBackground();
    expect(events[0].status).toBe('ignored');
  });
});
