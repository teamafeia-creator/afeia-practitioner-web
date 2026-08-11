'use client';

/**
 * Runtime du mode debug — chargé dynamiquement uniquement quand le mode est
 * actif (voir `DebugMount`). Ce module :
 * 1. démarre l'instrumentation dès le chargement du chunk (effet de bord),
 *    de sorte que les erreurs et requêtes soient captées au plus tôt ;
 * 2. enregistre les outils (import de `tools`, à effet de bord) ;
 * 3. rend le chrome du panneau.
 *
 * Rien de tout ceci n'est inclus dans le bundle quand le debug est éteint.
 */
import { useEffect } from 'react';
import { startInstrumentation } from '@/lib/debug/instrument';
import './tools'; // enregistre errorsTool, networkTool, routeTool, envTool
import { DebugPanel } from './DebugPanel';

// Démarre au chargement du chunk (avant même le montage React), idempotent.
startInstrumentation();

export default function DebugRuntime() {
  useEffect(() => {
    startInstrumentation();
  }, []);

  return <DebugPanel />;
}
