import { test, expect } from './fixtures';
import { horizontalOverflow } from './helpers';

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const ROUTES = ['/login', '/signup', '/reset-password', '/welcome', '/questionnaire', '/consultant/login', '/admin/login'];

test.describe('Responsive', () => {
  for (const vp of VIEWPORTS) {
    test(`aucun débordement horizontal @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const offenders: Array<{ route: string; overflow: number }> = [];
      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(150);
        const overflow = await horizontalOverflow(page);
        if (overflow > 1) offenders.push({ route, overflow });
      }
      expect(offenders, `débordement horizontal @ ${vp.name}: ${JSON.stringify(offenders)}`).toEqual([]);
    });
  }

  test('les boutons ont une cible tactile ≥ 44px @ mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const offenders: Array<{ route: string; small: Array<{ label: string; w: number; h: number }> }> = [];
    for (const route of ['/login', '/signup', '/questionnaire']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const small = await page.evaluate(() => {
        const out: Array<{ label: string; w: number; h: number }> = [];
        const els = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
        els.forEach((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return; // masqué
          if (r.height < 44 || r.width < 44) {
            out.push({ label: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
          }
        });
        return out;
      });
      if (small.length) offenders.push({ route, small });
    }
    expect(offenders, `boutons < 44px @ mobile: ${JSON.stringify(offenders)}`).toEqual([]);
  });
});
