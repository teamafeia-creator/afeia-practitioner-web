// lib/wearables/polar/env.ts
// Module pur (sans `server-only`) : utilisable par les scripts Node (tsx).
// Le code de l'app importe `./config`, qui ajoute la garde `server-only`.
import { z } from 'zod';

/**
 * Configuration serveur de l'API Polar AccessLink v3.
 *
 * Deux clients AccessLink distincts existent (un seul webhook par client) :
 *  - « Afeia dev »  → http://localhost:3000/api/wearables/polar/callback
 *  - « Afeia prod » → https://afeia.fr/api/wearables/polar/callback
 *
 * Ces variables sont strictement serveur : jamais de préfixe NEXT_PUBLIC_,
 * et leurs valeurs ne doivent jamais apparaître dans les logs ou les erreurs.
 *
 * ⚠ Règle (POL-01, corrigée) : une config Polar absente ou invalide ne doit JAMAIS casser le
 * reste de l'app. Rien n'est validé au démarrage ni à l'import : chaque fonctionnalité Polar
 * appelle, à la demande, le getter qui ne vérifie QUE les variables dont elle a besoin.
 *   - connexion / callback OAuth : getPolarConfig()          → POLAR_OAUTH_ENV_VARS
 *   - appels « client » (GET /v3/webhooks) : getPolarApiCredentials() → POLAR_API_ENV_VARS
 *   - route webhook : getPolarWebhookSecret()                → POLAR_WEBHOOK_SECRET
 *   - cron polar-sync : getCronSecret()                      → CRON_SECRET
 * En cas d'erreur, la route concernée répond 503 (./unavailable.ts).
 */

export const POLAR_OAUTH_ENV_VARS = [
  'POLAR_CLIENT_ID',
  'POLAR_CLIENT_SECRET',
  'POLAR_REDIRECT_URI',
  'POLAR_STATE_SECRET',
] as const;

/** @deprecated alias historique de POLAR_OAUTH_ENV_VARS. */
export const POLAR_ENV_VARS = POLAR_OAUTH_ENV_VARS;

export const POLAR_API_ENV_VARS = ['POLAR_CLIENT_ID', 'POLAR_CLIENT_SECRET'] as const;

/**
 * Secret de signature des webhooks (signature_secret_key renvoyé par Polar à la création,
 * voir scripts/polar-webhook.ts). N'existe qu'après `npm run polar:webhook create` : seule la
 * route webhook en dépend, et le PING de création passe sans lui (docs/wearables/polar.md §6.3).
 */
export const POLAR_WEBHOOK_SECRET_VAR = 'POLAR_WEBHOOK_SECRET';

export const CRON_SECRET_VAR = 'CRON_SECRET';

/** Longueur minimale du secret de signature du state OAuth (≥ 256 bits en hex/base64). */
export const POLAR_STATE_SECRET_MIN_LENGTH = 32;

export const POLAR_CALLBACK_PATH = '/api/wearables/polar/callback';

const required = (name: string) =>
  z
    .string({ required_error: `${name} est manquante` })
    .trim()
    .min(1, `${name} est vide`);

const polarOAuthSchema = z.object({
  POLAR_CLIENT_ID: required('POLAR_CLIENT_ID'),
  POLAR_CLIENT_SECRET: required('POLAR_CLIENT_SECRET'),
  POLAR_REDIRECT_URI: required('POLAR_REDIRECT_URI')
    .url('POLAR_REDIRECT_URI doit être une URL absolue')
    .refine(
      (value) => {
        try {
          return new URL(value).pathname === POLAR_CALLBACK_PATH;
        } catch {
          return false;
        }
      },
      `POLAR_REDIRECT_URI doit pointer vers ${POLAR_CALLBACK_PATH}`
    ),
  POLAR_STATE_SECRET: required('POLAR_STATE_SECRET').min(
    POLAR_STATE_SECRET_MIN_LENGTH,
    `POLAR_STATE_SECRET doit faire au moins ${POLAR_STATE_SECRET_MIN_LENGTH} caractères`
  ),
});

const polarApiSchema = polarOAuthSchema.pick({ POLAR_CLIENT_ID: true, POLAR_CLIENT_SECRET: true });

