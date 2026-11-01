// lib/wearables/display.ts
// Mise en forme côté interface de l'état d'une connexion d'objet connecté.
import { format, formatDistanceStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

export type WearableConnectionOverview = {
  provider: 'polar';
  status: 'active' | 'revoked' | 'error';
  connected_at: string;
  last_sync_at: string | null;
  last_error: string | null;
  /** Avancement de l'import d'historique (POL-14). */
  backfill_status?: 'pending' | 'running' | 'done' | 'failed' | null;
  backfill_cursor?: string | null;
  /** Date d'interruption (status error ou revoked), POL-16. */
  interrupted_at?: string | null;
};

/** L'import d'historique n'est pas terminé. */
export function isBackfillInProgress(c: Pick<WearableConnectionOverview, 'backfill_status'> | null): boolean {
  return c?.backfill_status === 'pending' || c?.backfill_status === 'running';
}

/** « il y a 2 heures » */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Math.abs(now.getTime() - date.getTime()) < 60_000) return "à l'instant";
  return formatDistanceStrict(date, now, { addSuffix: true, locale: fr });
}

/** « 1 novembre 2026 » */
export function formatDay(iso: string): string {
  return format(new Date(iso), 'd MMMM yyyy', { locale: fr });
}

/**
 * Traduit l'erreur technique enregistrée (markError) en phrase pour le patient.
 * Le détail technique n'est jamais affiché tel quel.
 */
export function readableSyncError(lastError: string | null): string {
  const e = (lastError ?? '').toLowerCase();
  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|revoked|invalid_grant/.test(e)) {
    return "L'accès à votre objet connecté a expiré ou a été retiré. Reconnectez-le pour reprendre la synchronisation.";
  }
  if (/\b429\b|rate.?limit/.test(e)) {
    return 'La synchronisation est temporairement ralentie. Elle reprendra automatiquement.';
  }
  return "La dernière synchronisation de votre objet connecté a échoué. Reconnectez-le si le problème persiste.";
}
