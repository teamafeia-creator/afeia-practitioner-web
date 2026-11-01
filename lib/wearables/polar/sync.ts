// lib/wearables/polar/sync.ts
// Rattrapage quotidien (POL-09) :
//  1. pour chaque connexion active : les 3 derniers jours du périmètre MVP, ingérés via
//     ingestPolarResource (idempotent : upsert sur provider_record_id) ;
//  2. rejeu des événements failed (< 5 tentatives), pending dus et processing bloqués ;
//  3. état du webhook ; alerte à l'équipe s'il est absent ou inactif.
// Traitement par lots, avec un budget de temps pour rester sous maxDuration.
import 'server-only';
import { getAccessToken, listActiveConnections, listBackfillsToResume, markError, markSynced, sanitizeErrorMessage } from '@/lib/wearables/connections';
import { requeueDueEvents } from '@/lib/wearables/events';
import { alertWebhookDown } from './alerts';
import { runBackfill, type BackfillOutcome } from './backfill';
import { PolarRateLimitError, getWebhookStatus, isAccessRevoked, polarFetch } from './api';
import { ingestPolarResource, type WearableDataType } from '@/lib/wearables/ingest';
import { processPolarEvent, REVOKED_MESSAGE } from './process-event';

const LOG = '[cron/polar-sync]';
export const BACKFILL_DAYS = 3;
export const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 5;

/** Ressources journalières du périmètre MVP (docs/wearables/polar.md §3). */
const DAILY_RESOURCES: { dataType: WearableDataType; path: (date: string) => string }[] = [
  { dataType: 'sleep', path: (d) => `/v3/users/sleep/${d}` },
  { dataType: 'nightly_recharge', path: (d) => `/v3/users/nightly-recharge/${d}` },
  { dataType: 'continuous_hr', path: (d) => `/v3/users/continuous-heart-rate/${d}` },
  { dataType: 'daily_activity', path: (d) => `/v3/users/activities/${d}` },
];

/** Les `days` derniers jours, hier compris (YYYY-MM-DD, UTC). */
export function lastDays(days: number, now: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (i + 1)));
    return d.toISOString().slice(0, 10);
  });
}

export type SyncSummary = {
  connections: { total: number; processed: number; deferred: number; revoked: number; errors: number };
  resources: { ingested: number; empty: number };
  replay: { due: number; done: number; failed: number; ignored: number; skipped: number };
  webhook: { checked: boolean; active: boolean | null; alerted: boolean };
  /** Imports d'historique repris (POL-14), par résultat. */
  backfill: Record<BackfillOutcome, number>;
  /** Quota Polar presque épuisé : arrêt anticipé, reprise au prochain passage. */
  rateLimited: { at: string; retryAt: string | null } | null;
  errors: string[];
  durationMs: number;
};

async function backfillConnection(
  c: { consultantId: string; providerUserId: string },
  dates: string[],
  summary: SyncSummary
): Promise<void> {
  const token = await getAccessToken(c.consultantId, 'polar');
  if (!token) return;

  try {
    for (const date of dates) {
      for (const r of DAILY_RESOURCES) {
        const fetched = await polarFetch(r.path(date), { token });
        if (fetched === null) {
          summary.resources.empty += 1;
          continue;
        }
        // Pas de `+= await` : les connexions d'un lot tournent en parallèle, et `x += await y`
        // lirait x avant l'attente (incréments perdus).
        const ingested = await ingestPolarResource(r.dataType, fetched, c.consultantId, {
          providerUserId: c.providerUserId,
          date,
          sourceEventId: null,
        });
        summary.resources.ingested += ingested;
      }
    }
    await markSynced(c.consultantId, 'polar');
    summary.connections.processed += 1;
  } catch (error) {
    // Quota Polar épuisé : on arrête le rattrapage (remonté à runPolarSync).
    if (error instanceof PolarRateLimitError) throw error;
    if (isAccessRevoked(error)) {
      await markError(c.consultantId, 'polar', REVOKED_MESSAGE);
      summary.connections.revoked += 1;
      summary.connections.processed += 1;
      return;
    }
    summary.connections.errors += 1;
    summary.errors.push(`connexion ${c.consultantId} : ${sanitizeErrorMessage((error as Error).message ?? 'erreur')}`);
  }
}

