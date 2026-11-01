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

export const POLAR_CONNECT_MESSAGES: Record<PolarConnectReason | 'connected', string> = {
  connected: "Votre Polar est connecté. Vos données apparaîtront après la prochaine synchronisation de votre Polar avec l'app Polar Flow.",
  access_denied: "Vous avez refusé l'accès sur Polar. Aucune donnée n'a été partagée ; vous pouvez réessayer quand vous voulez.",
  polar_error: 'Polar a interrompu la connexion. Réessayez dans quelques minutes.',
  polar_consents_missing:
    "Polar demande d'accepter ses consentements obligatoires avant de partager vos données. Acceptez-les sur account.polar.com, puis reconnectez votre Polar.",
  token_exchange_failed: 'La connexion avec Polar a échoué. Réessayez.',
  register_failed: 'Polar a refusé la connexion. Réessayez dans quelques minutes.',
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
