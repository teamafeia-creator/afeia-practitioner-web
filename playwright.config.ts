import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour la campagne QA AFEIA (Étape 2).
 *
 * Contexte sandbox : le réseau sortant est bloqué (voir docs/QA-PLAN.md). La
 * suite tourne sur le build de production servi localement (`next start`).
 * Prérequis : `npm run build` avant `npx playwright test`.
 *
 * Chromium est préinstallé dans l'environnement (`/opt/pw-browsers/chromium`).
 */
const PORT = Number(process.env.QA_PORT || 3210);
const BASE_URL = `http://localhost:${PORT}`;
const CHROMIUM_PATH = process.env.QA_CHROMIUM || '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.QA_WORKERS ? Number(process.env.QA_WORKERS) : 2,
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e/.report/results.json' }],
    ['html', { outputFolder: 'e2e/.report/html', open: 'never' }],
  ],
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
    launchOptions: { executablePath: CHROMIUM_PATH },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: CHROMIUM_PATH } },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
