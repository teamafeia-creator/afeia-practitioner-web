/**
 * Activation / désactivation du mode debug.
 *
 * - `?debug=1` (ou `true`) active et persiste en `sessionStorage`.
 * - `?debug=0` (ou `false`) désactive et purge la persistance.
 * - Sans paramètre, on relit l'état persisté.
 *
 * Le mode n'est jamais actif « par défaut » : il faut au moins une visite avec
 * `?debug=1`. Cette fonction est minuscule et sans dépendance lourde, de sorte
 * que son import dans le point de montage n'alourdit pas le bundle : tout le
 * reste du panneau est chargé dynamiquement uniquement quand elle renvoie vrai.
 */
const STORAGE_KEY = 'afeia-debug-enabled';

export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('debug');
    if (flag === '1' || flag === 'true') {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (flag === '0' || flag === 'false') {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Force la désactivation (utilisé par un éventuel bouton « quitter le debug »). */
export function disableDebug(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
