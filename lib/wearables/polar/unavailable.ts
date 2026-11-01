// lib/wearables/polar/unavailable.ts
// Réponse unique quand une fonctionnalité Polar n'est pas configurée : 503 + message clair.
// Le log ne contient que les NOMS des variables manquantes ou invalides, jamais leurs valeurs.
import 'server-only';
import { NextResponse } from 'next/server';
import { PolarConfigError } from './config';

export type PolarFeature = 'connect' | 'callback' | 'webhook' | 'cron';

export const POLAR_UNAVAILABLE_MESSAGE =
  "La connexion à l'objet connecté est momentanément indisponible. Réessayez plus tard.";

/** Variables en cause, si l'erreur est une erreur de config (sinon null : à relancer). */
export function missingPolarVariables(error: unknown): string[] | null {
  return error instanceof PolarConfigError ? error.variables : null;
}

export function logPolarUnavailable(feature: PolarFeature, variables: string[]): void {
  console.error(`[wearables/polar/${feature}] configuration incomplète : fonctionnalité indisponible`, { variables });
}

/** 503 JSON. `error` stable pour les clients (web, mobile). */
export function polarUnavailableResponse(feature: PolarFeature, variables: string[]): NextResponse {
  logPolarUnavailable(feature, variables);
  return NextResponse.json(
    { error: 'polar_unavailable', message: POLAR_UNAVAILABLE_MESSAGE },
    { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' } }
  );
}

/**
 * Exécute `read` (un getter de config) ; en cas de PolarConfigError, renvoie la réponse 503.
 * Toute autre erreur est relancée.
 */
export function readPolarConfig<T>(
  feature: PolarFeature,
  read: () => T
): { ok: true; value: T } | { ok: false; response: NextResponse } {
  try {
    return { ok: true, value: read() };
  } catch (error) {
    const variables = missingPolarVariables(error);
    if (!variables) throw error;
    return { ok: false, response: polarUnavailableResponse(feature, variables) };
  }
}
