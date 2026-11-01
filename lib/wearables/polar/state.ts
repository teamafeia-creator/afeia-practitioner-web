// lib/wearables/polar/state.ts
// Paramètre `state` OAuth signé (HMAC-SHA256) : protège le callback contre le CSRF
// et transporte le consultant et la page de retour sans session côté navigateur.
// Format : base64url(JSON payload) + "." + base64url(HMAC(payload)).
// Module pur (pas de `server-only`) pour rester testable ; le secret vient de la config serveur.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const STATE_TTL_SECONDS = 10 * 60;
export const DEFAULT_RETURN_TO = '/consultant/home';

export type StatePayload = {
  /** Identifiant du consultant (consultants.id). */
  cid: string;
  /** Aléa de 128 bits, consommé une seule fois au callback. */
  nonce: string;
  /** Expiration, en secondes Unix. */
  exp: number;
  /** Page de retour, déjà validée par sanitizeReturnTo. */
  returnTo: string;
};

export type StateErrorReason = 'missing' | 'malformed' | 'bad_signature' | 'expired';

export class InvalidStateError extends Error {
  constructor(readonly reason: StateErrorReason) {
    super(`state OAuth invalide : ${reason}`);
    this.name = 'InvalidStateError';
  }
}

const b64url = (buf: Buffer) => buf.toString('base64url');
const hmac = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest();

/**
 * N'accepte que des destinations internes, pour éviter une redirection ouverte :
 *  - un chemin relatif à l'app (`/…`, mais pas `//…` ni `/\…`) ;
 *  - un lien profond de l'app mobile (`afeia://…`).
 */
export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) return DEFAULT_RETURN_TO;
  if (value.startsWith('afeia://')) return value;
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) return value;
  return DEFAULT_RETURN_TO;
}

export function signState(
  input: { consultantId: string; returnTo?: string | null },
  secret: string,
  now: Date = new Date()
): { state: string; payload: StatePayload } {
  const payload: StatePayload = {
    cid: input.consultantId,
    nonce: b64url(randomBytes(16)),
    exp: Math.floor(now.getTime() / 1000) + STATE_TTL_SECONDS,
    returnTo: sanitizeReturnTo(input.returnTo),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return { state: `${body}.${b64url(hmac(body, secret))}`, payload };
}

export function verifyState(state: string | null | undefined, secret: string, now: Date = new Date()): StatePayload {
  if (!state) throw new InvalidStateError('missing');

  const parts = state.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new InvalidStateError('malformed');
  const [body, signature] = parts;

  const expected = hmac(body, secret);
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new InvalidStateError('bad_signature');
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidStateError('malformed');
  }
  if (
    typeof payload?.cid !== 'string' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.exp !== 'number' ||
    typeof payload.returnTo !== 'string'
  ) {
    throw new InvalidStateError('malformed');
  }
  if (payload.exp <= Math.floor(now.getTime() / 1000)) throw new InvalidStateError('expired');

  // Défense en profondeur : la signature garantit déjà que returnTo vient de nous.
  return { ...payload, returnTo: sanitizeReturnTo(payload.returnTo) };
}
