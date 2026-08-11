/**
 * Utilitaires partagés par les specs QA.
 */
import type { Page } from '@playwright/test';

/** Routes publiques (accessibles sans authentification) — cf. QA-INVENTAIRE §3.1. */
export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/reset-password',
  '/welcome',
  '/questionnaire',
  '/consultant/login',
  '/consultant/register',
  '/admin/login',
  '/paiement/succes',
];

/** Routes protégées (doivent rediriger l'anonyme). */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/consultants',
  '/agenda',
  '/messages',
  '/facturation',
  '/statistics',
  '/settings',
];

/** Liens internes repérés à l'Étape 0 comme pointant vers des routes absentes. */
export const KNOWN_DEAD_LINKS = [
  '/notifications',
  '/consultant/demo/add-supplements',
  '/consultant/demo/daily-log',
  '/consultant/demo/messages',
];

/** Renvoie le scroll horizontal (px) de la page : > 0 = débordement. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

/** Collecte les hrefs internes (même origine) présents sur la page. */
export async function collectInternalLinks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const origin = window.location.origin;
    const out = new Set<string>();
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      if (href.startsWith(origin)) {
        const path = href.slice(origin.length).split('#')[0];
        if (path && !path.startsWith('/_next') && !path.startsWith('/api')) out.add(path || '/');
      }
    });
    return Array.from(out);
  });
}

/** Liens externes (nouvel onglet) sans rel noopener — risque tabnabbing. */
export async function unsafeExternalLinks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      const el = a as HTMLAnchorElement;
      const rel = (el.getAttribute('rel') || '').toLowerCase();
      if (!rel.includes('noopener')) out.push(el.href);
    });
    return out;
  });
}
