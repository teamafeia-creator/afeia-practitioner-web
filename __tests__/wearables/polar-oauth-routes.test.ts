import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- Environnement Polar (avant tout import de la config) -------------------
process.env.POLAR_CLIENT_ID = 'client-id-test';
process.env.POLAR_CLIENT_SECRET = 'client-secret-test';
process.env.POLAR_REDIRECT_URI = 'https://afeia.fr/api/wearables/polar/callback';
process.env.POLAR_STATE_SECRET = 'state-secret-for-tests-0123456789abcdef';

const ACCESS_TOKEN = 'polar-access-token-SECRET';
const consultantId = '00000000-0000-0000-0000-0000000000b1';

// --- Dépendances simulées ---------------------------------------------------
const resolveConsultantId = vi.fn();
vi.mock('@/lib/mobile-auth', () => ({ resolveConsultantId: (req: unknown) => resolveConsultantId(req) }));

let canUse = true;
let activeConsent: { version: string; acceptedAt: string } | null = { version: 'v1', acceptedAt: '2026-11-01T10:00:00Z' };
vi.mock('@/lib/wearables/consents', () => ({
  consultantCanUseWearables: async () => canUse,
  getActiveConsent: async (_c: string, v: string) => (activeConsent && activeConsent.version === v ? activeConsent : null),
}));
const saveConnection = vi.fn();
const runInBackground = vi.fn();
vi.mock('@/lib/server/background', () => ({ runInBackground: (l: string, t: () => Promise<unknown>) => runInBackground(l, t) }));
const runBackfill = vi.fn();
vi.mock('@/lib/wearables/polar/backfill', () => ({ runBackfill: (...a: unknown[]) => runBackfill(...a) }));
vi.mock('@/lib/wearables/connections', () => ({ saveConnection: (input: unknown) => saveConnection(input) }));

const consumedNonces = new Set<string>();
vi.mock('@/lib/wearables/oauth-states', () => ({
  consumeOAuthState: async ({ nonce }: { nonce: string }) => {
    if (consumedNonces.has(nonce)) return false;
    consumedNonces.add(nonce);
    return true;
  },
}));

// Faux Polar : token endpoint + POST /v3/users.
let registerStatus = 200;
let tokenStatus = 200;
const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  if (url === 'https://polarremote.com/v2/oauth2/token') {
    if (tokenStatus !== 200) return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: tokenStatus });
    return new Response(
      JSON.stringify({ access_token: ACCESS_TOKEN, token_type: 'bearer', expires_in: 31535999, x_user_id: 475 }),
      { status: 200 }
    );
  }
  if (url === 'https://www.polaraccesslink.com/v3/users' && init?.method === 'POST') {
    return new Response(registerStatus === 200 ? JSON.stringify({ 'polar-user-id': 475 }) : '', { status: registerStatus });
  }
  return new Response('unexpected', { status: 500 });
});

const { GET: connect } = await import('@/app/api/wearables/polar/connect/route');
const { GET: callback } = await import('@/app/api/wearables/polar/callback/route');
const { signState } = await import('@/lib/wearables/polar/state');
const { resetPolarConfigCache } = await import('@/lib/wearables/polar/config');

/** Exécute `fn` avec des variables retirées, cache de config vidé avant et après. */
async function withoutEnv(names: string[], fn: () => Promise<void>) {
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  for (const n of names) delete process.env[n];
  resetPolarConfigCache();
  try {
    await fn();
  } finally {
    for (const [n, v] of Object.entries(saved)) if (v !== undefined) process.env[n] = v;
    resetPolarConfigCache();
  }
}

const logs: string[] = [];
function captureLogs() {
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    });
  }
}

function freshState(returnTo = '/consultant/home?tab=objets', now?: Date) {
  return signState({ consultantId, returnTo }, process.env.POLAR_STATE_SECRET!, now).state;
}

