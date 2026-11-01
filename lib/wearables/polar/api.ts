// lib/wearables/polar/api.ts
// Appels AccessLink du serveur qui ont besoin de la config (identifiants client).
// Tous les appels passent par polarFetch (lib/wearables/polar/client.ts).
import 'server-only';
import { PolarAuthError, polarFetch } from './client';
import { getPolarConfig } from './config';

export { PolarAuthError, PolarHttpError, PolarRateLimitError, polarFetch } from './client';

/** 401/403 de Polar : la connexion doit passer en erreur (reconnexion nécessaire). */
export const isAccessRevoked = (error: unknown): error is PolarAuthError => error instanceof PolarAuthError;

export type WebhookStatus =
  | { exists: false }
  | { exists: true; id: string; url: string; events: string[]; active: boolean };

/** GET /v3/webhooks (Basic auth client). La réponse est un tableau `data`. */
export async function getWebhookStatus(): Promise<WebhookStatus> {
  const { clientId, clientSecret } = getPolarConfig();
  const body = await polarFetch<{ data?: unknown }>('/v3/webhooks', { basic: { clientId, clientSecret } });
  const list = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
  const w = list[0] as { id?: string; url?: string; events?: string[]; active?: boolean } | undefined;
  if (!w?.id) return { exists: false };
  return { exists: true, id: w.id, url: w.url ?? '', events: w.events ?? [], active: w.active !== false };
}
