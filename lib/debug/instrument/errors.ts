/**
 * Capture des erreurs et publication sur le bus.
 *
 * Sources couvertes :
 * - erreurs JS non gérées (`window.onerror` / événement `error`) ;
 * - promesses rejetées (`unhandledrejection`) ;
 * - `console.error` (=> type 'error') et `console.warn` (=> type 'console'),
 *   interception NON destructive (l'original est toujours appelé) ;
 * - erreurs de rendu React, publiées par les Error Boundaries via
 *   `window.__afeiaDebugReportReactError` (voir `app/error.tsx`).
 *
 * Les erreurs serveur / server actions renvoyées au client transitent en
 * pratique par `console.error` ou par une réponse réseau en échec : elles sont
 * donc déjà captées par ces deux canaux et par l'outil Réseau.
 */
import { getDebugContext, getCurrentRoute } from '../context';
import { publish } from '../bus';
import { redactString } from '../redact';
import type { DebugEntryKind } from '../types';

/** Forme du payload d'une erreur publiée sur le bus (type d'événement 'error' ou 'console'). */
export interface ErrorPayload {
  kind: DebugEntryKind;
  message: string;
  stack?: string;
  suspect?: string;
  route: string;
  url: string;
  context: ReturnType<typeof getDebugContext>;
}

function buildPayload(kind: DebugEntryKind, message: string, stack?: string, suspect?: string): ErrorPayload {
  const { route, url } = getCurrentRoute();
  return {
    kind,
    message: redactString(message || ''),
    stack: stack ? redactString(stack) : undefined,
    suspect,
    route,
    url,
    context: getDebugContext(),
  };
}

function stringifyArg(arg: unknown): string {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

/** Publie une erreur de rendu React (appelé par les Error Boundaries). */
export function publishReactError(error: unknown, componentStack?: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const suspect = componentStack
    ? componentStack.split('\n').map((l) => l.trim()).filter(Boolean)[0]
    : undefined;
  const stack = [err.stack, componentStack ? `\n--- Component stack ---${componentStack}` : '']
    .filter(Boolean)
    .join('');
  publish('error', buildPayload('react', err.message, stack, suspect));
}

/** Installe les capteurs d'erreurs. Renvoie une fonction de démontage. */
export function installErrorCapture(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    const suspect = event.filename
      ? `${event.filename}:${event.lineno}:${event.colno}`
      : undefined;
    const message = event.message || (event.error instanceof Error ? event.error.message : 'Erreur JS');
    const stack = event.error instanceof Error ? event.error.stack : undefined;
    publish('error', buildPayload('js', message, stack, suspect));
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : `Promesse rejetée: ${stringifyArg(reason)}`;
    const stack = reason instanceof Error ? reason.stack : undefined;
    publish('error', buildPayload('js', message, stack, 'unhandledrejection'));
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // Interception non destructive de console.error / console.warn.
  const originalError = window.console.error;
  const originalWarn = window.console.warn;

  window.console.error = (...args: unknown[]) => {
    originalError.apply(window.console, args as []);
    try {
      const first = args[0];
      const stack = first instanceof Error ? first.stack : undefined;
      publish('error', buildPayload('console', args.map(stringifyArg).join(' '), stack, 'console.error'));
    } catch {
      /* ne jamais casser console.error */
    }
  };

  window.console.warn = (...args: unknown[]) => {
    originalWarn.apply(window.console, args as []);
    try {
      publish('console', buildPayload('console', args.map(stringifyArg).join(' '), undefined, 'console.warn'));
    } catch {
      /* noop */
    }
  };

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    window.console.error = originalError;
    window.console.warn = originalWarn;
  };
}