function callbackRequest(params: Record<string, string>) {
  const url = new URL('https://afeia.fr/api/wearables/polar/callback');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function location(res: Response) {
  return new URL(res.headers.get('location')!);
}

beforeEach(() => {
  canUse = true;
  activeConsent = { version: 'v1', acceptedAt: '2026-11-01T10:00:00Z' };
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  resolveConsultantId.mockReset();
  saveConnection.mockReset().mockResolvedValue('connection-id');
  runInBackground.mockReset();
  runBackfill.mockReset();
  consumedNonces.clear();
  registerStatus = 200;
  tokenStatus = 200;
  logs.length = 0;
  captureLogs();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // Aucun log ne doit contenir le jeton, quel que soit le scénario.
  expect(logs.join('\n')).not.toContain(ACCESS_TOKEN);
});

// ---------------------------------------------------------------------------
describe('GET /api/wearables/polar/connect', () => {
  const connectRequest = () =>
    new NextRequest('https://afeia.fr/api/wearables/polar/connect?returnTo=/consultant/home', {
      headers: { authorization: 'Bearer user-session' },
    });

  it('utilisateur non interne (WEARABLES_ENABLED_FOR=internal) → 403 not_enabled', async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    canUse = false;
    const res = await connect(connectRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'not_enabled' });
  });

  it('pas de consentement actif → 403 consent_required', async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    activeConsent = null;
    const res = await connect(connectRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'consent_required', version: 'v1' });
  });

  it('consentement sur une ancienne version → 403 consent_required', async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    activeConsent = { version: 'v0', acceptedAt: '2026-01-01T00:00:00Z' };
    expect((await connect(connectRequest())).status).toBe(403);
  });

  it('consentement v1 actif → URL de redirection vers Polar', async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    const res = await connect(connectRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).authorizeUrl).toMatch(/^https:\/\/flow\.polar\.com\/oauth2\/authorization\?/);
  });

  it('sans POLAR_STATE_SECRET → 503 clair, nom de la variable logué, aucune valeur', async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    await withoutEnv(['POLAR_STATE_SECRET'], async () => {
      const res = await connect(connectRequest());
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe('polar_unavailable');
      expect(body.message).toMatch(/indisponible/);
      expect(JSON.stringify(body)).not.toContain('POLAR_');
    });
    const all = logs.join('\n');
    expect(all).toContain('POLAR_STATE_SECRET');
    for (const value of ['client-id-test', 'client-secret-test']) expect(all).not.toContain(value);
  });

  it('sans aucune variable Polar → 503 (jamais 500)', async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    await withoutEnv(['POLAR_CLIENT_ID', 'POLAR_CLIENT_SECRET', 'POLAR_REDIRECT_URI', 'POLAR_STATE_SECRET'], async () => {
      expect((await connect(connectRequest())).status).toBe(503);
    });
  });

  it('sans POLAR_WEBHOOK_SECRET → la connexion fonctionne (seule la route webhook en dépend)', async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    await withoutEnv(['POLAR_WEBHOOK_SECRET'], async () => {
      for (const VERCEL_ENV of ['production', undefined]) {
        if (VERCEL_ENV) process.env.VERCEL_ENV = VERCEL_ENV;
        else delete process.env.VERCEL_ENV;
        resetPolarConfigCache();
        expect((await connect(connectRequest())).status).toBe(200);
      }
    });
    delete process.env.VERCEL_ENV;
  });

  it('401 sans utilisateur connecté', async () => {
    resolveConsultantId.mockResolvedValue(null);
    const res = await connect(new NextRequest('https://afeia.fr/api/wearables/polar/connect'));
    expect(res.status).toBe(401);
  });

  it("renvoie l'URL d'autorisation Polar avec client_id, redirect_uri, scope et un state signé", async () => {
    resolveConsultantId.mockResolvedValue(consultantId);
    const res = await connect(
      new NextRequest('https://afeia.fr/api/wearables/polar/connect?returnTo=/consultant/home', {
        headers: { authorization: 'Bearer user-session' },
      })
    );
    expect(res.status).toBe(200);
    const { authorizeUrl } = await res.json();
    const url = new URL(authorizeUrl);
    expect(url.origin + url.pathname).toBe('https://flow.polar.com/oauth2/authorization');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-id-test');
    expect(url.searchParams.get('redirect_uri')).toBe('https://afeia.fr/api/wearables/polar/callback');
    expect(url.searchParams.get('scope')).toBe('accesslink.read_all');

    const { verifyState } = await import('@/lib/wearables/polar/state');
    const payload = verifyState(url.searchParams.get('state'), process.env.POLAR_STATE_SECRET!);
    expect(payload.cid).toBe(consultantId);
    expect(payload.returnTo).toBe('/consultant/home');
    expect(authorizeUrl).not.toContain('client-secret-test');
  });
});

