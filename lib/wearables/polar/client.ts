// lib/wearables/polar/client.ts
// Point d'entrée unique des appels à l'API AccessLink v3 (hors échange du code OAuth).
//
//  * Quotas (docs/wearables/polar.md §7) : lit RateLimit-Usage / -Limit / -Reset (deux valeurs :
//    fenêtre 15 min puis 24 h ; reset en secondes). Sous 10 % de quota restant, attend la
//    réinitialisation (plafonnée par maxWaitMs) au lieu d'envoyer, sinon lève PolarRateLimitError.
//  * 429 et 5xx (et erreurs réseau) : jusqu'à 3 nouvelles tentatives, délai exponentiel + aléa,
//    Retry-After respecté. Autres 4xx : pas de nouvelle tentative.
//  * 401/403 → PolarAuthError ; 204 et 404 (« No data found for date ») → null.
//  * Le jeton n'apparaît dans aucun message d'erreur.
//
// Module pur (sans `server-only`) : utilisable par l'app et par les scripts tsx.

export const POLAR_API_ORIGIN = 'https://www.polaraccesslink.com';

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------
export class PolarHttpError extends Error {
  constructor(readonly status: number, readonly path: string, detail?: string) {
    super(`Polar ${path} : HTTP ${status}${detail ? ` (${detail})` : ''}`);
    this.name = 'PolarHttpError';
  }
}

/** 401 (jeton invalide ou révoqué) ou 403 (consentements Polar non acceptés). */
export class PolarAuthError extends PolarHttpError {
  constructor(status: number, path: string) {
    super(status, path, status === 403 ? 'consentements Polar non acceptés' : 'accès refusé');
    this.name = 'PolarAuthError';
  }
}

/** Quota épuisé, ou attente nécessaire plus longue que le plafond autorisé. */
export class PolarRateLimitError extends PolarHttpError {
  constructor(path: string, readonly retryAt: Date | null, detail: string) {
    super(429, path, detail);
    this.name = 'PolarRateLimitError';
  }
}

// ---------------------------------------------------------------------------
// Quotas
// ---------------------------------------------------------------------------
export type RateLimitWindow = { usage: number; limit: number; resetAt: number };
/** [fenêtre 15 min, fenêtre 24 h] ; null tant qu'aucune réponse ne les a fournies. */
export type RateLimitState = [RateLimitWindow | null, RateLimitWindow | null];

export const LOW_QUOTA_RATIO = 0.1;

function parsePair(value: string | null): [number, number] | null {
  if (!value) return null;
  const parts = value.split(',').map((v) => Number(v.trim()));
  return parts.length >= 2 && parts.every((n) => Number.isFinite(n)) ? [parts[0], parts[1]] : null;
}

export function parseRateLimitHeaders(headers: Headers, nowMs: number): RateLimitState | null {
  const usage = parsePair(headers.get('RateLimit-Usage'));
  const limit = parsePair(headers.get('RateLimit-Limit'));
  const reset = parsePair(headers.get('RateLimit-Reset'));
  if (!usage || !limit || !reset) return null;
  return [0, 1].map((i) => ({ usage: usage[i], limit: limit[i], resetAt: nowMs + reset[i] * 1000 })) as RateLimitState;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export type PolarAuth = { token: string } | { basic: { clientId: string; clientSecret: string } };

export type PolarFetchOptions = PolarAuth & {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Statuts renvoyés tels quels par polarRequest au lieu de lever (ex. 403/409 sur POST /v3/users). */
  passthroughStatuses?: number[];
  /** Statuts traités comme « pas de données » → data = null. Défaut : 204, et 404 pour les GET. */
  emptyStatuses?: number[];
};

export type PolarResponse<T> = { status: number; data: T | null };

export type PolarClientDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  /** Nouvelles tentatives sur 429/5xx/réseau (défaut 3). */
  maxRetries?: number;
  /** Délai de base du backoff exponentiel (défaut 500 ms). */
  baseDelayMs?: number;
  /** Attente maximale acceptée (quota ou Retry-After) avant de lever PolarRateLimitError (défaut 30 s). */
  maxWaitMs?: number;
};

const MAX_BACKOFF_MS = 8_000;

function resolveUrl(path: string, query?: PolarFetchOptions['query']): URL {
  // Chemin relatif (« /v3/… ») ou URL absolue de l'API (ressource d'un webhook). Rien d'autre :
  // le jeton de l'utilisateur ne doit jamais partir vers un autre hôte.
  const url = new URL(path, POLAR_API_ORIGIN);
  if (url.origin !== POLAR_API_ORIGIN || !url.pathname.startsWith('/v3/')) {
    throw new Error('polarFetch : URL hors de l’API AccessLink refusée');
  }
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  return url;
}

