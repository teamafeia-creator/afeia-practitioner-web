/**
 * Bus d'événements interne du mode debug.
 *
 * Point de rencontre unique où l'instrumentation publie erreurs, requêtes
 * réseau, navigations et clics. Les outils s'y abonnent librement — il n'existe
 * aucun couplage entre outils. Le bus conserve un tampon circulaire des
 * derniers événements et un fil d'Ariane des 20 dernières actions utilisateur.
 */
import type { Breadcrumb, DebugEvent, DebugEventType } from './types';

const MAX_EVENTS = 500;
const MAX_BREADCRUMBS = 20;

const events: DebugEvent[] = [];
const breadcrumbs: Breadcrumb[] = [];

/** Abonnés recevant chaque événement individuel (hooks `onEvent`, etc.). */
const eventListeners = new Set<(event: DebugEvent) => void>();
/** Abonnés notifiés à chaque mutation (pour re-render React). */
const changeListeners = new Set<() => void>();

let seq = 0;

function nextId(): string {
  seq += 1;
  return `${Date.now().toString(36)}-${seq.toString(36)}`;
}

function notifyChange(): void {
  changeListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* un abonné défaillant ne doit pas casser le bus */
    }
  });
}

/** Publie un événement sur le bus et notifie les abonnés. */
export function publish<T>(type: DebugEventType, payload: T): DebugEvent<T> {
  const event: DebugEvent<T> = {
    id: nextId(),
    seq,
    type,
    timestamp: Date.now(),
    payload,
  };
  events.push(event as DebugEvent);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  eventListeners.forEach((listener) => {
    try {
      listener(event as DebugEvent);
    } catch {
      /* idem */
    }
  });
  notifyChange();
  return event;
}

/** Ajoute une action au fil d'Ariane (max 20, plus récentes conservées). */
export function recordBreadcrumb(type: DebugEventType, label: string): void {
  breadcrumbs.push({ type, label, timestamp: Date.now() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
  }
}

/** Copie du fil d'Ariane courant (ordre chronologique). */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

/** Événements du bus, filtrés par type si fourni (copie défensive). */
export function getEvents(type?: DebugEventType): DebugEvent[] {
  return type ? events.filter((event) => event.type === type) : [...events];
}

/** Abonnement à chaque événement individuel. Renvoie une fonction de désabonnement. */
export function subscribe(listener: (event: DebugEvent) => void): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

/** Abonnement aux mutations (publish/clear). Renvoie une fonction de désabonnement. */
export function subscribeChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/** Vide les événements (et le fil d'Ariane si `type` non fourni). */
export function clearEvents(type?: DebugEventType): void {
  if (type) {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      if (events[i].type === type) events.splice(i, 1);
    }
  } else {
    events.length = 0;
    breadcrumbs.length = 0;
  }
  notifyChange();
}
