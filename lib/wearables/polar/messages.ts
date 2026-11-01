// lib/wearables/polar/messages.ts
// Raisons renvoyées au front après le callback (`?wearable=error&reason=…`)
// et messages à afficher. Partagé entre web et serveur : aucun secret ici.

export const POLAR_CONNECT_REASONS = [
  'access_denied',
  'polar_error',
  'polar_consents_missing',
  'token_exchange_failed',
  'register_failed',
  'save_failed',
  'server_error',
] as const;

export type PolarConnectReason = (typeof POLAR_CONNECT_REASONS)[number];

// Vocabulaire patient : « objet connecté », jamais la marque (sauf l'adresse du compte
// Polar, nécessaire pour accepter les consentements).
export const POLAR_CONNECT_MESSAGES: Record<PolarConnectReason | 'connected', string> = {
  connected: 'Votre objet connecté est relié à Afeia.',
  access_denied: "Vous avez refusé l'accès. Aucune donnée n'a été partagée ; vous pouvez réessayer quand vous voulez.",
  polar_error: "La connexion de votre objet connecté a été interrompue. Réessayez dans quelques minutes.",
  polar_consents_missing:
    "Votre compte doit d'abord accepter les consentements obligatoires sur account.polar.com. Acceptez-les, puis reconnectez votre objet connecté.",
  token_exchange_failed: 'La connexion de votre objet connecté a échoué. Réessayez.',
  register_failed: 'La connexion a été refusée. Réessayez dans quelques minutes.',
  save_failed: "La connexion n'a pas pu être enregistrée. Réessayez.",
  server_error: 'Un problème technique a empêché la connexion. Réessayez dans quelques minutes.',
};

export function polarConnectMessage(wearable: string | null, reason: string | null): string | null {
  if (wearable === 'connected') return POLAR_CONNECT_MESSAGES.connected;
  if (wearable !== 'error') return null;
  return (POLAR_CONNECT_REASONS as readonly string[]).includes(reason ?? '')
    ? POLAR_CONNECT_MESSAGES[reason as PolarConnectReason]
    : POLAR_CONNECT_MESSAGES.polar_error;
}
