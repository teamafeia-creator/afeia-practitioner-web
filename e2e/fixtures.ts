/**
 * Fixture Playwright partagée par la campagne QA.
 *
 * - Installe la garde console/pageerror (échec sur erreur front).
 * - Coupe proprement les requêtes vers les hôtes externes (Supabase, Google
 *   Fonts, Stripe, Daily) pour des tests déterministes et rapides dans le
 *   sandbox sans réseau. Seules les requêtes localhost passent.
 *
 * Utilisation : `import { test, expect } from './fixtures';`
 * La garde est vérifiée automatiquement en fin de test, SAUF si le test a fixé
 * `test.info().annotations` via `skipConsoleAssertion` (voir plus bas).
 */
import { test as base, expect } from '@playwright/test';
import { installConsoleGuard } from './console-guard';

const EXTERNAL_HOST = /^(https?:)?\/\/(?!localhost|127\.0\.0\.1)/i;
const FONT_HOST = /fonts\.(googleapis|gstatic)\.com/i;

type Fixtures = {
  guard: ReturnType<typeof installConsoleGuard>;
  /** Appeler dans un test pour ne PAS vérifier la garde console automatiquement. */
  allowConsoleErrors: () => void;
};

export const test = base.extend<Fixtures>({
  // Coupe les hôtes externes au niveau du contexte.
  context: async ({ context }, use) => {
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (!EXTERNAL_HOST.test(url)) {
        return route.continue();
      }
      // Fonts : réponse vide pour éviter l'erreur de ressource bloquée.
      if (FONT_HOST.test(url)) {
        return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      }
      // Autres externes : coupés (l'app logue son propre échec, neutralisé par l'allowlist infra).
      return route.abort();
    });
    await use(context);
  },

  guard: async ({ page }, use) => {
    const guard = installConsoleGuard(page);
    let skip = false;
    // Expose un moyen de désactiver l'assertion pour un test donné.
    (page as unknown as { __qaSkipConsole?: () => void }).__qaSkipConsole = () => {
      skip = true;
    };
    await use(guard);
    if (!skip) {
      guard.assertClean(test.info());
    }
    guard.dispose();
  },

  allowConsoleErrors: async ({ page }, use) => {
    await use(() => {
      (page as unknown as { __qaSkipConsole?: () => void }).__qaSkipConsole?.();
    });
  },
});

// Force l'activation de la fixture `guard` pour chaque test (auto-use).
test.beforeEach(async ({ guard }) => {
  void guard;
});

export { expect };
