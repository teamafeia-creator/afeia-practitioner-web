// lib/wearables/polar/api.ts
// Appels de lecture à l'API AccessLink (jeton utilisateur) et au webhook (identifiants client).
// Jamais de jeton ni de corps de réponse dans les erreurs.
import 'server-only';
import { getPolarConfig } from './config';
import { POLAR_API_ORIGIN } from './webhook';

export class PolarHttpError extends Error {
  constructor(readonly status: number, path: string) {
    super(`Polar ${path} : HTTP ${status}`);
    this.name = 'PolarHttpError';
  }
}

export const isAccessRevoked = (error: unknown) =>
  error instanceof PolarHttpError && (error.status === 401 || error.status === 403);

export type Fetched = { status: 'ok'; json: unknown } | { status: 'empty' };

/** GET avec le jeton utilisateur. 204/404 ou corps vide → `empty`. */
export async function fetchPolar(url: string, token: string): Promise<Fetched> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  const path = new URL(url).pathname;
  if (res.status === 204 || res.status === 404) return { status: 'empty' };
  if (!res.ok) throw new PolarHttpError(res.status, path);
  const text = await res.text();
  if (!text.trim()) return { status: 'empty' };
  try {
    return { status: 'ok', json: JSON.parse(text) };
  } catch {
    throw new Error(`Polar ${path} : réponse JSON invalide`);
  }
}

export type WebhookStatus =
  | { exists: false }
  | { exists: true; id: string; url: string; events: string[]; active: boolean };

/** GET /v3/webhooks (Basic auth client). La réponse est un tableau `data`. */
export async function getWebhookStatus(): Promise<WebhookStatus> {
  const { clientId, clientSecret } = getPolarConfig();
  const res = await fetch(`${POLAR_API_ORIGIN}/v3/webhooks`, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new PolarHttpError(res.status, '/v3/webhooks');
  const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
  const list = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
  const w = list[0] as { id?: string; url?: string; events?: string[]; active?: boolean } | undefined;
  if (!w?.id) return { exists: false };
  return { exists: true, id: w.id, url: w.url ?? '', events: w.events ?? [], active: w.active !== false };
}
