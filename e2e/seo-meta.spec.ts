import { test, expect } from './fixtures';
import { PUBLIC_ROUTES, gotoSettled } from './helpers';

test.describe('SEO / méta', () => {
  test('chaque page publique a un <title> non vide', async ({ page }) => {
    const empties: string[] = [];
    for (const route of PUBLIC_ROUTES) {
      await gotoSettled(page, route);
      const title = (await page.title()).trim();
      if (!title) empties.push(route);
    }
    expect(empties, `pages sans title: ${JSON.stringify(empties)}`).toEqual([]);
  });

  test('les titres sont uniques par page', async ({ page }) => {
    const titles: Record<string, string> = {};
    for (const route of PUBLIC_ROUTES) {
      await gotoSettled(page, route);
      titles[route] = (await page.title()).trim();
    }
    // Recherche de doublons.
    const seen = new Map<string, string[]>();
    for (const [route, title] of Object.entries(titles)) {
      seen.set(title, [...(seen.get(title) || []), route]);
    }
    const duplicates = Array.from(seen.entries()).filter(([, routes]) => routes.length > 1);
    expect(duplicates, `titres dupliqués: ${JSON.stringify(duplicates)}`).toEqual([]);
  });

  test('chaque page publique a une meta description non vide', async ({ page }) => {
    const missing: string[] = [];
    for (const route of PUBLIC_ROUTES) {
      await gotoSettled(page, route);
      const desc = await page.locator('head meta[name="description"]').getAttribute('content').catch(() => null);
      if (!desc || !desc.trim()) missing.push(route);
    }
    expect(missing, `pages sans meta description: ${JSON.stringify(missing)}`).toEqual([]);
  });

  test('la racine expose des balises Open Graph', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('head meta[property="og:type"]')).toHaveCount(1);
  });

  test('la langue du document est fr', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('un favicon est servi', async ({ request }) => {
    const resp = await request.get('/favicon.ico', { failOnStatusCode: false, maxRedirects: 5 });
    expect(resp.status(), 'favicon.ico').toBeLessThan(400);
  });

  test('robots.txt est disponible', async ({ request }) => {
    const resp = await request.get('/robots.txt', { failOnStatusCode: false });
    expect(resp.status(), 'robots.txt attendu').toBeLessThan(400);
  });

  test('sitemap.xml est disponible', async ({ request }) => {
    const resp = await request.get('/sitemap.xml', { failOnStatusCode: false });
    expect(resp.status(), 'sitemap.xml attendu').toBeLessThan(400);
  });
});
