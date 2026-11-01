/**
 * Hook de démarrage Next.js : exécuté une fois au lancement du serveur.
 * Fait échouer le démarrage avec un message explicite si une variable
 * d'environnement serveur obligatoire manque.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertPolarConfig } = await import('@/lib/wearables/polar/config');
    assertPolarConfig();
  }
}
