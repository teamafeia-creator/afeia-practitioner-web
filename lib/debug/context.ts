/**
 * Collecte du contexte d'exécution pour les rapports debug : route courante,
 * état d'authentification (masqué), viewport, user-agent, fil d'Ariane.
 *
 * La détection d'auth est « best-effort » et volontairement découplée de
 * Supabase : on lit le token persisté par le client Supabase
 * (`storageKey: 'afeia-auth-token'`, cf. `lib/supabase.ts`) et le cookie admin,
 * sans jamais exposer de secret (l'e-mail est masqué).
 */
import { getBreadcrumbs } from './bus';
import { redactEmail } from './redact';
import type { DebugEntryContext } from './types';

const SUPABASE_STORAGE_KEY = 'afeia-auth-token';

/** Renvoie une description lisible et masquée de l'état d'authentification. */
export function detectAuth(): string {
  if (typeof window === 'undefined') return 'inconnu';
  try {
    const raw = window.localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        user?: { email?: string; role?: string; user_metadata?: { role?: string } };
        currentSession?: { user?: { email?: string; user_metadata?: { role?: string } } };
      };
      const user = parsed.user ?? parsed.currentSession?.user;
      const email = user?.email;
      const role = user?.user_metadata?.role ?? (parsed.user as { role?: string } | undefined)?.role;
      const parts = ['connecté'];
      if (role) parts.push(`(${role})`);
      if (email) parts.push(`— ${redactEmail(email)}`);
      return parts.join(' ');
    }
  } catch {
    /* token illisible => on tombe sur les autres cas */
  }
  try {
    if (document.cookie.includes('afeia_admin_email')) return 'connecté (admin)';
  } catch {
    /* noop */
  }
  return 'anonyme';
}

/** Contexte complet pour le bloc « Contexte » du rapport. */
export function getDebugContext(): DebugEntryContext {
  if (typeof window === 'undefined') {
    return { auth: 'inconnu', viewport: '', userAgent: '', actions: [] };
  }
  return {
    auth: detectAuth(),
    viewport: `${window.innerWidth} x ${window.innerHeight}`,
    userAgent: navigator.userAgent,
    actions: getBreadcrumbs().map((crumb) => `[${crumb.type}] ${crumb.label}`),
  };
}

/** Route courante (chemin) et URL complète (query comprise). */
export function getCurrentRoute(): { route: string; url: string } {
  if (typeof window === 'undefined') return { route: '', url: '' };
  return { route: window.location.pathname, url: window.location.href };
}
