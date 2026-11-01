// lib/server/background.ts
// Poursuit un traitement après l'envoi de la réponse HTTP.
// Next 14 n'a pas `after()` (Next 15) : on utilise `waitUntil` de Vercel, qui garde la
// fonction en vie jusqu'à la fin de la promesse. Hors Vercel, la promesse s'exécute
// simplement en tâche de fond du processus Node.
// À remplacer par `after()` de next/server lors du passage à Next 15.
import 'server-only';
import { waitUntil } from '@vercel/functions';

export function runInBackground(label: string, task: () => Promise<unknown>): void {
  waitUntil(
    task().catch((error: unknown) => {
      console.error(`[background] ${label} a échoué`, { message: (error as Error)?.message });
    })
  );
}
