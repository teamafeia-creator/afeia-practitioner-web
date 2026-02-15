const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE_URL = 'https://afeia.fr';
const CHROME_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';

const CREDENTIALS = {
  email: 'claude@claude.fr',
  password: 'claudeclaude',
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  [ok] Screenshot saved: ${name}.png`);
  return filepath;
}

async function waitForPageLoad(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    await delay(3000);
  }
  await delay(1500);
}

async function clickTab(page, tabLabel) {
  // The app uses TabsPills component with buttons containing the tab text
  const selectors = [
    `button:has-text("${tabLabel}")`,
    `[role="tab"]:has-text("${tabLabel}")`,
    `a:has-text("${tabLabel}")`,
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        await waitForPageLoad(page);
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}

async function main() {
  console.log('Launching browser...');

  // Parse proxy from environment
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  const launchOptions = {
    headless: true,
    executablePath: CHROME_PATH,
  };
  if (proxyUrl) {
    const url = new URL(proxyUrl);
    launchOptions.proxy = {
      server: `${url.protocol}//${url.hostname}:${url.port}`,
    };
    if (url.username) launchOptions.proxy.username = decodeURIComponent(url.username);
    if (url.password) launchOptions.proxy.password = decodeURIComponent(url.password);
    console.log('Using proxy:', launchOptions.proxy.server);
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // ============================================================
  // 1. LOGIN PAGE (before logging in)
  // ============================================================
  console.log('\n=== 1. Login page ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await delay(2000);
  await screenshot(page, 'login');

  // ============================================================
  // 2. LOG IN
  // ============================================================
  console.log('\n=== Logging in ===');
  try {
    await page.fill('input[type="email"], input[name="email"]', CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"], button:has-text("Se connecter")');
    await page.waitForURL('**/dashboard**', { timeout: 20000 });
    await waitForPageLoad(page);
    console.log('  [ok] Logged in successfully');
  } catch (e) {
    console.error('  [FAIL] Login failed:', e.message.split('\n')[0]);
  }

  // ============================================================
  // 3. DASHBOARD
  // ============================================================
  console.log('\n=== 2. Dashboard ===');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPageLoad(page);
  await screenshot(page, 'dashboard');

  // ============================================================
  // 4. AGENDA
  // ============================================================
  console.log('\n=== 3. Agenda ===');
  await page.goto(`${BASE_URL}/agenda`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPageLoad(page);
  await screenshot(page, 'agenda');

  // ============================================================
  // 5. CONSULTANTS LIST
  // ============================================================
  console.log('\n=== 4. Consultants list ===');
  await page.goto(`${BASE_URL}/consultants`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPageLoad(page);
  await screenshot(page, 'consultants');

  // ============================================================
  // 6. CLICK ON A CONSULTANT - navigate to their detail page
  // ============================================================
  console.log('\n=== 5. Consultant detail ===');
  let onConsultantPage = false;
  try {
    // Try clicking a link/row in the consultants list
    const consultantLink = page.locator('a[href*="/consultants/"]').first();
    if (await consultantLink.isVisible({ timeout: 5000 })) {
      await consultantLink.click();
      await waitForPageLoad(page);
      onConsultantPage = true;
      await screenshot(page, 'consultant-fiche');
      console.log('  [ok] On consultant detail page:', page.url());
    } else {
      // Try table row
      const row = page.locator('tr[class*="cursor"], tr:has(td)').first();
      if (await row.isVisible({ timeout: 3000 })) {
        await row.click();
        await waitForPageLoad(page);
        onConsultantPage = true;
        await screenshot(page, 'consultant-fiche');
      } else {
        console.log('  [WARN] No consultant found in list');
      }
    }
  } catch (e) {
    console.log('  [WARN] Could not click consultant:', e.message.split('\n')[0]);
  }

  // ============================================================
  // 7-13. CONSULTANT TABS
  // ============================================================
  if (onConsultantPage) {
    const consultantTabs = [
      { name: 'dossier-medical', label: 'Dossier médical' },
      { name: 'anamnese', label: 'Anamnèse' },
      { name: 'conseillancier', label: 'Conseillancier' },
      { name: 'journal', label: 'Journal' },
      { name: 'bague-connectee', label: 'Bague connectée' },
      { name: 'schemas-corporels', label: 'Schémas corporels' },
      { name: 'documents', label: 'Documents et analyses' },
      { name: 'notes-privees', label: 'Notes de séance' },
      { name: 'messages-consultant', label: 'Messages' },
    ];

    for (const { name, label } of consultantTabs) {
      console.log(`\n=== Tab: ${label} ===`);
      const clicked = await clickTab(page, label);
      if (clicked) {
        await screenshot(page, name);
      } else {
        console.log(`  [WARN] Tab "${label}" not found`);
        // Try partial match
        const partialLabel = label.split(' ')[0];
        const partialClicked = await clickTab(page, partialLabel);
        if (partialClicked) {
          await screenshot(page, name);
        } else {
          console.log(`  [WARN] Could not find tab even with partial match "${partialLabel}"`);
        }
      }
    }
  } else {
    console.log('\n  [SKIP] Skipping consultant tabs (no consultant was clicked)');
  }

  // ============================================================
  // 14. MESSAGES
  // ============================================================
  console.log('\n=== 14. Messages ===');
  await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPageLoad(page);
  await screenshot(page, 'messages');

  // ============================================================
  // 15. FACTURATION
  // ============================================================
  console.log('\n=== 15. Facturation ===');
  await page.goto(`${BASE_URL}/facturation`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPageLoad(page);
  await screenshot(page, 'facturation');

  // ============================================================
  // 16. STATISTIQUES
  // ============================================================
  console.log('\n=== 16. Statistiques ===');
  await page.goto(`${BASE_URL}/statistics`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPageLoad(page);
  await screenshot(page, 'statistiques');

  // ============================================================
  // 17. PARAMETRES + SUB-PAGES
  // ============================================================
  console.log('\n=== 17. Parametres ===');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForPageLoad(page);
  await screenshot(page, 'parametres');

  // Settings sub-pages (they are separate routes, not tabs)
  const settingsSubPages = [
    { name: 'parametres-types-seance', url: '/settings/consultation-types' },
    { name: 'parametres-disponibilites', url: '/settings/availability' },
    { name: 'parametres-prise-rdv', url: '/settings/booking' },
    { name: 'parametres-profil-ia', url: '/settings/ai' },
  ];

  for (const { name, url } of settingsSubPages) {
    console.log(`\n=== Settings: ${name} ===`);
    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30000 });
      await waitForPageLoad(page);
      await screenshot(page, name);
    } catch (e) {
      console.log(`  [WARN] Could not load ${url}:`, e.message.split('\n')[0]);
    }
  }

  // ============================================================
  // 18. AIDE BUTTON (? bottom-right)
  // ============================================================
  console.log('\n=== 18. Aide ===');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForPageLoad(page);
    // The help button is typically a floating button with ? icon
    const helpSelectors = [
      'button:has-text("?")',
      '[aria-label*="aide" i]',
      '[aria-label*="help" i]',
      'button svg.lucide-circle-help',
      'button:has(svg[class*="circle-help"])',
      '.fixed button',
      'button.rounded-full',
    ];
    let helpClicked = false;
    for (const sel of helpSelectors) {
      try {
        const btn = page.locator(sel).last(); // .last() because it's at the bottom
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await delay(2000);
          helpClicked = true;
          break;
        }
      } catch {
        // try next
      }
    }
    if (!helpClicked) {
      // Try clicking the circled ? visible at bottom-right in the dashboard screenshot
      // It's at position roughly (1240, 760) in 1440x900 viewport
      await page.mouse.click(1240, 760);
      await delay(2000);
    }
    await screenshot(page, 'aide');
  } catch (e) {
    console.log('  [WARN] Aide button error:', e.message.split('\n')[0]);
  }

  // ============================================================
  // 19. ADMIN PAGES
  // ============================================================
  console.log('\n=== 19. Admin ===');
  try {
    // First, go to login page and click "Accès Admin"
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

    const adminBtn = page.locator('button:has-text("Accès Admin"), a:has-text("Accès Admin"), button:has-text("Admin")').first();
    if (await adminBtn.isVisible({ timeout: 5000 })) {
      await adminBtn.click();
      await waitForPageLoad(page);
      console.log('  [ok] Clicked "Accès Admin", now on:', page.url());
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle', timeout: 30000 });
      await waitForPageLoad(page);
    }

    // Check if we need to login to admin
    if (page.url().includes('login')) {
      // Try to login with same credentials or admin form
      try {
        await page.fill('input[type="email"], input[name="email"]', CREDENTIALS.email);
        await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);
        await page.click('button[type="submit"], button:has-text("Se connecter"), button:has-text("Connexion")');
        await page.waitForURL('**/admin**', { timeout: 15000 });
        await waitForPageLoad(page);
        console.log('  [ok] Logged into admin');
      } catch (e) {
        console.log('  [WARN] Admin login might have failed:', e.message.split('\n')[0]);
      }
    }

    // Admin dashboard
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForPageLoad(page);
    await screenshot(page, 'admin-dashboard');

    // Admin sub-pages
    const adminPages = [
      { name: 'admin-praticiens', url: '/admin/practitioners' },
      { name: 'admin-patients', url: '/admin/patients' },
      { name: 'admin-billing', url: '/admin/billing' },
      { name: 'admin-logs', url: '/admin/settings/logs' },
    ];

    for (const { name, url } of adminPages) {
      console.log(`\n=== Admin: ${name} ===`);
      try {
        await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30000 });
        await waitForPageLoad(page);
        await screenshot(page, name);
      } catch (e) {
        console.log(`  [WARN] Could not load ${url}:`, e.message.split('\n')[0]);
      }
    }
  } catch (e) {
    console.log('  [WARN] Admin access error:', e.message.split('\n')[0]);
  }

  await browser.close();
  console.log('\n========== Done! ==========');

  // List all screenshots
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\nTotal screenshots: ${files.length}`);
  files.forEach(f => console.log(`  - ${f}`));
}

main().catch(console.error);