/** Config du flux OAuth (connexion + callback). */
export type PolarConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Secret HMAC du paramètre `state` OAuth (propre à Afeia, pas fourni par Polar). */
  stateSecret: string;
};

export type PolarApiCredentials = { clientId: string; clientSecret: string };

export class PolarConfigError extends Error {
  /** Noms des variables manquantes ou invalides (jamais leurs valeurs). */
  readonly variables: string[];

  constructor(variables: string[], details: string[]) {
    super(
      `Configuration Polar invalide (${variables.join(', ')}) : ${details.join(' ; ')}. ` +
        `Définissez ces variables dans .env.local ou dans Vercel (voir .env.example).`
    );
    this.name = 'PolarConfigError';
    this.variables = variables;
  }
}

const blankToUndefined = (value: string | undefined) => (value?.trim() ? value : undefined);

function parseWith<S extends z.ZodTypeAny>(
  schema: S,
  names: readonly string[],
  env: Record<string, string | undefined>
): z.infer<S> {
  const subset = Object.fromEntries(names.map((key) => [key, blankToUndefined(env[key])]));
  const result = schema.safeParse(subset);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new PolarConfigError(variables, result.error.issues.map((issue) => issue.message));
  }
  return result.data;
}

/**
 * Valide la config OAuth d'un environnement. Fonction pure (testable) : ne lit pas
 * process.env elle-même. Les messages ne contiennent que des noms de variables.
 */
export function parsePolarConfig(env: Record<string, string | undefined>): PolarConfig {
  const data = parseWith(polarOAuthSchema, POLAR_OAUTH_ENV_VARS, env);
  return {
    clientId: data.POLAR_CLIENT_ID,
    clientSecret: data.POLAR_CLIENT_SECRET,
    redirectUri: data.POLAR_REDIRECT_URI,
    stateSecret: data.POLAR_STATE_SECRET,
  };
}

/** Identifiants client seuls (Basic auth des endpoints « client » AccessLink). */
export function parsePolarApiCredentials(env: Record<string, string | undefined>): PolarApiCredentials {
  const data = parseWith(polarApiSchema, POLAR_API_ENV_VARS, env);
  return { clientId: data.POLAR_CLIENT_ID, clientSecret: data.POLAR_CLIENT_SECRET };
}

function parseSingleSecret(name: string, env: Record<string, string | undefined>): string {
  const value = env[name]?.trim();
  if (!value) throw new PolarConfigError([name], [`${name} est manquante`]);
  return value;
}

export const parsePolarWebhookSecret = (env: Record<string, string | undefined>) =>
  parseSingleSecret(POLAR_WEBHOOK_SECRET_VAR, env);

export const parseCronSecret = (env: Record<string, string | undefined>) => parseSingleSecret(CRON_SECRET_VAR, env);

// ---------------------------------------------------------------------------
// Getters à la demande (lazy) : seules les routes et services Polar les appellent.
// Un résultat valide est mis en cache (les variables ne changent pas pendant la vie d'un
// déploiement). Une erreur n'est PAS mise en cache : la validation est refaite à l'appel
// suivant (coût négligeable), ce qui évite de figer un état transitoire.
// ---------------------------------------------------------------------------
const cache = new Map<string, unknown>();

function lazy<T>(key: string, parse: (env: Record<string, string | undefined>) => T): () => T {
  return () => {
    if (cache.has(key)) return cache.get(key) as T;
    const value = parse(process.env);
    cache.set(key, value);
    return value;
  };
}

/** Config OAuth validée (connect / callback). Lève PolarConfigError si incomplète. */
export const getPolarConfig = lazy('oauth', parsePolarConfig);
/** POLAR_CLIENT_ID + POLAR_CLIENT_SECRET (ex. GET /v3/webhooks depuis le cron). */
export const getPolarApiCredentials = lazy('api', parsePolarApiCredentials);
/** POLAR_WEBHOOK_SECRET (route webhook, hors PING). */
export const getPolarWebhookSecret = lazy('webhook', parsePolarWebhookSecret);
/** CRON_SECRET (cron polar-sync). */
export const getCronSecret = lazy('cron', parseCronSecret);

/** Tests uniquement : oublie les configs mises en cache. */
export function resetPolarConfigCache(): void {
  cache.clear();
}