// ---------------------------------------------------------------------------
describe('GET /api/wearables/polar/callback : state', () => {
  it('config OAuth incomplète → 503 (page claire), aucun échange de code ni consommation du state', async () => {
    const state = freshState();
    await withoutEnv(['POLAR_CLIENT_SECRET'], async () => {
      const res = await callback(callbackRequest({ code: 'abc', state }));
      expect(res.status).toBe(503);
      expect(await res.text()).toMatch(/indisponible/);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consumedNonces.size).toBe(0);
    expect(logs.join('\n')).toContain('POLAR_CLIENT_SECRET');
  });

  it('sans POLAR_WEBHOOK_SECRET → le callback fonctionne', async () => {
    await withoutEnv(['POLAR_WEBHOOK_SECRET'], async () => {
      const res = await callback(callbackRequest({ code: 'abc', state: freshState() }));
      expect(res.status).toBe(303);
      expect(location(res).searchParams.get('wearable')).toBe('connected');
    });
  });

  it('400 si le state est absent', async () => {
    const res = await callback(callbackRequest({ code: 'abc' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400 si le state est falsifié', async () => {
    const [body] = freshState().split('.');
    const res = await callback(callbackRequest({ code: 'abc', state: `${body}.AAAA` }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400 si le state est expiré', async () => {
    const old = freshState('/consultant/home', new Date(Date.now() - 11 * 60_000));
    const res = await callback(callbackRequest({ code: 'abc', state: old }));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('expiré');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400 si le state a déjà été consommé, et le code n'est jamais rééchangé", async () => {
    const state = freshState();
    const first = await callback(callbackRequest({ code: 'abc', state }));
    expect(location(first).searchParams.get('wearable')).toBe('connected');
    const tokenCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/oauth2/token')).length;

    const second = await callback(callbackRequest({ code: 'abc', state }));
    expect(second.status).toBe(400);
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/oauth2/token')).length).toBe(tokenCalls);
    expect(saveConnection).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe('GET /api/wearables/polar/callback : flux', () => {
  it('200 sur /v3/users → connexion enregistrée et redirection connected', async () => {
    const res = await callback(callbackRequest({ code: 'abc', state: freshState() }));
    expect(res.status).toBe(303);
    const dest = location(res);
    expect(dest.origin + dest.pathname).toBe('https://afeia.fr/consultant/home');
    expect(dest.searchParams.get('tab')).toBe('objets');
    expect(dest.searchParams.get('wearable')).toBe('connected');
    expect(res.headers.get('location')).not.toContain(ACCESS_TOKEN);

    // Échange du code en Basic auth, avec le redirect_uri.
    const [, tokenInit] = fetchMock.mock.calls.find(([u]) => String(u).includes('/oauth2/token'))!;
    expect((tokenInit!.headers as Record<string, string>).Authorization).toBe(
      'Basic ' + Buffer.from('client-id-test:client-secret-test').toString('base64')
    );
    expect(String(tokenInit!.body)).toContain('grant_type=authorization_code');
    expect(String(tokenInit!.body)).toContain('code=abc');

    // member-id = UUID du consultant.
    const [, registerInit] = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/v3/users'))!;
    expect(JSON.parse(String(registerInit!.body))).toEqual({ 'member-id': consultantId });

    expect(saveConnection).toHaveBeenCalledWith({
      consultantId,
      provider: 'polar',
      providerUserId: '475',
      accessToken: ACCESS_TOKEN,
      expiresIn: 31535999,
    });

    // Import de l'historique lancé en arrière-plan, sans être attendu par la redirection.
    expect(runInBackground).toHaveBeenCalledOnce();
    expect(runBackfill).not.toHaveBeenCalled();
    await runInBackground.mock.calls[0][1]();
    expect(runBackfill).toHaveBeenCalledWith('connection-id', { maxDurationMs: 240_000 });
  });

  it('409 sur /v3/users (déjà inscrit) → traité comme un succès', async () => {
    registerStatus = 409;
    const res = await callback(callbackRequest({ code: 'abc', state: freshState() }));
    expect(location(res).searchParams.get('wearable')).toBe('connected');
    expect(saveConnection).toHaveBeenCalledTimes(1);
  });

  it('403 sur /v3/users (consentements manquants) → erreur explicite, aucune connexion', async () => {
    registerStatus = 403;
    const res = await callback(callbackRequest({ code: 'abc', state: freshState() }));
    const dest = location(res);
    expect(dest.searchParams.get('wearable')).toBe('error');
    expect(dest.searchParams.get('reason')).toBe('polar_consents_missing');
    expect(saveConnection).not.toHaveBeenCalled();

    const { polarConnectMessage } = await import('@/lib/wearables/polar/messages');
    expect(polarConnectMessage('error', 'polar_consents_missing')).toContain('account.polar.com');
  });

  it('access_denied renvoyé par Polar → retour avec message, ni échange ni connexion', async () => {
    const res = await callback(callbackRequest({ error: 'access_denied', state: freshState() }));
    const dest = location(res);
    expect(dest.searchParams.get('wearable')).toBe('error');
    expect(dest.searchParams.get('reason')).toBe('access_denied');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveConnection).not.toHaveBeenCalled();
    expect(runInBackground).not.toHaveBeenCalled();
  });

  it("échec de l'échange du code → erreur token_exchange_failed, aucune connexion", async () => {
    tokenStatus = 400;
    const res = await callback(callbackRequest({ code: 'abc', state: freshState() }));
    expect(location(res).searchParams.get('reason')).toBe('token_exchange_failed');
    expect(saveConnection).not.toHaveBeenCalled();
  });

  it('retour vers le lien profond mobile afeia://', async () => {
    const res = await callback(callbackRequest({ code: 'abc', state: freshState('afeia://wearables/polar') }));
    expect(res.headers.get('location')).toBe('afeia://wearables/polar?wearable=connected');
  });
});
