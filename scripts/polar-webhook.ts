/**
 * POL-07 · Administration du webhook Polar AccessLink (un seul webhook par client).
 *
 * Usage :
 *   npm run polar:webhook -- get
 *   npm run polar:webhook -- create [--url https://afeia.fr/api/webhooks/polar] [--events SLEEP,CONTINUOUS_HEART_RATE,ACTIVITY_SUMMARY] [--skip-preflight]
 *   npm run polar:webhook -- update [--url …] [--events …]
 *   npm run polar:webhook -- activate | deactivate
 *   npm run polar:webhook -- delete [--yes]
 *
 * Options communes :
 *   --env-file <fichier>  fichier d'env à charger (défaut : .env.local puis .env).
 *                         Pour le client « Afeia prod », pointer vers un fichier contenant ses identifiants.
 *
 * Authentification : Basic base64(POLAR_CLIENT_ID:POLAR_CLIENT_SECRET).
 * Référence : docs/wearables/polar.md §6.
 *
 * Le signature_secret_key renvoyé par `create` est affiché UNE fois et n'est écrit nulle part.
 */
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { polarRequest } from '../lib/wearables/polar/client';

const WEBHOOKS_PATH = '/v3/webhooks';
const DEFAULT_URL = 'https://afeia.fr/api/webhooks/polar';
/** Événements du périmètre MVP (fiche §3). Il n'existe pas d'événement Nightly Recharge. */
const MVP_EVENTS = ['SLEEP', 'CONTINUOUS_HEART_RATE', 'ACTIVITY_SUMMARY'] as const;
const KNOWN_EVENTS = [
  'EXERCISE',
  'SLEEP',
  'CONTINUOUS_HEART_RATE',
  'SLEEP_WISE_CIRCADIAN_BEDTIME',
  'SLEEP_WISE_ALERTNESS',
  'ACTIVITY_SUMMARY',
  'PHYSICAL_INFORMATION',
];
const COMMANDS = ['create', 'get', 'update', 'activate', 'deactivate', 'delete'] as const;
type Command = (typeof COMMANDS)[number];

type WebhookInfo = { id: string; events: string[]; url: string; active?: boolean };

// ---------------------------------------------------------------------------
// Arguments et identifiants
// ---------------------------------------------------------------------------
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: 'string' },
    events: { type: 'string' },
    'env-file': { type: 'string' },
    'skip-preflight': { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
  },
});

const command = positionals[0] as Command | undefined;
if (!command || !COMMANDS.includes(command)) {
  console.error(`Commande attendue : ${COMMANDS.join(' | ')}\nExemple : npm run polar:webhook -- get`);
  process.exit(2);
}

const envFiles = values['env-file'] ? [values['env-file']] : ['.env.local', '.env'];
for (const file of envFiles) {
  if (existsSync(file)) process.loadEnvFile(file);
  else if (values['env-file']) throw new Error(`Fichier d'env introuvable : ${file}`);
}

const clientId = process.env.POLAR_CLIENT_ID?.trim();
const clientSecret = process.env.POLAR_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  console.error('POLAR_CLIENT_ID et POLAR_CLIENT_SECRET sont requis (voir .env.example).');
  process.exit(2);
}
const basic = { clientId, clientSecret };

function parseEvents(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  const events = raw.split(',').map((e) => e.trim().toUpperCase()).filter(Boolean);
  const unknown = events.filter((e) => !KNOWN_EVENTS.includes(e));
  if (unknown.length) throw new Error(`Événements inconnus : ${unknown.join(', ')}. Valides : ${KNOWN_EVENTS.join(', ')}`);
  if (!events.length) throw new Error('--events ne peut pas être vide.');
  return events;
}

function parseUrl(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('L’URL du webhook doit être en https.');
  return url.toString();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
/** Appel AccessLink via le client commun (quotas, nouvelles tentatives) ; statuts métier remontés tels quels. */
async function call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path = '', body?: unknown): Promise<{ status: number; json: unknown }> {
  const { status, data } = await polarRequest(`${WEBHOOKS_PATH}${path}`, {
    basic,
    method,
    body,
    passthroughStatuses: [400, 404, 409],
    emptyStatuses: [204],
  });
  return { status, json: data };
}

function polarError(json: unknown): string {
  if (json && typeof json === 'object' && 'message' in json) {
    const e = json as { message?: string; errorType?: string; corrId?: string };
    return `${e.errorType ?? 'erreur'} : ${e.message ?? ''}${e.corrId ? ` (corrId ${e.corrId})` : ''}`;
  }
  return typeof json === 'string' && json ? json.slice(0, 300) : '';
}

function fail(label: string, status: number, json: unknown): never {
  console.error(`✗ ${label} : HTTP ${status}${polarError(json) ? ` — ${polarError(json)}` : ''}`);
  process.exit(1);
}

async function fetchWebhook(): Promise<WebhookInfo | null> {
  const { status, json } = await call('GET');
  if (status !== 200) fail('Lecture du webhook', status, json);
  const data = (json as { data?: WebhookInfo[] | WebhookInfo } | null)?.data;
  const list = Array.isArray(data) ? data : data ? [data] : [];
  return list[0] ?? null;
}

function printWebhook(w: WebhookInfo) {
  console.log(`  id      : ${w.id}`);
  console.log(`  url     : ${w.url}`);
  console.log(`  events  : ${w.events.join(', ')}`);
  console.log(`  état    : ${w.active === undefined ? 'inconnu' : w.active ? 'actif' : 'INACTIF'}`);
}

