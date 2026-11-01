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
 */

export const POLAR_ENV_VARS = [
  'POLAR_CLIENT_ID',
  'POLAR_CLIENT_SECRET',
  'POLAR_REDIRECT_URI',
] as const;

export const POLAR_CALLBACK_PATH = '/api/wearables/polar/callback';

const required = (name: string) =>
  z
    .string({ required_error: `${name} est manquante` })
    .trim()
    .min(1, `${name} est vide`);

const polarEnvSchema = z.object({
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
});

export type PolarConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export class PolarConfigError extends Error {
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

/**
 * Valide un environnement et renvoie une config typée.
 * Fonction pure (testable) : ne lit pas process.env elle-même.
 * Les messages ne contiennent que des noms de variables, jamais de valeurs.
 */
export function parsePolarConfig(
  env: Record<string, string | undefined>
): PolarConfig {
  const subset = Object.fromEntries(
    POLAR_ENV_VARS.map((key) => [key, env[key] === '' ? undefined : env[key]])
  );
  const result = polarEnvSchema.safeParse(subset);

  if (!result.success) {
    const variables = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ];
    const details = result.error.issues.map((issue) => issue.message);
    throw new PolarConfigError(variables, details);
  }

  return {
    clientId: result.data.POLAR_CLIENT_ID,
    clientSecret: result.data.POLAR_CLIENT_SECRET,
    redirectUri: result.data.POLAR_REDIRECT_URI,
  };
}

let cached: PolarConfig | null = null;

/** Config Polar validée (mise en cache après la première lecture). */
export function getPolarConfig(): PolarConfig {
  if (!cached) {
    cached = parsePolarConfig(process.env);
  }
  return cached;
}

/** Vérification au démarrage du serveur (appelée depuis instrumentation.ts). */
export function assertPolarConfig(): void {
  getPolarConfig();
}
