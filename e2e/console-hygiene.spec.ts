import { test, expect } from './fixtures';
import { PUBLIC_ROUTES } from './helpers';

/**
 * Règle stricte : toute erreur console d'origine applicative (hors bruit réseau
 * du sandbox, cf. console-guard.ts) fait échouer le test. La garde s'applique
 * automatiquement (fixture), mais on l'explicite ici page par page pour un
 * diagnostic clair.
 */
test.describe('Hygiène console (chargement pages publiques)', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} se charge sans erreur console front`, async ({ page, guard }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600); // laisse l'hydratation et les effets se dérouler
      const front = guard.frontErrors();
      expect(front, `erreurs front sur ${route}: ${JSON.stringify(front)}`).toEqual([]);
    });
  }
});
