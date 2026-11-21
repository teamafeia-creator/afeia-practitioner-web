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

// ─── État des nuits (carte consultant) ─────────────────

/** Fenêtre de l'habituel : 28 nuits. */
export const CALIBRATION_WINDOW_DAYS = 28;
/** Nuits nécessaires pour les premières comparaisons (MIN_NIGHTS de l'engine). */
export const CALIBRATION_MIN_NIGHTS = 7;

export type WearNights = {
  /** Nuits mesurées dans la fenêtre. */
  validInWindow: number;
  windowDays: number;
  /** Jour du réveil de la dernière nuit mesurée, ou null. */
  lastNight: string | null;
  /** Jours écoulés depuis (0 = la nuit dernière), ou null. */
  daysSinceLast: number | null;
};

export type WearStateKind = 'waiting_first' | 'calibrating' | 'building' | 'ready' | 'not_worn';

export type WearState = { kind: WearStateKind; title: string; text: string };

/**
 * Message d'état de la carte « Objet connecté » (connexion active), inspiré des apps qui assument
 * leur période de calibration : le patient sait où il en est et ce qu'il doit faire.
 */
export function wearState(n: WearNights | null | undefined, backfilling: boolean): WearState | null {
  if (!n) return null;
  if (n.daysSinceLast !== null && n.daysSinceLast >= 2) {
    const d = n.daysSinceLast;
    return {
      kind: 'not_worn',
      title: `Pas de nuit mesurée depuis ${d} jours`,
      text: 'Vérifiez que le bracelet est porté la nuit, chargé, et synchronisé avec l’application Polar Flow.',
    };
  }
  if (n.validInWindow === 0) {
    return {
      kind: 'waiting_first',
      title: backfilling ? 'Import de votre historique en cours' : 'En attente de votre première nuit',
      text: backfilling
        ? 'Vos nuits précédentes arrivent dans quelques minutes.'
        : 'Portez le bracelet cette nuit : les données arrivent le matin, après la synchronisation avec Polar Flow.',
    };
  }
  if (n.validInWindow < CALIBRATION_MIN_NIGHTS) {
    const left = CALIBRATION_MIN_NIGHTS - n.validInWindow;
    return {
      kind: 'calibrating',
      title: `AFEIA apprend vos nuits · encore ${left} ${left > 1 ? 'nuits' : 'nuit'}`,
      text: `${n.validInWindow} ${n.validInWindow > 1 ? 'nuits mesurées' : 'nuit mesurée'} sur ${CALIBRATION_MIN_NIGHTS} nécessaires avant les premières comparaisons avec votre praticien.`,
    };
  }
  if (n.validInWindow < n.windowDays) {
    return {
      kind: 'building',
      title: 'Votre habituel se construit',
      text: `${n.validInWindow} nuits sur ${n.windowDays} : plus il y a de nuits, plus les comparaisons sont fiables.`,
    };
  }
  return { kind: 'ready', title: 'Habituel établi', text: `${n.windowDays} nuits mesurées sur ${n.windowDays} : vos comparaisons sont complètes.` };
}