function retryAfterMs(headers: Headers, nowMs: number): number | null {
  const v = headers.get('Retry-After');
  if (!v) return null;
  const seconds = Number(v);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(v);
  return Number.isNaN(date) ? null : Math.max(0, date - nowMs);
}

export function createPolarClient(deps: PolarClientDeps = {}) {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = deps.now ?? Date.now;
  const random = deps.random ?? Math.random;
  const maxRetries = deps.maxRetries ?? 3;
  const baseDelayMs = deps.baseDelayMs ?? 500;
  const maxWaitMs = deps.maxWaitMs ?? 30_000;

  // Quotas du client partenaire (communs à tous les appels de ce processus).
  let quota: RateLimitState = [null, null];

  /** Avant d'envoyer : attend la réinitialisation si une fenêtre est sous 10 % restant. */
  async function waitForQuota(path: string) {
    for (let i = 0; i < 2; i++) {
      const w = quota[i];
      if (!w) continue;
      const t = now();
      if (t >= w.resetAt) {
        quota[i] = null;
        continue;
      }
      if (w.limit - w.usage >= w.limit * LOW_QUOTA_RATIO) continue;
      const wait = w.resetAt - t;
      const label = i === 0 ? '15 min' : '24 h';
      if (wait > maxWaitMs) {
        throw new PolarRateLimitError(path, new Date(w.resetAt), `quota ${label} presque épuisé (${w.usage}/${w.limit})`);
      }
      await sleep(wait);
      quota[i] = null;
    }
  }

  function backoff(attempt: number): number {
    return Math.min(MAX_BACKOFF_MS, baseDelayMs * 2 ** attempt + random() * baseDelayMs);
  }

  async function polarRequest<T = unknown>(path: string, options: PolarFetchOptions): Promise<PolarResponse<T>> {
    const method = options.method ?? 'GET';
    const url = resolveUrl(path, options.query);
    const label = url.pathname;
    const emptyStatuses = options.emptyStatuses ?? (method === 'GET' ? [204, 404] : [204]);
    const authorization =
      'token' in options
        ? `Bearer ${options.token}`
        : 'Basic ' + Buffer.from(`${options.basic.clientId}:${options.basic.clientSecret}`).toString('base64');

    for (let attempt = 0; ; attempt++) {
      await waitForQuota(label);

      let res: Response;
      try {
        res = await doFetch(url.toString(), {
          method,
          headers: {
            Authorization: authorization,
            Accept: 'application/json',
            ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          cache: 'no-store',
        });
      } catch (error) {
        if (attempt >= maxRetries) throw new Error(`Polar ${label} : erreur réseau (${(error as Error).message})`);
        await sleep(backoff(attempt));
        continue;
      }

      const limits = parseRateLimitHeaders(res.headers, now());
      if (limits) quota = limits;

      if (res.status === 429 || res.status >= 500) {
        const hinted = retryAfterMs(res.headers, now());
        const delay = hinted ?? backoff(attempt);
        if (attempt >= maxRetries || delay > maxWaitMs) {
          if (res.status === 429) {
            const retryAt = hinted !== null ? new Date(now() + hinted) : quota[0] ? new Date(quota[0].resetAt) : null;
            throw new PolarRateLimitError(label, retryAt, attempt >= maxRetries ? 'trop de requêtes, tentatives épuisées' : 'Retry-After trop long');
          }
          throw new PolarHttpError(res.status, label, `${attempt + 1} tentative(s)`);
        }
        await sleep(delay);
        continue;
      }

      if (options.passthroughStatuses?.includes(res.status)) {
        return { status: res.status, data: await readJson<T>(res) };
      }
      if (emptyStatuses.includes(res.status)) return { status: res.status, data: null };
      if (res.status === 401 || res.status === 403) throw new PolarAuthError(res.status, label);
      if (!res.ok) throw new PolarHttpError(res.status, label);
      return { status: res.status, data: await readJson<T>(res) };
    }
  }

  async function readJson<T>(res: Response): Promise<T | null> {
    const text = await res.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new PolarHttpError(res.status, new URL(res.url || POLAR_API_ORIGIN).pathname, 'réponse JSON invalide');
    }
  }

  /** Données de la ressource, ou null (204, 404 « pas de données », corps vide). */
  async function polarFetch<T = unknown>(path: string, options: PolarFetchOptions): Promise<T | null> {
    return (await polarRequest<T>(path, options)).data;
  }

  return {
    polarFetch,
    polarRequest,
    getRateLimitState: (): RateLimitState => [...quota] as RateLimitState,
    resetRateLimitState: () => {
      quota = [null, null];
    },
  };
}

const defaultClient = createPolarClient();
export const polarFetch = defaultClient.polarFetch;
export const polarRequest = defaultClient.polarRequest;
export const getRateLimitState = defaultClient.getRateLimitState;
