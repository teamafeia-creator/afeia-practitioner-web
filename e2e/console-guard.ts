/**
 * Garde « erreur console = échec ».
 *
 * Principe (cf. docs/QA-PLAN.md §0) : dans ce sandbox le backend est injoignable,
 * ce qui génère un bruit console d'INFRASTRUCTURE (échecs réseau) qu'il faut
 * distinguer des vraies erreurs FRONT. La garde :
 *  - collecte toutes les `console.error` et tous les `pageerror` ;
 *  - échoue si l'un d'eux n'est PAS attribuable au backend bloqué.
 *
 * Chaque motif de l'allowlist est justifié. Retirer un motif ne fait que rendre
 * la garde plus stricte.
 */
import type { ConsoleMessage, Page, TestInfo } from '@playwright/test';

/** Motifs neutralisés : bruit réseau du sandbox (backend bloqué). */
export const INFRA_ALLOWLIST: RegExp[] = [
  // Erreurs réseau bas niveau (hôtes externes coupés par le stub / la sandbox).
  /net::ERR_(TUNNEL_CONNECTION_FAILED|CONNECTION_RESET|CONNECTION_REFUSED|CONNECTION_CLOSED|NAME_NOT_RESOLVED|TIMED_OUT|ABORTED|FAILED|BLOCKED_BY_CLIENT)/i,
  /Failed to load resource/i,
  /Failed to fetch/i,
  /TypeError: Failed to fetch/i,
  /NetworkError|ERR_NETWORK|fetch failed/i,
  // Wrappers applicatifs connus AUTOUR de ces échecs réseau (cf. Étape 0) :
  // l'app logue en console.error quand un fetch backend échoue.
  /Error loading notifications/i,
  /Error fetching unread count/i,
  /Error loading practitioners/i,
  /\[auth\]/i, // hooks/useAuth.ts logue l'état d'auth (dont erreurs de session hors-ligne)
  /\[supabase\]/i, // lib/supabase.ts logue la config / erreurs
  /AuthRetryableFetchError|AuthApiError/i, // supabase-js hors-ligne
];

export interface CapturedError {
  kind: 'console.error' | 'pageerror';
  text: string;
  infra: boolean;
}

function isInfra(text: string): boolean {
  return INFRA_ALLOWLIST.some((re) => re.test(text));
}

/**
 * Installe la garde sur une page. Renvoie un accès aux erreurs collectées et une
 * fonction `assertClean()` qui lève si des erreurs FRONT ont été détectées.
 */
export function installConsoleGuard(page: Page) {
  const errors: CapturedError[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    errors.push({ kind: 'console.error', text, infra: isInfra(text) });
  };
  const onPageError = (err: Error) => {
    const text = `${err.name}: ${err.message}`;
    errors.push({ kind: 'pageerror', text, infra: isInfra(text) });
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    errors,
    /** Erreurs d'origine FRONT (hors allowlist infra). */
    frontErrors: () => errors.filter((e) => !e.infra),
    /** Lève si des erreurs FRONT ont été capturées (à appeler en fin de test). */
    assertClean(testInfo?: TestInfo) {
      const front = errors.filter((e) => !e.infra);
      if (front.length > 0) {
        const detail = front.map((e) => `  [${e.kind}] ${e.text}`).join('\n');
        const infraCount = errors.length - front.length;
        throw new Error(
          `${front.length} erreur(s) console d'origine applicative détectée(s)` +
            (infraCount ? ` (+${infraCount} infra ignorées)` : '') +
            ` :\n${detail}`
        );
      }
      if (testInfo) {
        testInfo.annotations.push({ type: 'console-infra-ignored', description: String(errors.length) });
      }
    },
    dispose() {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}
