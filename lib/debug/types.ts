/**
 * Types partagés du mode debug AFEIA.
 *
 * Ce module ne dépend d'aucun autre module debug : il est importable partout
 * (client uniquement en pratique) sans effet de bord.
 */
import type { ComponentType, ReactNode } from 'react';

/** Catégories d'événements publiés sur le bus interne. */
export type DebugEventType =
  | 'error' // erreur JS / promesse rejetée / rendu React / console.error / serveur
  | 'network' // requête fetch / XHR
  | 'navigation' // changement de route côté client
  | 'click' // clic utilisateur
  | 'submit' // soumission de formulaire
  | 'console'; // console.warn (les console.error partent en 'error')

/** Événement générique circulant sur le bus. */
export interface DebugEvent<T = unknown> {
  id: string;
  seq: number;
  type: DebugEventType;
  timestamp: number; // epoch ms
  payload: T;
}

/** Élément du fil d'Ariane (dernières actions utilisateur). */
export interface Breadcrumb {
  type: DebugEventType;
  label: string;
  timestamp: number;
}

/**
 * Contrat d'un outil du panneau debug.
 *
 * Un outil est totalement autonome : il s'abonne au bus s'il en a besoin,
 * rend son propre `Panel`, et expose optionnellement un `copyReport()` utilisé
 * par le bouton « Copier tout ». Ajouter un outil = créer un fichier + l'ajouter
 * dans `components/debug/tools/index.ts`. Aucun autre fichier n'est à modifier.
 */
export interface DebugTool {
  /** Identifiant unique et stable (sert de clé d'onglet). */
  id: string;
  /** Libellé affiché sur l'onglet. */
  label: string;
  /** Icône de l'onglet (élément React, ex. une icône lucide). */
  icon: ReactNode;
  /** Compteur optionnel affiché en badge sur l'onglet. `null`/`0` => pas de badge. */
  badge?: () => number | null;
  /** Composant rendu quand l'onglet est actif. */
  Panel: ComponentType;
  /** Hook optionnel appelé à chaque événement du bus (effets de bord seulement). */
  onEvent?: (event: DebugEvent) => void;
  /** Rapport Markdown auto-suffisant de cet outil, concaténé par « Copier tout ». */
  copyReport?: () => string;
}

/** Nature d'une entrée de rapport (aligne le champ `Type:` du format copié). */
export type DebugEntryKind = 'js' | 'react' | 'network' | 'console' | 'server';

/** Bloc « Requête réseau » du rapport. */
export interface DebugNetworkInfo {
  method: string;
  url: string;
  status: number | string;
  durationMs: number;
  responseBody?: string;
}

/** Bloc « Contexte » du rapport. */
export interface DebugEntryContext {
  auth: string;
  viewport: string;
  userAgent: string;
  actions: string[];
}

/** Entrée normalisée transformée en Markdown par `formatDebugEntry`. */
export interface DebugEntry {
  kind: DebugEntryKind;
  timestamp: number;
  route: string;
  url: string;
  message: string;
  suspect?: string;
  stack?: string;
  network?: DebugNetworkInfo;
  context: DebugEntryContext;
}
