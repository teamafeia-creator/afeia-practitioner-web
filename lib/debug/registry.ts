/**
 * Registre des outils du panneau debug.
 *
 * `registerDebugTool` est appelé une fois par outil (depuis
 * `components/debug/tools/index.ts`). Le panneau lit le registre et rend les
 * onglets : il ne connaît aucun outil en particulier.
 */
import type { DebugTool } from './types';

const tools: DebugTool[] = [];
const listeners = new Set<() => void>();

/** Enregistre un outil. Idempotent par `id` (évite les doublons en HMR). */
export function registerDebugTool(tool: DebugTool): void {
  const existingIndex = tools.findIndex((t) => t.id === tool.id);
  if (existingIndex >= 0) {
    // Remplace la définition (utile en développement / Fast Refresh).
    tools[existingIndex] = tool;
  } else {
    tools.push(tool);
  }
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* noop */
    }
  });
}

/** Liste des outils enregistrés (référence stable, lecture seule). */
export function getRegisteredTools(): readonly DebugTool[] {
  return tools;
}

/** Abonnement aux changements du registre. Renvoie une fonction de désabonnement. */
export function subscribeRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
