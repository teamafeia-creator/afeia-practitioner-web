/**
 * Formateur du rapport copiable — LE format de sortie du mode debug.
 *
 * Le texte produit est auto-suffisant : recollé dans une nouvelle session, il
 * suffit à comprendre et corriger l'erreur sans autre contexte. La structure
 * Markdown est fixe (voir `docs/DEBUG-TOOLS.md`). Un passage final de masquage
 * garantit qu'aucun secret ne subsiste, même si un appelant a oublié de masquer.
 */
import { redactString } from './redact';
import type { DebugEntry } from './types';

function isoOrRaw(timestamp: number): string {
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return String(timestamp);
  }
}

/** Transforme une entrée normalisée en bloc Markdown au format AFEIA. */
export function formatDebugEntry(entry: DebugEntry): string {
  const lines: string[] = [];

  lines.push(`## Erreur AFEIA — ${isoOrRaw(entry.timestamp)}`);
  lines.push(`- Type: ${entry.kind}`);
  lines.push(`- Route: ${entry.route || '(inconnue)'} (${entry.url || '(inconnue)'})`);
  lines.push(`- Message: ${entry.message || '(vide)'}`);
  lines.push(`- Composant / fichier suspecté: ${entry.suspect || '(non déterminé)'}`);
  lines.push('');
  lines.push('### Stack');
  lines.push(entry.stack?.trim() || '(pas de stack)');

  if (entry.network) {
    const net = entry.network;
    lines.push('');
    lines.push('### Requête réseau (si applicable)');
    lines.push(`- ${net.method} ${net.url} → ${net.status} en ${Math.round(net.durationMs)}ms`);
    lines.push(`- Réponse (tronquée): ${net.responseBody ?? '(vide)'}`);
  }

  lines.push('');
  lines.push('### Contexte');
  lines.push(`- Auth: ${entry.context.auth}`);
  lines.push(`- Viewport: ${entry.context.viewport}, User agent: ${entry.context.userAgent}`);
  lines.push('- Actions précédentes:');
  if (entry.context.actions.length === 0) {
    lines.push('  (aucune action enregistrée)');
  } else {
    entry.context.actions.forEach((action, index) => {
      lines.push(`  ${index + 1}. ${action}`);
    });
  }

  // Filet de sécurité : on masque le rapport complet une dernière fois.
  return redactString(lines.join('\n'));
}

/** Concatène plusieurs blocs avec une séparation lisible. */
export function joinReports(reports: string[]): string {
  return reports
    .map((report) => report.trim())
    .filter(Boolean)
    .join('\n\n---\n\n');
}
