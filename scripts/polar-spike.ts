/**
 * POL-03 · Spike jetable : récupérer une nuit de sommeil Polar avec son propre compte.
 *
 * Usage : npm run polar:spike
 *
 * Prérequis :
 *  - .env.local contient POLAR_CLIENT_ID, POLAR_CLIENT_SECRET, POLAR_REDIRECT_URI
 *    (client « Afeia dev », redirect http://localhost:3000/api/wearables/polar/callback) ;
 *  - le port du redirect URI est libre (arrêter `next dev` pendant le spike) ;
 *  - FC continue activée sur la Loop et au moins une nuit synchronisée dans Polar Flow.
 *
 * Le jeton d'accès reste en mémoire : il n'est jamais écrit sur disque ni affiché.
 * Les réponses sont anonymisées puis écrites dans lib/wearables/polar/__fixtures__/.
 *
 * Référence : docs/wearables/polar.md
 */
import { spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { getRateLimitState, polarRequest } from '../lib/wearables/polar/client';
import { parsePolarConfig } from '../lib/wearables/polar/env';

const AUTHORIZE_URL = 'https://flow.polar.com/oauth2/authorization';
const TOKEN_URL = 'https://polarremote.com/v2/oauth2/token';
const MEMBER_ID = 'afeia-spike-test';
const FIXTURES_DIR = path.resolve(__dirname, '../lib/wearables/polar/__fixtures__');
const CALLBACK_TIMEOUT_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// 0. Configuration
// ---------------------------------------------------------------------------
for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const config = parsePolarConfig(process.env);
const redirect = new URL(config.redirectUri);
const port = Number(redirect.port || (redirect.protocol === 'https:' ? 443 : 80));
if (!['localhost', '127.0.0.1'].includes(redirect.hostname)) {
  throw new Error(`POLAR_REDIRECT_URI doit pointer vers localhost pour le spike (client « Afeia dev »).`);
}
const basicAuth = 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

// ---------------------------------------------------------------------------
// 1-2. Mini serveur local + URL d'autorisation avec state aléatoire
// ---------------------------------------------------------------------------
function waitForAuthorizationCode(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      if (url.pathname !== redirect.pathname) {
        res.writeHead(404).end();
        return;
      }

      const finish = (status: number, message: string, error?: Error) => {
        res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<p>${message}</p><p>Vous pouvez fermer cet onglet.</p>`);
        clearTimeout(timer);
        server.close();
        if (error) reject(error);
      };

      const error = url.searchParams.get('error');
      if (error) return finish(400, `Erreur Polar : ${error}`, new Error(`Autorisation refusée : ${error}`));

      const state = url.searchParams.get('state') ?? '';
      const stateOk =
        state.length === expectedState.length &&
        timingSafeEqual(Buffer.from(state), Buffer.from(expectedState));
      if (!stateOk) return finish(400, 'State invalide.', new Error('State invalide : possible CSRF, abandon.'));

      const code = url.searchParams.get('code');
      if (!code) return finish(400, 'Code manquant.', new Error('Aucun code dans la redirection.'));

      finish(200, 'Autorisation reçue, retournez au terminal.');
      resolve(code);
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Pas de retour de Polar après 5 minutes, abandon.'));
    }, CALLBACK_TIMEOUT_MS);

    server.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Impossible d'écouter sur le port ${port} (next dev tourne-t-il ?) : ${err.message}`));
    });
    server.listen(port, () => console.log(`→ Serveur local en écoute sur ${redirect.origin}${redirect.pathname}`));
  });
}

function openInBrowser(url: string) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  try {
    spawn(command, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    // Pas de navigateur disponible : l'URL est affichée de toute façon.
  }
}

// ---------------------------------------------------------------------------
// Appels HTTP
// ---------------------------------------------------------------------------
async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function polarGet(accessToken: string, pathAndQuery: string): Promise<{ status: number; body: unknown }> {
  // Client commun (quotas, nouvelles tentatives) ; 400 renvoyé tel quel pour l'afficher.
  const { status, data } = await polarRequest(pathAndQuery, { token: accessToken, passthroughStatuses: [400] });
  const [short] = getRateLimitState();
  console.log(`  GET ${pathAndQuery} → ${status}${short ? ` (quota 15 min : ${short.usage}/${short.limit})` : ''}`);
  return { status, body: data };
}

