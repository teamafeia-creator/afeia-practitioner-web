import { test, expect } from './fixtures';

test.describe('Formulaires — validation client', () => {
  test('Login : champs requis bloquent la soumission (HTML5)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('button[type="submit"]').first().click();
    // La validation native empêche la navigation : on reste sur /login.
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/login');
    const emailInvalid = await page
      .locator('input[type="email"]')
      .first()
      .evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(emailInvalid, 'e-mail vide doit être invalide').toBe(true);
  });

  test('Login : e-mail au format invalide est rejeté', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').first().fill('pas-un-email');
    await page.locator('input[type="password"]').first().fill('quelquechose');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(300);
    const invalid = await page
      .locator('input[type="email"]')
      .first()
      .evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(invalid).toBe(true);
    expect(page.url()).toContain('/login');
  });

  test('Signup : mots de passe non concordants → message d’erreur', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"]').first().fill('Claire Martin');
    await page.locator('input[type="email"]').first().fill('claire@example.com');
    const pw = page.locator('input[type="password"]');
    await pw.nth(0).fill('MotDePasse1');
    await pw.nth(1).fill('MotDePasse2');
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByText(/ne correspondent pas/i)).toBeVisible();
  });

  test('Reset password : e-mail requis', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });
    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
    await page.waitForTimeout(300);
    // Toujours sur la page (soit HTML5 required, soit message client).
    expect(page.url()).toContain('/reset-password');
  });

  test('Double-clic sur le bouton de connexion ne provoque pas de crash', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').first().fill('claire@example.com');
    await page.locator('input[type="password"]').first().fill('MotDePasse1');
    const submit = page.locator('button[type="submit"]').first();
    await submit.click({ clickCount: 2 });
    await page.waitForTimeout(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
