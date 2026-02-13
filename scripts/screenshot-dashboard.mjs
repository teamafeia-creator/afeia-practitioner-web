/**
 * Playwright script: login to afeia.fr and take full-page screenshots
 * of every dashboard route.
 *
 * Usage:
 *   AFEIA_EMAIL=you@example.com AFEIA_PASSWORD=secret node scripts/screenshot-dashboard.mjs
 */

import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, "..", "screenshots");

const BASE_URL = "https://afeia.fr";
const EMAIL = process.env.AFEIA_EMAIL;
const PASSWORD = process.env.AFEIA_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Missing credentials. Set AFEIA_EMAIL and AFEIA_PASSWORD environment variables.");
  process.exit(1);
}

const ROUTES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/agenda", name: "agenda" },
  { path: "/consultants", name: "consultants" },
  { path: "/messages", name: "messages" },
  { path: "/questionnaires", name: "questionnaires" },
  { path: "/facturation", name: "facturation" },
  { path: "/settings", name: "settings" },
];

// Resolve the Chromium executable – prefer the pre-installed Playwright
// Chromium, then fall back to system Chromium.
function findChromium() {
  const candidates = [
    "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
    "/root/.cache/ms-playwright/chromium-1208/chrome-linux/chrome",
    process.env.CHROMIUM_PATH,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  // If nothing found, let Playwright try to locate it automatically
  return undefined;
}

async function main() {
  // Ensure screenshots directory exists
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const executablePath = findChromium();
  console.log(
    executablePath
      ? `Using Chromium at: ${executablePath}`
      : "Using Playwright default browser lookup"
  );

  // Parse proxy from environment if available
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  let proxyConfig;
  if (proxyUrl) {
    try {
      const parsed = new URL(proxyUrl);
      proxyConfig = {
        server: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
      console.log(`Using proxy: ${proxyConfig.server}`);
    } catch {
      console.log("Could not parse proxy URL, proceeding without proxy config");
    }
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--ignore-certificate-errors",
    ],
    proxy: proxyConfig,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "fr-FR",
  });

  const page = await context.newPage();

  // ── Step 1: Login ──────────────────────────────────────────────────────
  console.log(`Navigating to ${BASE_URL}/login …`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  // Wait for the form inputs to be ready
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(2000);

  console.log(`Filling in credentials for ${EMAIL} …`);
  const emailInput = page.locator('input[type="email"]');
  await emailInput.click({ force: true });
  await emailInput.fill(EMAIL, { force: true });

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.click({ force: true });
  await passwordInput.fill(PASSWORD, { force: true });

  await page.locator('button:has-text("Se connecter")').click({ force: true });

  // Wait for redirect to /dashboard (up to 30 s)
  try {
    await page.waitForURL("**/dashboard**", { timeout: 30_000 });
    console.log("Login successful – redirected to dashboard.\n");
  } catch {
    // Take a screenshot of the current state to help debug
    const debugPath = path.join(SCREENSHOTS_DIR, "login-failed.png");
    await page.screenshot({ path: debugPath, fullPage: true });
    console.error(
      `Login may have failed. Current URL: ${page.url()}\nDebug screenshot saved to ${debugPath}`
    );
  }

  // ── Step 2: Screenshot every route ─────────────────────────────────────
  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    console.log(`→ ${url}`);

    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

    // Give the page a moment to finish rendering animations / lazy content
    await page.waitForTimeout(1500);

    const filePath = path.join(SCREENSHOTS_DIR, `${route.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  ✔ saved ${filePath}`);
  }

  await browser.close();
  console.log(`\nDone – ${ROUTES.length} screenshots saved in ${SCREENSHOTS_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
