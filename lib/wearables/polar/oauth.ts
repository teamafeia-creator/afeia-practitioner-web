// lib/wearables/polar/oauth.ts
// Appels HTTP du flux OAuth Polar AccessLink (docs/wearables/polar.md §4-5).
// Aucun accès base ici. Le jeton n'est jamais logué ni inclus dans une erreur.
import 'server-only';
import { polarRequest } from './client';
import { getPolarConfig } from './config';

export const POLAR_AUTHORIZE_URL = 'https://flow.polar.com/oauth2/authorization';
export const POLAR_TOKEN_URL = 'https://polarremote.com/v2/oauth2/token';
export const POLAR_SCOPE = 'accesslink.read_all';

export class PolarOAuthError extends Error {
  constructor(
    readonly step: 'token_exchange' | 'register_user',
    readonly status: number,
    detail?: string
  ) {
    super(`Polar ${step} a échoué (HTTP ${status})${detail ? ` : ${detail}` : ''}`);
    this.name = 'PolarOAuthError';
  }
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getPolarConfig();
  const url = new URL(POLAR_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: POLAR_SCOPE,
    state,
  }).toString();
  return url.toString();
}

export type PolarToken = {
  accessToken: string;
  /** Durée de vie annoncée par Polar, en secondes (≈ 1 an), ou null si absente. */
  expiresIn: number | null;
  /** Identifiant utilisateur Polar (`x_user_id`). */
  polarUserId: string;
};

/**
 * Échange le code d'autorisation contre un jeton.
 * Attention : un code ne doit être échangé qu'une fois ; une réutilisation fait
 * supprimer par Polar tous les jetons déjà émis (le callback garantit l'usage unique).
 */
export async function exchangeCode(code: string): Promise<PolarToken> {
  const { clientId, clientSecret, redirectUri } = getPolarConfig();
  const res = await fetch(POLAR_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json;charset=UTF-8',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    cache: 'no-store',
  });

  let body: { access_token?: unknown; expires_in?: unknown; x_user_id?: unknown; error?: unknown } = {};
  try {
    body = await res.json();
  } catch {
    // corps non JSON : traité ci-dessous comme une réponse invalide
  }

  if (!res.ok || typeof body.access_token !== 'string' || !body.access_token || body.x_user_id == null) {
    // Seul le code d'erreur OAuth est remonté (jamais le corps complet).
    throw new PolarOAuthError('token_exchange', res.status, typeof body.error === 'string' ? body.error : undefined);
  }

  return {
    accessToken: body.access_token,
    expiresIn: typeof body.expires_in === 'number' ? body.expires_in : null,
    polarUserId: String(body.x_user_id),
  };
}

export type RegisterUserResult = 'registered' | 'already_registered' | 'consents_missing';

/** POST /v3/users. 200 → registered, 409 → already_registered, 403 → consents_missing. */
export async function registerUser(accessToken: string, memberId: string): Promise<RegisterUserResult> {
  // 403 = consentements manquants et 409 = déjà inscrit : réponses métier, pas des erreurs.
  const { status } = await polarRequest('/v3/users', {
    token: accessToken,
    method: 'POST',
    body: { 'member-id': memberId },
    passthroughStatuses: [403, 409],
  });
  if (status === 200 || status === 201) return 'registered';
  if (status === 409) return 'already_registered';
  if (status === 403) return 'consents_missing';
  throw new PolarOAuthError('register_user', status);
}
