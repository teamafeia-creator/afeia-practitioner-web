import { describe, expect, it, vi } from 'vitest';
import {
  PolarAuthError,
  PolarHttpError,
  PolarRateLimitError,
  createPolarClient,
  parseRateLimitHeaders,
} from '@/lib/wearables/polar/client';

const TOKEN = 'polar-access-token-SECRET';
const SLEEP_PATH = '/v3/users/sleep/2026-10-31';

/** Client de test : fetch scripté, temporisation et horloge simulées (aucune attente réelle). */
function setup(responses: Array<Response | Error | (() => Response)>, opts: { maxWaitMs?: number; random?: number } = {}) {
  let clock = 1_000_000;
  const sleeps: number[] = [];
  const calls: { url: string; init: RequestInit }[] = [];
  const queue = [...responses];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = queue.shift();
    if (!next) throw new Error('plus de réponse scriptée');
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next() : next;
  });
  const client = createPolarClient({
    fetch: fetchMock as unknown as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    random: () => opts.random ?? 0.5,
    maxWaitMs: opts.maxWaitMs,
  });
  return { client, sleeps, calls, advance: (ms: number) => (clock += ms) };
}

/** Erreur attendue d'un appel (échoue si l'appel réussit). */
const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('aurait dû échouer');
    },
    (e: unknown) => e as PolarRateLimitError
  );

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });
const quotaHeaders = (usage: string, limit: string, reset: string) => ({
  'RateLimit-Usage': usage,
  'RateLimit-Limit': limit,
  'RateLimit-Reset': reset,
});

