/**
 * Capture des navigations client et des actions utilisateur (clics, submits).
 *
 * - Navigations : patch de `history.pushState` / `replaceState` + `popstate`
 *   (couvre le routeur App Router de Next, qui s'appuie sur l'History API).
 * - Clics : écouteur en capture, description lisible de la cible.
 * - Submits : écouteur en capture.
 *
 * Tout alimente le bus ET le fil d'Ariane (20 dernières actions).
 */
import { publish, recordBreadcrumb } from '../bus';
import { redactString } from '../redact';

function describeElement(el: Element | null): string {
  if (!el) return 'inconnu';
  const tag = el.tagName.toLowerCase();
  const aria = el.getAttribute('aria-label');
  const id = el.id ? `#${el.id}` : '';
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const label = aria || text || el.getAttribute('name') || el.getAttribute('placeholder') || '';
  return redactString(`${tag}${id}${label ? ` « ${label} »` : ''}`);
}

/** Installe la capture navigation + clics + submits. Renvoie une fonction de démontage. */
export function installNavigationCapture(): () => void {
  if (typeof window === 'undefined') return () => {};

  const emitNavigation = (to: string, method: string) => {
    const payload = { to: redactString(to), from: redactString(window.location.pathname), method };
    publish('navigation', payload);
    recordBreadcrumb('navigation', `${method} → ${redactString(to)}`);
  };

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (this: History, ...args) {
    const url = args[2];
    const result = originalPush.apply(this, args);
    if (url != null) emitNavigation(String(url), 'push');
    return result;
  } as typeof history.pushState;

  history.replaceState = function (this: History, ...args) {
    const url = args[2];
    const result = originalReplace.apply(this, args);
    if (url != null) emitNavigation(String(url), 'replace');
    return result;
  } as typeof history.replaceState;

  const onPopState = () => emitNavigation(window.location.pathname, 'pop');

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const actionable = target?.closest('a, button, [role="button"], input[type="submit"]') ?? target;
    const label = describeElement(actionable);
    publish('click', { label });
    recordBreadcrumb('click', label);
  };

  const onSubmit = (event: Event) => {
    const form = event.target as HTMLFormElement | null;
    const label = describeElement(form);
    publish('submit', { label });
    recordBreadcrumb('submit', `submit ${label}`);
  };

  window.addEventListener('popstate', onPopState);
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener('popstate', onPopState);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('submit', onSubmit, true);
  };
}
