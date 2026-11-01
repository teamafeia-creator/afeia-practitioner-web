// GET /api/wearables/polar/callback?code=…&state=…  (ou ?error=access_denied&state=…)
// Retour de Polar après l'autorisation. Pas de session ici : le consultant et la page
// de retour viennent du `state` signé (lib/wearables/polar/state.ts).
//
// Ordre imposé : state vérifié → nonce consommé (usage unique, AVANT tout échange :
// un code échangé deux fois fait supprimer par Polar tous les jetons) → échange du code
// → POST /v3/users → saveConnection → redirection vers returnTo?wearable=…
//
// Le jeton ne quitte jamais le serveur : ni log, ni réponse, ni URL.
import { NextRequest, NextResponse } from 'next/server';
import { runInBackground } from '@/lib/server/background';
import { saveConnection } from '@/lib/wearables/connections';
import { consumeOAuthState } from '@/lib/wearables/oauth-states';
import { runBackfill } from '@/lib/wearables/polar/backfill';
import { getPolarConfig, type PolarConfig } from '@/lib/wearables/polar/config';
import type { PolarConnectReason } from '@/lib/wearables/polar/messages';
import { exchangeCode, registerUser, type PolarToken } from '@/lib/wearables/polar/oauth';
import { InvalidStateError, verifyState, type StatePayload } from '@/lib/wearables/polar/state';
import { POLAR_UNAVAILABLE_MESSAGE, logPolarUnavailable, missingPolarVariables } from '@/lib/wearables/polar/unavailable';

export const dynamic = 'force-dynamic';
/** L'import d'historique continue après la réponse (waitUntil) dans cette limite. */
export const maxDuration = 300;
const BACKFILL_BUDGET_MS = 240_000;

const LOG_PREFIX = '[wearables/polar/callback]';

function htmlPage(message: string, status: number) {
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Connexion Polar</title>
<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">
<h1>Connexion Polar impossible</h1><p>${message}</p>
<p>Revenez dans Afeia et relancez la connexion depuis votre espace.</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const badRequest = (message: string) => htmlPage(message, 400);

function redirectTo(config: PolarConfig, returnTo: string, outcome: 'connected' | 'error', reason?: PolarConnectReason) {
  // returnTo est déjà validé (chemin interne ou afeia://). Les chemins sont résolus
  // sur l'origine du redirect URI configuré.
  const url = new URL(returnTo, new URL(config.redirectUri).origin);
  url.searchParams.set('wearable', outcome);
  if (reason) url.searchParams.set('reason', reason);
  else url.searchParams.delete('reason');
  const res = NextResponse.redirect(url, 303);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // 0. Config OAuth vérifiée à la demande : incomplète → 503 (page claire), rien d'autre n'est tenté.
  let config: PolarConfig;
  try {
    config = getPolarConfig();
  } catch (error) {
    const variables = missingPolarVariables(error);
    if (!variables) throw error;
    logPolarUnavailable('callback', variables);
    return htmlPage(POLAR_UNAVAILABLE_MESSAGE, 503);
  }

  // 1. State signé : absent, falsifié ou expiré → 400 (returnTo non fiable, pas de redirection).
  let state: StatePayload;
  try {
    state = verifyState(params.get('state'), config.stateSecret);
  } catch (error) {
    const reason = error instanceof InvalidStateError ? error.reason : 'malformed';
    console.warn(LOG_PREFIX, 'state refusé', { reason });
    return badRequest(
      reason === 'expired'
        ? 'Le lien de connexion a expiré (10 minutes).'
        : 'Le lien de connexion est invalide.'
    );
  }

  // 2. Usage unique, avant toute autre action.
  let firstUse: boolean;
  try {
    firstUse = await consumeOAuthState({
      nonce: state.nonce,
      consultantId: state.cid,
      provider: 'polar',
      expiresAt: new Date(state.exp * 1000),
    });
  } catch (error) {
    console.error(LOG_PREFIX, 'consommation du state impossible', { consultantId: state.cid, message: (error as Error).message });
    return redirectTo(config, state.returnTo, 'error', 'server_error');
  }
  if (!firstUse) {
    console.warn(LOG_PREFIX, 'state déjà utilisé', { consultantId: state.cid });
    return badRequest('Ce lien de connexion a déjà été utilisé.');
  }

  // 3. Refus ou erreur renvoyés par Polar : aucune connexion créée.
  const polarError = params.get('error');
  if (polarError) {
    console.info(LOG_PREFIX, 'autorisation non accordée', { consultantId: state.cid, error: polarError });
    return redirectTo(config, state.returnTo, 'error', polarError === 'access_denied' ? 'access_denied' : 'polar_error');
  }
  const code = params.get('code');
  if (!code) {
    return redirectTo(config, state.returnTo, 'error', 'polar_error');
  }

  // 4. Échange du code.
  let token: PolarToken;
  try {
    token = await exchangeCode(code);
  } catch (error) {
    console.error(LOG_PREFIX, 'échange du code échoué', { consultantId: state.cid, message: (error as Error).message });
    return redirectTo(config, state.returnTo, 'error', 'token_exchange_failed');
  }

  // 5. Enregistrement chez Polar (member-id = UUID du consultant).
  try {
    const registration = await registerUser(token.accessToken, state.cid);
    if (registration === 'consents_missing') {
      console.info(LOG_PREFIX, 'consentements Polar manquants', { consultantId: state.cid });
      return redirectTo(config, state.returnTo, 'error', 'polar_consents_missing');
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'enregistrement Polar échoué', { consultantId: state.cid, message: (error as Error).message });
    return redirectTo(config, state.returnTo, 'error', 'register_failed');
  }

  // 6. Connexion enregistrée (jeton chiffré dans Vault ; import d'historique remis en pending).
  let connectionId: string;
  try {
    connectionId = await saveConnection({
      consultantId: state.cid,
      provider: 'polar',
      providerUserId: token.polarUserId,
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
    });
  } catch (error) {
    console.error(LOG_PREFIX, 'enregistrement de la connexion échoué', { consultantId: state.cid, message: (error as Error).message });
    return redirectTo(config, state.returnTo, 'error', 'save_failed');
  }

  // 7. Import de l'historique en arrière-plan : la redirection n'attend pas.
  runInBackground(`backfill ${connectionId}`, () => runBackfill(connectionId, { maxDurationMs: BACKFILL_BUDGET_MS }));

  console.info(LOG_PREFIX, 'connexion Polar enregistrée', { consultantId: state.cid });
  return redirectTo(config, state.returnTo, 'connected');
}
