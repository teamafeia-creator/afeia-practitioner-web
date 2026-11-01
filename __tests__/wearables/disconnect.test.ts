import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

process.env.POLAR_CLIENT_ID = 'client-id-test';
process.env.POLAR_CLIENT_SECRET = 'client-secret-test';
process.env.POLAR_REDIRECT_URI = 'https://afeia.fr/api/wearables/polar/callback';
process.env.POLAR_STATE_SECRET = 'state-secret-for-tests-0123456789abcdef';

const TOKEN = 'polar-access-token-SECRET';
const CONSULTANT = '00000000-0000-0000-0000-0000000000d7';

let connection: { providerUserId: string; status: 'active' | 'error' | 'revoked' } | null;
let token: string | null;
const revokeAndPurge = vi.fn(async (_c: string, _p: string, deleteData: boolean) => ({
  found: true,
  deleted: deleteData ? { sleep_sessions: 28, wearable_raw: 120, wearable_events: 40 } : {},
}));
vi.mock('@/lib/wearables/connections', () => ({
  getConnection: async () => connection,
  getAccessToken: async () => token,
  revokeAndPurge: (...a: [string, string, boolean]) => revokeAndPurge(...a),
  sanitizeErrorMessage: (m: string) => m.replace(/Bearer\s+\S+/g, 'Bearer [redacted]'),
}));
const resolveConsultantId = vi.fn();
vi.mock('@/lib/mobile-auth', () => ({ resolveConsultantId: (r: unknown) => resolveConsultantId(r) }));

let polarStatus = 204;
const fetchMock = vi.fn(async (_input: string | URL, _init?: RequestInit) => new Response(null, { status: polarStatus }));

const { disconnectPolar } = await import('@/lib/wearables/polar/disconnect');
const { POST } = await import('@/app/api/wearables/disconnect/route');

const logs: string[] = [];
beforeEach(() => {
  connection = { providerUserId: '475', status: 'active' };
  token = TOKEN;
  polarStatus = 204;
  revokeAndPurge.mockClear();
  resolveConsultantId.mockReset().mockResolvedValue(CONSULTANT);
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  logs.length = 0;
  for (const level of ['info', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation((...a: unknown[]) => {
      logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
    });
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  expect(logs.join('\n')).not.toContain(TOKEN);
});

describe('disconnectPolar', () => {
  it('avec suppression : DELETE /v3/users/{id} chez Polar, puis révocation + suppression', async () => {
    const r = await disconnectPolar(CONSULTANT, { deleteData: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://www.polaraccesslink.com/v3/users/475');
    expect(init?.method).toBe('DELETE');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(revokeAndPurge).toHaveBeenCalledWith(CONSULTANT, 'polar', true);
    expect(r).toEqual({ status: 'disconnected', polar: 'deregistered', deleted: { sleep_sessions: 28, wearable_raw: 120, wearable_events: 40 } });
  });

  it('sans suppression : révocation seule, données conservées', async () => {
    const r = await disconnectPolar(CONSULTANT, { deleteData: false });
    expect(revokeAndPurge).toHaveBeenCalledWith(CONSULTANT, 'polar', false);
    expect(r.deleted).toEqual({});
    expect(r.polar).toBe('deregistered');
  });

  it.each([401, 400, 403])('échec Polar (%i) → révoqué quand même côté Afeia, erreur journalisée', async (status) => {
    polarStatus = status;
    const r = await disconnectPolar(CONSULTANT, { deleteData: true });
    expect(r.polar).toBe('failed');
    expect(revokeAndPurge).toHaveBeenCalledWith(CONSULTANT, 'polar', true);
    expect(logs.some((l) => l.includes('désinscription Polar échouée') && l.includes(`HTTP ${status}`))).toBe(true);
  });

  it('erreur réseau Polar → révoqué quand même', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const r = await disconnectPolar(CONSULTANT, { deleteData: false });
    expect(r.polar).toBe('failed');
    expect(revokeAndPurge).toHaveBeenCalled();
  }, 15_000);

  it('404 chez Polar (déjà désinscrit) → succès', async () => {
    polarStatus = 404;
    expect((await disconnectPolar(CONSULTANT, { deleteData: true })).polar).toBe('deregistered');
  });

  it('jeton déjà absent → pas d’appel Polar, révocation quand même', async () => {
    token = null;
    const r = await disconnectPolar(CONSULTANT, { deleteData: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r.polar).toBe('skipped');
    expect(revokeAndPurge).toHaveBeenCalledWith(CONSULTANT, 'polar', true);
  });

  it('déjà déconnecté → pas d’appel Polar ; suppression des données encore possible', async () => {
    connection = { providerUserId: '475', status: 'revoked' };
    const r = await disconnectPolar(CONSULTANT, { deleteData: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r).toMatchObject({ status: 'disconnected', polar: 'skipped' });
    expect(revokeAndPurge).toHaveBeenCalledWith(CONSULTANT, 'polar', true);
  });

  it('aucune connexion → not_connected, rien touché', async () => {
    connection = null;
    expect((await disconnectPolar(CONSULTANT, { deleteData: true })).status).toBe('not_connected');
    expect(revokeAndPurge).not.toHaveBeenCalled();
  });
});

describe('POST /api/wearables/disconnect', () => {
  const req = (body?: unknown) =>
    new NextRequest('https://afeia.fr/api/wearables/disconnect', {
      method: 'POST',
      headers: { authorization: 'Bearer session', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('401 sans utilisateur', async () => {
    resolveConsultantId.mockResolvedValue(null);
    expect((await POST(req({ deleteData: true }))).status).toBe(401);
    expect(revokeAndPurge).not.toHaveBeenCalled();
  });

  it('suppression par défaut quand rien n’est précisé', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(revokeAndPurge).toHaveBeenCalledWith(CONSULTANT, 'polar', true);
  });

  it('deleteData: false respecté ; le consultant vient du jeton, jamais du corps', async () => {
    const res = await POST(req({ deleteData: false, consultantId: 'un-autre' }));
    expect(res.status).toBe(200);
    expect(revokeAndPurge).toHaveBeenCalledWith(CONSULTANT, 'polar', false);
  });

  it('404 sans objet connecté', async () => {
    connection = null;
    expect((await POST(req({ deleteData: true }))).status).toBe(404);
  });
});