function printSecretOnce(secret: string) {
  const lines = [
    'SECRET DE SIGNATURE — affiché une seule fois, Polar ne le redonnera jamais',
    '',
    secret,
    '',
    'Copiez-le maintenant dans POLAR_WEBHOOK_SECRET sur Vercel',
    '(Production pour le client « Afeia prod »), puis redéployez.',
    'Il n’est écrit dans aucun fichier.',
  ];
  const width = Math.max(...lines.map((l) => l.length)) + 2;
  console.log(`\n╔${'═'.repeat(width)}╗`);
  for (const l of lines) console.log(`║ ${l.padEnd(width - 1)}║`);
  console.log(`╚${'═'.repeat(width)}╝\n`);
}

/** Vérifie que l'URL répond 200 à un PING avant de demander à Polar de la valider. */
async function preflight(url: string) {
  process.stdout.write(`→ Pré-vérification : PING vers ${url} … `);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Polar-Webhook-Event': 'PING' },
      body: JSON.stringify({ timestamp: new Date().toISOString(), event: 'PING' }),
    });
    if (res.status === 200) {
      console.log('200 OK');
      return;
    }
    console.log(`HTTP ${res.status}`);
  } catch (error) {
    console.log(`injoignable (${(error as Error).message})`);
  }
  console.error(
    '✗ La route ne répond pas 200 au PING : Polar refuserait le webhook.\n' +
      '  Déployez d’abord la route webhook (POL-08), ou relancez avec --skip-preflight.'
  );
  process.exit(1);
}

async function confirm(question: string): Promise<boolean> {
  if (values.yes) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} (tapez « oui ») `);
  rl.close();
  return answer.trim().toLowerCase() === 'oui';
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------
async function main() {
  switch (command) {
    case 'get': {
      const w = await fetchWebhook();
      if (!w) {
        console.log('Aucun webhook pour ce client. Créez-le avec : npm run polar:webhook -- create');
        return;
      }
      console.log('Webhook Polar :');
      printWebhook(w);
      return;
    }

    case 'create': {
      const url = parseUrl(values.url) ?? DEFAULT_URL;
      const events = parseEvents(values.events) ?? [...MVP_EVENTS];
      const existing = await fetchWebhook();
      if (existing) {
        console.error('✗ Ce client a déjà un webhook (un seul autorisé) :');
        printWebhook(existing);
        console.error('  Utilisez `update` pour le modifier, ou `delete` puis `create` pour obtenir un nouveau secret.');
        process.exit(1);
      }
      if (!values['skip-preflight']) await preflight(url);

      console.log(`→ Création : ${url}\n  événements : ${events.join(', ')}\n  (Polar envoie un PING à l'URL ; sans réponse 200 le webhook n'est pas créé)`);
      const { status, json } = await call('POST', '', { events, url });
      if (status !== 201 && status !== 200) fail('Création du webhook', status, json);

      const data = (json as { data?: WebhookInfo & { signature_secret_key?: string } }).data;
      if (!data) fail('Création du webhook (réponse inattendue)', status, null);
      console.log('✓ Webhook créé :');
      printWebhook({ ...data, active: true });
      if (data.signature_secret_key) printSecretOnce(data.signature_secret_key);
      else console.warn('⚠ Polar n’a pas renvoyé de signature_secret_key. Supprimez et recréez le webhook.');
      return;
    }

    case 'update': {
      const url = parseUrl(values.url);
      const events = parseEvents(values.events);
      if (!url && !events) throw new Error('update : précisez --url et/ou --events.');
      const w = await fetchWebhook();
      if (!w) fail('Mise à jour', 404, 'aucun webhook à modifier');
      if (url && !values['skip-preflight']) await preflight(url);

      const { status, json } = await call('PATCH', `/${encodeURIComponent(w.id)}`, {
        ...(events ? { events } : {}),
        ...(url ? { url } : {}),
      });
      if (status !== 200) fail('Mise à jour du webhook', status, json);
      console.log('✓ Webhook mis à jour :');
      const updated = (json as { data?: WebhookInfo[] | WebhookInfo }).data;
      printWebhook((Array.isArray(updated) ? updated[0] : updated) ?? { ...w, ...(url ? { url } : {}), ...(events ? { events } : {}) });
      return;
    }

    case 'activate':
    case 'deactivate': {
      const { status, json } = await call('POST', `/${command}`);
      if (status === 204) {
        console.log(`Aucun webhook à ${command === 'activate' ? 'activer' : 'désactiver'} pour ce client.`);
        return;
      }
      if (status !== 200) {
        if (command === 'activate') console.error('  (L’activation exige que l’URL réponde 200 au PING de Polar.)');
        fail(command === 'activate' ? 'Activation' : 'Désactivation', status, json);
      }
      console.log(`✓ Webhook ${command === 'activate' ? 'activé' : 'désactivé'} (HTTP 200).`);
      const w = await fetchWebhook();
      if (w) printWebhook(w);
      return;
    }

    case 'delete': {
      const w = await fetchWebhook();
      if (!w) {
        console.log('Aucun webhook à supprimer.');
        return;
      }
      printWebhook(w);
      if (!(await confirm('Supprimer ce webhook ? Plus aucune notification ne sera envoyée et le secret actuel deviendra inutile.'))) {
        console.log('Annulé.');
        return;
      }
      const { status, json } = await call('DELETE', `/${encodeURIComponent(w.id)}`);
      if (status !== 204 && status !== 200) fail('Suppression du webhook', status, json);
      console.log('✓ Webhook supprimé (HTTP 204).');
      return;
    }
  }
}

main().catch((err: Error) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