// ---------------------------------------------------------------------------
// 6. Anonymisation
// ---------------------------------------------------------------------------
const FAKE_USER_ID = 123456;
const FAKE_MEMBER_ID = 'member-fixture';

/** Clés dont la valeur est remplacée, quelle que soit leur profondeur. */
const REPLACEMENTS: Record<string, unknown> = {
  'x_user_id': FAKE_USER_ID,
  'polar-user-id': FAKE_USER_ID,
  'user_id': FAKE_USER_ID,
  'member-id': FAKE_MEMBER_ID,
  'device_id': 'DEVICE00',
  'first-name': 'Prénom',
  'last-name': 'Nom',
  'birthdate': '1990-01-01',
  'gender': 'FEMALE',
  'weight': 60,
  'height': 165,
};

function anonymize(value: unknown, realUserId: string): unknown {
  if (Array.isArray(value)) return value.map((v) => anonymize(v, realUserId));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        key in REPLACEMENTS ? REPLACEMENTS[key] : anonymize(v, realUserId),
      ])
    );
  }
  if (typeof value === 'string') {
    // URLs du type https://www.polaraccesslink.com/v3/users/<id>/…
    return value
      .replace(new RegExp(`/users/${realUserId}(?=[/?#]|$)`, 'g'), `/users/${FAKE_USER_ID}`)
      .split(MEMBER_ID)
      .join(FAKE_MEMBER_ID);
  }
  return value;
}

function saveFixture(name: string, body: unknown, realUserId: string) {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  const file = path.join(FIXTURES_DIR, `${name}.json`);
  const json = JSON.stringify(anonymize(body, realUserId), null, 2) + '\n';
  if (new RegExp(`\\b${realUserId}\\b`).test(json) || json.includes(MEMBER_ID)) {
    throw new Error(`Anonymisation incomplète pour ${name} : identifiant réel encore présent, fichier non écrit.`);
  }
  writeFileSync(file, json);
  console.log(`  ✓ fixture ${path.relative(process.cwd(), file)}`);
}

// ---------------------------------------------------------------------------
// Utilitaires de dates (jours calendaires locaux, format YYYY-MM-DD)
// ---------------------------------------------------------------------------
function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const sevenDaysAgo = isoDate(7);
const withinLastSevenDays = (item: { date?: string }) => !!item.date && item.date >= sevenDaysAgo;

