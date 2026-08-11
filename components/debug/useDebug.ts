'use client';

/**
 * Hooks React partagés par les outils debug.
 *
 * `useDebugEvents` re-render le composant à chaque mutation du bus et renvoie
 * les événements (filtrés par type). Pattern volontairement simple
 * (useReducer + abonnement) : suffisant et robuste pour un outil de debug.
 */
import { useEffect, useReducer } from 'react';
import { getEvents, subscribeChange } from '@/lib/debug/bus';
import type { DebugEvent, DebugEventType } from '@/lib/debug/types';

export function useDebugEvents(type?: DebugEventType): DebugEvent[] {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribeChange(force), []);
  return getEvents(type);
}

/** Re-render à chaque mutation du bus sans lire d'événements (badges, etc.). */
export function useDebugTick(): number {
  const [tick, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribeChange(force), []);
  return tick;
}