describe('polarFetch : requête', () => {
  it('URL AccessLink, Bearer, Accept JSON, paramètres de requête', async () => {
    const { client, calls } = setup([json({ ok: true })]);
    const data = await client.polarFetch('/v3/users/activities/2026-10-31', { token: TOKEN, query: { steps: true, skip: undefined } });
    expect(data).toEqual({ ok: true });
    expect(calls[0].url).toBe('https://www.polaraccesslink.com/v3/users/activities/2026-10-31?steps=true');
    expect(calls[0].init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' });
  });

  it('identifiants client → Basic auth', async () => {
    const { client, calls } = setup([json({ data: [] })]);
    await client.polarFetch('/v3/webhooks', { basic: { clientId: 'cid', clientSecret: 'cs' } });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Basic ' + Buffer.from('cid:cs').toString('base64'));
  });

  it('URL hors API AccessLink refusée sans appel (le jeton ne part jamais ailleurs)', async () => {
    const { client, calls } = setup([]);
    await expect(client.polarFetch('https://evil.example/v3/users/sleep', { token: TOKEN })).rejects.toThrow(/hors de l’API/);
    await expect(client.polarFetch('https://www.polaraccesslink.com/admin', { token: TOKEN })).rejects.toThrow(/hors de l’API/);
    expect(calls).toHaveLength(0);
  });
});

describe('polarFetch : résultats vides', () => {
  it('204 → null', async () => {
    const { client } = setup([new Response(null, { status: 204 })]);
    expect(await client.polarFetch('/v3/users/activities/2026-10-31', { token: TOKEN })).toBeNull();
  });

  it('404 « No data found for date » sur un GET → null', async () => {
    const { client } = setup([new Response('', { status: 404 })]);
    expect(await client.polarFetch(SLEEP_PATH, { token: TOKEN })).toBeNull();
  });

  it('liste vide → renvoyée telle quelle (pas une erreur)', async () => {
    const { client } = setup([json({ nights: [] })]);
    expect(await client.polarFetch('/v3/users/sleep', { token: TOKEN })).toEqual({ nights: [] });
  });

  it('200 avec corps vide → null', async () => {
    const { client } = setup([new Response('', { status: 200 })]);
    expect(await client.polarFetch(SLEEP_PATH, { token: TOKEN })).toBeNull();
  });
});

describe('polarFetch : nouvelles tentatives', () => {
  it('429 puis 200 → réussit après une attente (Retry-After respecté)', async () => {
    const { client, sleeps, calls } = setup([json({}, 429, { 'Retry-After': '2' }), json({ date: '2026-10-31' })]);
    expect(await client.polarFetch(SLEEP_PATH, { token: TOKEN })).toEqual({ date: '2026-10-31' });
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([2000]);
  });

  it('429 sans Retry-After → délai exponentiel avec aléa', async () => {
    const { client, sleeps } = setup([json({}, 429), json({ ok: 1 })], { random: 0.25 });
    await client.polarFetch(SLEEP_PATH, { token: TOKEN });
    expect(sleeps).toEqual([500 + 0.25 * 500]);
  });

  it('503 × 4 → 3 nouvelles tentatives (délais croissants), puis PolarHttpError', async () => {
    const { client, sleeps, calls } = setup([503, 503, 503, 503].map((s) => () => new Response('', { status: s })), { random: 0 });
    const error = await failure(client.polarFetch(SLEEP_PATH, { token: TOKEN }));
    expect(error).toBeInstanceOf(PolarHttpError);
    expect(error).not.toBeInstanceOf(PolarAuthError);
    expect(error.status).toBe(503);
    expect(calls).toHaveLength(4);
    expect(sleeps).toEqual([500, 1000, 2000]);
  });

  it('503 puis 200 → réussit', async () => {
    const { client, calls } = setup([new Response('', { status: 503 }), json({ ok: 1 })]);
    expect(await client.polarFetch(SLEEP_PATH, { token: TOKEN })).toEqual({ ok: 1 });
    expect(calls).toHaveLength(2);
  });

  it('erreur réseau puis 200 → réussit', async () => {
    const { client, calls } = setup([new TypeError('fetch failed'), json({ ok: 1 })]);
    expect(await client.polarFetch(SLEEP_PATH, { token: TOKEN })).toEqual({ ok: 1 });
    expect(calls).toHaveLength(2);
  });

  it('429 × 4 → PolarRateLimitError avec date de reprise', async () => {
    const { client, calls } = setup([1, 2, 3, 4].map(() => () => json({}, 429, { 'Retry-After': '1' })));
    const error = await failure(client.polarFetch(SLEEP_PATH, { token: TOKEN }));
    expect(error).toBeInstanceOf(PolarRateLimitError);
    expect(error.retryAt).toBeInstanceOf(Date);
    expect(calls).toHaveLength(4);
  });

  it('Retry-After plus long que le plafond → PolarRateLimitError immédiate, sans attendre', async () => {
    const { client, sleeps, calls } = setup([json({}, 429, { 'Retry-After': '900' })], { maxWaitMs: 30_000 });
    await expect(client.polarFetch(SLEEP_PATH, { token: TOKEN })).rejects.toBeInstanceOf(PolarRateLimitError);
    expect(sleeps).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

describe('polarFetch : erreurs sans nouvelle tentative', () => {
  it.each([401, 403])('%i → PolarAuthError, une seule requête', async (status) => {
    const { client, calls, sleeps } = setup([new Response('', { status })]);
    const error = await failure(client.polarFetch(SLEEP_PATH, { token: TOKEN }));
    expect(error).toBeInstanceOf(PolarAuthError);
    expect(error.status).toBe(status);
    expect(error.message).not.toContain(TOKEN);
    expect(calls).toHaveLength(1);
    expect(sleeps).toEqual([]);
  });

  it('400 → PolarHttpError, une seule requête', async () => {
    const { client, calls } = setup([new Response('bad', { status: 400 })]);
    const error = await failure(client.polarFetch(SLEEP_PATH, { token: TOKEN }));
    expect(error).toBeInstanceOf(PolarHttpError);
    expect(error.status).toBe(400);
    expect(calls).toHaveLength(1);
  });

  it('statuts métier remontés tels quels (POST /v3/users : 409, 403)', async () => {
    const { client } = setup([new Response('', { status: 409 }), new Response('', { status: 403 })]);
    const opts = { token: TOKEN, method: 'POST' as const, body: { 'member-id': 'x' }, passthroughStatuses: [403, 409] };
    expect((await client.polarRequest('/v3/users', opts)).status).toBe(409);
    expect((await client.polarRequest('/v3/users', opts)).status).toBe(403);
  });
});

describe('polarFetch : quotas RateLimit-*', () => {
  it('lit les deux fenêtres (15 min puis 24 h, reset en secondes)', () => {
    const headers = new Headers(quotaHeaders('10, 200', '500, 5000', '600, 80000'));
    expect(parseRateLimitHeaders(headers, 0)).toEqual([
      { usage: 10, limit: 500, resetAt: 600_000 },
      { usage: 200, limit: 5000, resetAt: 80_000_000 },
    ]);
    expect(parseRateLimitHeaders(new Headers({ 'RateLimit-Usage': '3,3' }), 0)).toBeNull();
  });

  it('quota confortable → aucune attente', async () => {
    const { client, sleeps } = setup([json({}, 200, quotaHeaders('100, 1000', '500, 5000', '600, 80000')), json({})]);
    await client.polarFetch(SLEEP_PATH, { token: TOKEN });
    await client.polarFetch(SLEEP_PATH, { token: TOKEN });
    expect(sleeps).toEqual([]);
  });

  it('quota 15 min presque épuisé (< 10 %) → attend la réinitialisation avant d’envoyer', async () => {
    const { client, sleeps, calls } = setup(
      [json({}, 200, quotaHeaders('460, 1000', '500, 5000', '20, 80000')), json({ ok: 1 })],
      { maxWaitMs: 30_000 }
    );
    await client.polarFetch(SLEEP_PATH, { token: TOKEN });
    expect(await client.polarFetch(SLEEP_PATH, { token: TOKEN })).toEqual({ ok: 1 });
    expect(sleeps).toEqual([20_000]);
    expect(calls).toHaveLength(2);
  });

  it('quota presque épuisé et réinitialisation trop lointaine → PolarRateLimitError, rien envoyé', async () => {
    const { client, calls } = setup([json({}, 200, quotaHeaders('460, 1000', '500, 5000', '600, 80000'))], { maxWaitMs: 30_000 });
    await client.polarFetch(SLEEP_PATH, { token: TOKEN });
    const error = await failure(client.polarFetch(SLEEP_PATH, { token: TOKEN }));
    expect(error).toBeInstanceOf(PolarRateLimitError);
    expect(error.message).toMatch(/quota 15 min presque épuisé \(460\/500\)/);
    expect(error.retryAt?.getTime()).toBe(1_000_000 + 600_000);
    expect(calls).toHaveLength(1);
  });

  it('quota 24 h presque épuisé → PolarRateLimitError', async () => {
    const { client } = setup([json({}, 200, quotaHeaders('10, 4600', '500, 5000', '600, 70000'))]);
    await client.polarFetch(SLEEP_PATH, { token: TOKEN });
    await expect(client.polarFetch(SLEEP_PATH, { token: TOKEN })).rejects.toThrow(/quota 24 h/);
  });

  it('après la réinitialisation, les requêtes reprennent', async () => {
    const { client, advance, calls } = setup([json({}, 200, quotaHeaders('460, 1000', '500, 5000', '600, 80000')), json({ ok: 2 })]);
    await client.polarFetch(SLEEP_PATH, { token: TOKEN });
    advance(601_000);
    expect(await client.polarFetch(SLEEP_PATH, { token: TOKEN })).toEqual({ ok: 2 });
    expect(calls).toHaveLength(2);
  });
});
