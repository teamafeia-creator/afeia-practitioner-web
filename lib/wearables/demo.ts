// lib/wearables/demo.ts
// Connexions de démonstration : insérées directement en base (avec un faux jeton dans Vault)
// pour illustrer l'objet connecté sur des fiches de démo. Leur provider_user_id commence par
// « seed- ». Le cron et le traitement des événements les ignorent : jamais d'appel Polar,
// jamais de passage en erreur.
// Module pur.

export const DEMO_PROVIDER_USER_ID_PREFIX = 'seed-';

/** Motif SQL LIKE équivalent (pour filtrer côté base). */
export const DEMO_PROVIDER_USER_ID_LIKE = `${DEMO_PROVIDER_USER_ID_PREFIX}%`;

export function isDemoProviderUserId(providerUserId: string | null | undefined): boolean {
  return typeof providerUserId === 'string' && providerUserId.startsWith(DEMO_PROVIDER_USER_ID_PREFIX);
}
