// lib/wearables/polar/webhook.ts
// Signature et lecture des notifications webhook Polar (docs/wearables/polar.md §6).
// Module pur (testable) : aucun accès base, aucun secret en dur.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_HEADER = 'polar-webhook-signature';
export const EVENT_HEADER = 'polar-webhook-event';
export const POLAR_API_ORIGIN = 'https://www.polaraccesslink.com';

/** HMAC-SHA256 (hex) du corps BRUT, comparé en temps constant. */
export function verifyPolarSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex'), 'utf8');
  const received = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function signPolarPayload(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

export type PolarNotification = {
  event: string;
  userId: string;
  date: string | null;
  entityId: string | null;
  url: string | null;
  timestamp: string | null;
};

export class InvalidPayloadError extends Error {}

/** Lit et valide une notification (hors PING). */
export function parsePolarNotification(rawBody: string): PolarNotification {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new InvalidPayloadError('corps JSON invalide');
  }
  if (!body || typeof body !== 'object') throw new InvalidPayloadError('corps invalide');

  const event = typeof body.event === 'string' ? body.event : null;
  const userId = typeof body.user_id === 'number' || typeof body.user_id === 'string' ? String(body.user_id) : null;
  if (!event || !userId) throw new InvalidPayloadError('event ou user_id manquant');

  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  return {
    event,
    userId,
    date,
    entityId: typeof body.entity_id === 'string' ? body.entity_id : null,
    url: typeof body.url === 'string' ? body.url : null,
    timestamp: typeof body.timestamp === 'string' ? body.timestamp : null,
  };
}

/** Une ligne par ressource : pas de timestamp (il change à chaque renvoi de Polar). */
export function idempotencyKey(n: Pick<PolarNotification, 'event' | 'userId' | 'date' | 'entityId' | 'url'>): string {
  return `polar:${n.event}:${n.userId}:${n.date ?? n.entityId ?? n.url ?? 'none'}`;
}

/**
 * N'accepte que des URL de l'API Polar : le jeton de l'utilisateur est envoyé à cette URL,
 * il ne doit jamais partir vers un autre hôte.
 */
export function isPolarApiUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.origin === POLAR_API_ORIGIN && u.pathname.startsWith('/v3/');
  } catch {
    return false;
  }
}
