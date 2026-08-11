import { test, expect } from './fixtures';
import { PUBLIC_ROUTES, KNOWN_DEAD_LINKS, collectInternalLinks, unsafeExternalLinks } from './helpers';

test.describe('Navigation & routing', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`page publique ${route} répond sans crash`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(resp, `réponse pour ${route}`).toBeTruthy();
      expect(resp!.status(), `statut de ${route}`).toBeLessThan(400);
      // Un contenu est rendu.
      await expect(page.locator('body')).not.toBeEmpty();
    });
  }

  test('route inexistante renvoie un 404', async ({ page }) => {
    const resp = await page.goto('/cette-route-nexiste-pas-xyz', { waitUntil: 'domcontentloaded' });
    expect(resp!.status()).toBe(404);
  });

  test('slug de réservation inexistant → not-found dédié', async ({ page }) => {
    const resp = await page.goto('/rdv/slug-inexistant-xyz', { waitUntil: 'domcontentloaded' });
    // not-found.tsx renvoie 404
    expect(resp!.status()).toBe(404);
  });

  test('liens morts connus renvoient bien 404 (confirme le constat Étape 0)', async ({ request }) => {
    const found: Record<string, number> = {};
    for (const link of KNOWN_DEAD_LINKS) {
      const resp = await request.get(link, { maxRedirects: 5, failOnStatusCode: false });
      found[link] = resp.status();
    }
    // On DOCUMENTE : ces liens sont référencés dans l'UI mais mènent à un 404.
    for (const link of KNOWN_DEAD_LINKS) {
      expect(found[link], `${link} devrait être un 404 (lien mort)`).toBe(404);
    }
  });

  test('les liens internes des pages publiques ne mènent pas à un 404 involontaire', async ({ page, request }) => {
    const checked = new Set<string>();
    const offenders: Array<{ from: string; link: string; status: number }> = [];
    for (const route of ['/login', '/welcome', '/questionnaire', '/consultant/login']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const links = await collectInternalLinks(page);
      for (const link of links) {
        if (checked.has(link)) continue;
        checked.add(link);
        const resp = await request.get(link, { maxRedirects: 5, failOnStatusCode: false });
        // Redirections vers /login (routes protégées) => OK. On ne bloque que sur 404/500.
        if (resp.status() === 404 || resp.status() >= 500) {
          offenders.push({ from: route, link, status: resp.status() });
        }
      }
    }
    expect(offenders, `liens internes cassés: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test('liens externes en nouvel onglet ont rel="noopener"', async ({ page }) => {
    const offenders: Array<{ route: string; links: string[] }> = [];
    for (const route of ['/login', '/welcome', '/questionnaire']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const unsafe = await unsafeExternalLinks(page);
      if (unsafe.length) offenders.push({ route, links: unsafe });
    }
    expect(offenders, `liens externes sans noopener: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test('back / forward navigateur ne casse pas l’app', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/login');
    await page.goForward({ waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/signup');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('query params invalides ne provoquent pas de crash', async ({ page }) => {
    const resp = await page.goto('/login?debug=xyz&foo=bar&x=%%%', { waitUntil: 'domcontentloaded' });
    expect(resp!.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
