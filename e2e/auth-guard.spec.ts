import { test, expect } from './fixtures';
import { PROTECTED_ROUTES } from './helpers';

test.describe('Garde d’authentification (accès anonyme)', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirige l’anonyme vers /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // La protection est côté client (AppShell) : on attend la redirection.
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toContain('/login');
    });
  }

  test('/admin sans session redirige vers /admin/login', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/admin\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/admin/login');
  });

  test('la redirection conserve la cible dans ?from', async ({ page }) => {
    await page.goto('/consultants', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/from=/);
  });
});