export async function runPolarSync(opts: { budgetMs?: number; now?: Date } = {}): Promise<SyncSummary> {
  const started = Date.now();
  const budgetMs = opts.budgetMs ?? 240_000;
  const outOfTime = () => Date.now() - started > budgetMs;
  const summary: SyncSummary = {
    connections: { total: 0, processed: 0, deferred: 0, revoked: 0, errors: 0 },
    resources: { ingested: 0, empty: 0 },
    replay: { due: 0, done: 0, failed: 0, ignored: 0, skipped: 0 },
    webhook: { checked: false, active: null, alerted: false },
    backfill: { done: 0, paused: 0, rate_limited: 0, failed: 0, skipped: 0, error: 0 },
    rateLimited: null,
    errors: [],
    durationMs: 0,
  };

  // 1. Webhook d'abord : l'alerte part même si la suite manque de temps.
  try {
    const status = await getWebhookStatus();
    summary.webhook.checked = true;
    summary.webhook.active = status.exists && status.active;
    if (!summary.webhook.active) {
      summary.webhook.alerted = (await alertWebhookDown(status)) > 0;
    }
  } catch (error) {
    summary.errors.push(`webhook : ${sanitizeErrorMessage((error as Error).message ?? 'erreur')}`);
  }

  // 1 bis. Imports d'historique non terminés (connexion récente interrompue, quota, échec passager).
  //        La moitié du budget au plus, pour garder du temps pour le rattrapage quotidien.
  const backfillDeadline = started + budgetMs / 2;
  for (const connectionId of await listBackfillsToResume('polar')) {
    const remaining = backfillDeadline - Date.now();
    if (remaining <= 0) break;
    const result = await runBackfill(connectionId, { maxDurationMs: remaining, today: opts.now?.toISOString().slice(0, 10) });
    summary.backfill[result.outcome] += 1;
    if (result.outcome === 'rate_limited') {
      summary.rateLimited = { at: 'import historique', retryAt: null };
      break;
    }
  }

  // 2. Rattrapage des connexions actives, par lots, les moins récemment synchronisées d'abord.
  const dates = lastDays(BACKFILL_DAYS, opts.now);
  const connections = summary.rateLimited ? [] : await listActiveConnections('polar');
  summary.connections.total = connections.length;
  for (let i = 0; i < connections.length; i += BATCH_SIZE) {
    if (outOfTime()) {
      summary.connections.deferred = connections.length - i;
      break;
    }
    const batch = connections.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((c) => backfillConnection(c, dates, summary)));
    const limited = results.find(
      (r): r is PromiseRejectedResult => r.status === 'rejected' && r.reason instanceof PolarRateLimitError
    );
    if (limited) {
      const err = limited.reason as PolarRateLimitError;
      summary.rateLimited = { at: 'rattrapage', retryAt: err.retryAt?.toISOString() ?? null };
      summary.connections.deferred = connections.length - i - results.filter((r) => r.status === 'fulfilled').length;
      break;
    }
    for (const r of results) {
      if (r.status === 'rejected') throw r.reason; // erreur inattendue (base) : remontée telle quelle
    }
  }

  // 3. Rejeu des événements (pas de rejeu si le quota Polar est atteint).
  if (!outOfTime() && !summary.rateLimited) {
    const due = await requeueDueEvents({ maxAttempts: MAX_ATTEMPTS });
    summary.replay.due = due.length;
    for (const event of due) {
      if (outOfTime()) break;
      try {
        const outcome = await processPolarEvent(event.id);
        summary.replay[outcome] += 1;
      } catch (error) {
        summary.replay.failed += 1;
        summary.errors.push(`événement ${event.id} : ${sanitizeErrorMessage((error as Error).message ?? 'erreur')}`);
      }
    }
  }

  summary.durationMs = Date.now() - started;
  console.info(LOG, 'récapitulatif', {
    connexions: summary.connections,
    ressources: summary.resources,
    rejeu: summary.replay,
    webhook: summary.webhook,
    import_historique: summary.backfill,
    quota: summary.rateLimited,
    erreurs: summary.errors.length,
    durée_ms: summary.durationMs,
  });
  for (const e of summary.errors.slice(0, 20)) console.warn(LOG, e);
  return summary;
}
