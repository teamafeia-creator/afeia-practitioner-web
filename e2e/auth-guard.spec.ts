import { test, expect } from './fixtures';
import { PROTECTED_ROUTES } from './helpers';

// La protection est côté client (AppShell / layouts). La redirection est une
// navigation SPA (router.replace) qui n'émet PAS d'événement `load` : on suit
// donc l'URL par polling plutôt qu'avec waitForURL(waitUntil:'load').
test.describe('Garde d’authentification (accès anonyme)', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirige l’anonyme vers /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 12_000 })
        .toMatch(/\/login/);
    });
  }

  test('/admin sans session redirige vers /admin/login', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 12_000 })
      .toMatch(/\/admin\/login/);
  });

  test('la redirection depuis une route protégée aboutit sur /login', async ({ page }, testInfo) => {
    await page.goto('/consultants', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 12_000 }).toMatch(/\/login/);
    // Constat consigné (cf. QA-RAPPORT, mineur) : la préservation de ?from est
    // incohérente — AppShell.onAuthStateChange redirige sans ?from, contrairement
    // à loadSession. On enregistre l'observation sans faire échouer le test.
    const hasFrom = /from=/.test(page.url());
    testInfo.annotations.push({ type: 'observation-from-param', description: `from présent: ${hasFrom}` });
  });
});