// ---------------------------------------------------------------------------
// Déroulé
// ---------------------------------------------------------------------------
async function main() {
  // 1-2. Autorisation
  const state = randomBytes(16).toString('hex');
  const authorizeUrl = new URL(AUTHORIZE_URL);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'accesslink.read_all',
    state,
  }).toString();

  const codePromise = waitForAuthorizationCode(state);
  console.log(`\n1. Ouvrez cette URL pour autoriser Afeia :\n\n   ${authorizeUrl}\n`);
  openInBrowser(authorizeUrl.toString());
  const code = await codePromise;
  console.log('   Code reçu, state vérifié.');

  // 3. Échange du code contre un jeton
  console.log('\n2. Échange du code contre un jeton');
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json;charset=UTF-8',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });
  const token = (await readBody(tokenRes)) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    x_user_id?: number;
    error?: string;
  };
  if (!tokenRes.ok || !token?.access_token || token.x_user_id == null) {
    throw new Error(`Échange du jeton échoué (${tokenRes.status}) : ${token?.error ?? 'réponse inattendue'}`);
  }
  const accessToken = token.access_token; // en mémoire uniquement
  const userId = String(token.x_user_id);
  const expiresDays = token.expires_in ? Math.round(token.expires_in / 86400) : '?';
  console.log(`   OK : token_type=${token.token_type}, expires_in=${token.expires_in}s (~${expiresDays} j), jeton de ${accessToken.length} caractères (non affiché)`);
  // Fixture du jeton : sans le jeton lui-même, seulement la forme de la réponse.
  saveFixture('token-response', { ...token, access_token: 'fixture-access-token' }, userId);

  // 4. Enregistrement de l'utilisateur
  console.log('\n3. Enregistrement de l\'utilisateur (POST /v3/users)');
  const { status: registerStatus, data: registerBody } = await polarRequest('/v3/users', {
    token: accessToken,
    method: 'POST',
    body: { 'member-id': MEMBER_ID },
    passthroughStatuses: [403, 409],
  });
  const registerRes = { status: registerStatus };
  if (registerRes.status === 200) {
    console.log('   200 : utilisateur enregistré.');
    saveFixture('register-user-200', registerBody, userId);
  } else if (registerRes.status === 409) {
    console.log('   409 : déjà enregistré, on continue.');
    const user = await polarGet(accessToken, `/v3/users/${userId}`);
    if (user.status === 200) saveFixture('get-user', user.body, userId);
  } else if (registerRes.status === 403) {
    throw new Error('403 : consentements obligatoires non acceptés, voir https://account.polar.com');
  } else {
    throw new Error(`Enregistrement inattendu : HTTP ${registerRes.status}`);
  }

  // 5. Lecture des données
  console.log('\n4. Lecture des données');

  // Sommeil : la liste couvre 28 jours, on garde les 7 derniers.
  const sleepList = await polarGet(accessToken, '/v3/users/sleep');
  const nights = ((sleepList.body as { nights?: { date?: string }[] })?.nights ?? []).filter(withinLastSevenDays);
  saveFixture('sleep-list-7d', { nights }, userId);

  // Nightly Recharge : idem.
  const rechargeList = await polarGet(accessToken, '/v3/users/nightly-recharge');
  const recharges = ((rechargeList.body as { recharges?: { date?: string }[] })?.recharges ?? []).filter(withinLastSevenDays);
  saveFixture('nightly-recharge-list-7d', { recharges }, userId);

  // Une nuit et une recharge en détail (forme de la réponse /{date}).
  const lastNight = [...nights].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
  if (lastNight?.date) {
    const sleep = await polarGet(accessToken, `/v3/users/sleep/${lastNight.date}`);
    if (sleep.status === 200) saveFixture('sleep-by-date', sleep.body, userId);
    const recharge = await polarGet(accessToken, `/v3/users/nightly-recharge/${lastNight.date}`);
    if (recharge.status === 200) saveFixture('nightly-recharge-by-date', recharge.body, userId);
  }

  // FC continue et activité : hier (journée complète).
  const day = isoDate(1);
  const hr = await polarGet(accessToken, `/v3/users/continuous-heart-rate/${day}`);
  if (hr.status === 200) saveFixture('continuous-heart-rate-by-date', hr.body, userId);
  const activity = await polarGet(accessToken, `/v3/users/activities/${day}?steps=true&activity_zones=true&inactivity_stamps=true`);
  if (activity.status === 200) saveFixture('activity-by-date', activity.body, userId);

  // Affichage
  console.log('\n5. Résumé');
  const night = lastNight as Record<string, unknown> | undefined;
  const nr = [...recharges].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0] as
    | Record<string, unknown>
    | undefined;
  if (night) {
    console.log(
      `   Sommeil ${night.date} : ${night.sleep_start_time} → ${night.sleep_end_time}, score ${night.sleep_score}, ` +
        `léger ${night.light_sleep}s / profond ${night.deep_sleep}s / paradoxal ${night.rem_sleep}s`
    );
  } else {
    console.log('   ⚠ Aucune nuit sur les 7 derniers jours (Loop synchronisée ? FC continue activée ?).');
  }
  if (nr) {
    console.log(
      `   Nightly Recharge ${nr.date} : statut ${nr.nightly_recharge_status}, charge SNA ${nr.ans_charge}, ` +
        `FC moy ${nr.heart_rate_avg} bpm, HRV moy ${nr.heart_rate_variability_avg} ms, respiration ${nr.breathing_rate_avg}/min`
    );
  } else {
    console.log('   ⚠ Aucune Nightly Recharge sur les 7 derniers jours (il en faut 3 nuits pour démarrer).');
  }
  const hrSamples = (hr.body as { heart_rate_samples?: unknown[] })?.heart_rate_samples?.length ?? 0;
  console.log(`   FC continue ${day} : ${hrSamples} échantillons`);
  const act = activity.body as Record<string, unknown> | null;
  if (act && typeof act === 'object') console.log(`   Activité ${day} : ${act.steps} pas, ${act.calories} kcal`);

  console.log(`\nFixtures écrites dans ${path.relative(process.cwd(), FIXTURES_DIR)}/ : relisez-les avant de commiter.`);
}

main().catch((err: Error) => {
  // Seul le message est affiché : aucune variable d'environnement ni jeton.
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
