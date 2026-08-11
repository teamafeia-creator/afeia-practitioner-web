import { test, expect } from './fixtures';
import { PUBLIC_ROUTES, gotoSettled } from './helpers';

/** Récupère les manquements a11y d'une page (exécuté dans le navigateur). */
async function scanA11y(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const imagesSansAlt: string[] = [];
    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('alt')) imagesSansAlt.push(img.getAttribute('src') || '(sans src)');
    });

    const inputsSansLabel: string[] = [];
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return;
      const id = el.id;
      const hasFor = id ? !!document.querySelector(`label[for="${CSS.escape(id)}"]`) : false;
      const wrapped = !!el.closest('label');
      const ariaLabel = el.getAttribute('aria-label');
      const ariaLabelledby = el.getAttribute('aria-labelledby');
      const title = el.getAttribute('title');
      if (!hasFor && !wrapped && !ariaLabel && !ariaLabelledby && !title) {
        inputsSansLabel.push((el.getAttribute('name') || el.getAttribute('placeholder') || el.tagName).toString());
      }
    });

    const h1Count = document.querySelectorAll('h1').length;
    const levels = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) => Number(h.tagName[1]));

    return { imagesSansAlt, inputsSansLabel, h1Count, levels };
  });
}

test.describe('Accessibilité de base', () => {
  test('toutes les images ont un attribut alt', async ({ page }) => {
    const offenders: Array<{ route: string; imgs: string[] }> = [];
    for (const route of PUBLIC_ROUTES) {
      await gotoSettled(page, route);
      const { imagesSansAlt } = await scanA11y(page);
      if (imagesSansAlt.length) offenders.push({ route, imgs: imagesSansAlt });
    }
    expect(offenders, `images sans alt: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test('chaque champ de saisie a un libellé accessible', async ({ page }) => {
    const offenders: Array<{ route: string; fields: string[] }> = [];
    for (const route of PUBLIC_ROUTES) {
      await gotoSettled(page, route);
      const { inputsSansLabel } = await scanA11y(page);
      if (inputsSansLabel.length) offenders.push({ route, fields: inputsSansLabel });
    }
    expect(offenders, `champs sans label: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test('chaque page a exactement un h1', async ({ page }) => {
    const offenders: Array<{ route: string; h1: number }> = [];
    for (const route of PUBLIC_ROUTES) {
      await gotoSettled(page, route);
      const { h1Count } = await scanA11y(page);
      if (h1Count !== 1) offenders.push({ route, h1: h1Count });
    }
    expect(offenders, `pages avec un nombre de h1 ≠ 1: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test('la hiérarchie des titres ne saute pas de niveau', async ({ page }) => {
    const offenders: Array<{ route: string; levels: number[] }> = [];
    for (const route of PUBLIC_ROUTES) {
      await gotoSettled(page, route);
      const { levels } = await scanA11y(page);
      for (let i = 1; i < levels.length; i += 1) {
        if (levels[i] - levels[i - 1] > 1) {
          offenders.push({ route, levels });
          break;
        }
      }
    }
    expect(offenders, `sauts de niveau de titre: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test('le premier élément focusable est atteignable au clavier', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName || 'BODY');
    expect(['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA']).toContain(tag);
  });
});
