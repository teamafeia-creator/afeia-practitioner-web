/**
 * Orchestration de l'instrumentation debug : démarre erreurs + réseau +
 * navigation, et expose un point d'entrée global pour les Error Boundaries.
 *
 * `startInstrumentation()` est idempotent : appelé au chargement du chunk debug
 * (effet de bord de `DebugRuntime`) et à nouveau au montage du composant.
 */
import { installErrorCapture, publishReactError } from './errors';
import { installNetworkCapture } from './network';
import { installNavigationCapture } from './navigation';

declare global {
  interface Window {
    /** Publie une erreur de rendu React depuis app/error.tsx & global-error.tsx. */
    __afeiaDebugReportReactError?: (error: unknown, componentStack?: string) => void;
    /** Vrai lorsque l'instrumentation debug est active. */
    __afeiaDebugActive?: boolean;
  }
}

let started = false;
let teardowns: Array<() => void> = [];

export function startInstrumentation(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.__afeiaDebugActive = true;
  window.__afeiaDebugReportReactError = (error, componentStack) =>
    publishReactError(error, componentStack);

  teardowns = [installErrorCapture(), installNetworkCapture(), installNavigationCapture()];
}

export function stopInstrumentation(): void {
  teardowns.forEach((teardown) => {
    try {
      teardown();
    } catch {
      /* noop */
    }
  });
  teardowns = [];
  started = false;
  if (typeof window !== 'undefined') {
    window.__afeiaDebugActive = false;
    delete window.__afeiaDebugReportReactError;
  }
}

export { publishReactError };
