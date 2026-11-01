// lib/wearables/polar/backfill.ts
// Import de l'historique à la connexion (POL-14).
//
// Période : backfill_days (90 par défaut) jusqu'à hier/aujourd'hui, parcourue du plus récent
// au plus ancien par tranches de 28 jours au plus. Chaque type est borné par l'historique
// réellement disponible chez Polar (docs/wearables/polar.md §2) :
//   * activité : 365 jours, plage from/to de 28 jours max → une requête par tranche ;
//   * sommeil, Nightly Recharge : listes des 28 derniers jours → une requête, première tranche ;
//   * FC continue : profondeur non documentée (28 jours retenus, à vérifier), réponse d'une
//     plage non documentée → une requête par jour.
// backfill_cursor = date la plus ancienne importée, enregistrée après chaque tranche : un
// import interrompu (durée, quota) reprend là où il s'est arrêté. L'ingestion est idempotente
// (upsert), donc rejouer une tranche ne crée pas de doublon.
import 'server-only';
import { getAccessToken, markError, markSynced, sanitizeErrorMessage, claimBackfill, saveBackfillProgress, type BackfillJob } from '@/lib/wearables/connections';
import { isDemoProviderUserId } from '@/lib/wearables/demo';
import { ingestPolarResource, type WearableDataType } from '@/lib/wearables/ingest';
import { PolarRateLimitError, isAccessRevoked, polarFetch } from './api';
import { REVOKED_MESSAGE } from './process-event';

const LOG = '[wearables/polar/backfill]';
export const DEFAULT_BACKFILL_DAYS = 90;
export const CHUNK_DAYS = 28;

/** Profondeur d'historique disponible chez Polar, par type (jours, aujourd'hui compris). */
export const POLAR_HISTORY_DEPTH_DAYS: Record<WearableDataType, number> = {
  daily_activity: 365,
  sleep: 28,
  nightly_recharge: 28,
  continuous_hr: 28,
};

export type Chunk = { from: string; to: string };

const DAY_MS = 86_400_000;
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => fmt(new Date(toDate(s).getTime() + n * DAY_MS));

/** Première date de la période : today − (days − 1). */
export function periodStart(today: string, days: number): string {
  return addDays(today, -(days - 1));
}

/**
 * Tranches restantes, du plus récent au plus ancien, de CHUNK_DAYS jours au plus.
 * cursor = date la plus ancienne déjà importée (la tranche suivante finit la veille).
 */
export function planChunks(today: string, days: number, cursor: string | null): Chunk[] {
  const start = periodStart(today, days);
  let to = cursor ? addDays(cursor, -1) : today;
  const chunks: Chunk[] = [];
  while (to >= start) {
    const from = [addDays(to, -(CHUNK_DAYS - 1)), start].sort().pop()!; // max(to − 27, start)
    chunks.push({ from, to });
    to = addDays(from, -1);
  }
  return chunks;
}

/** Partie d'une tranche couverte par l'historique du type ; null si hors profondeur. */
export function clipToDepth(chunk: Chunk, type: WearableDataType, today: string): Chunk | null {
  const oldest = addDays(today, -(POLAR_HISTORY_DEPTH_DAYS[type] - 1));
  if (chunk.to < oldest) return null;
  return { from: chunk.from < oldest ? oldest : chunk.from, to: chunk.to };
}

export type BackfillOutcome = 'done' | 'paused' | 'rate_limited' | 'failed' | 'skipped' | 'error';
export type BackfillResult = { outcome: BackfillOutcome; chunks: number; records: number; cursor: string | null };

class OutOfTime extends Error {}

export async function runBackfill(
  connectionId: string,
  opts: { maxDurationMs: number; today?: string; now?: () => number }
): Promise<BackfillResult> {
  const now = opts.now ?? Date.now;
  const deadline = now() + opts.maxDurationMs;
  const today = opts.today ?? fmt(new Date(now()));

  const job = await claimBackfill(connectionId);
  if (!job) return { outcome: 'skipped', chunks: 0, records: 0, cursor: null };
  // Connexion de démonstration (« seed-… », faux jeton) : jamais d'appel Polar, rien n'est modifié.
  // (listBackfillsToResume les exclut déjà ; garde-fou si un appel direct arrivait ici.)
  if (isDemoProviderUserId(job.providerUserId)) return { outcome: 'skipped', chunks: 0, records: 0, cursor: job.cursor };

  let cursor = job.cursor;
  let chunksDone = 0;
  let records = 0;
  const checkTime = () => {
    if (now() >= deadline) throw new OutOfTime();
  };

  try {
    const token = await getAccessToken(job.consultantId, 'polar');
    if (!token) {
      await saveBackfillProgress(connectionId, { status: 'failed' });
      return { outcome: 'failed', chunks: 0, records: 0, cursor };
    }

    for (const chunk of planChunks(today, job.days, cursor)) {
      checkTime();
      records += await importChunk(job, chunk, token, today, checkTime);
      cursor = chunk.from;
      chunksDone += 1;
      await saveBackfillProgress(connectionId, { status: 'running', cursor });
    }

    await saveBackfillProgress(connectionId, { status: 'done', cursor: periodStart(today, job.days) });
    await markSynced(job.consultantId, 'polar');
    console.info(LOG, 'import terminé', { connectionId, chunks: chunksDone, records });
    return { outcome: 'done', chunks: chunksDone, records, cursor: periodStart(today, job.days) };
  } catch (error) {
    if (error instanceof OutOfTime) {
      await saveBackfillProgress(connectionId, { status: 'pending' });
      console.info(LOG, 'import interrompu (durée), reprise au prochain passage', { connectionId, cursor });
      return { outcome: 'paused', chunks: chunksDone, records, cursor };
    }
    if (error instanceof PolarRateLimitError) {
      await saveBackfillProgress(connectionId, { status: 'pending' });
      console.warn(LOG, 'quota Polar atteint, reprise au prochain passage', { connectionId, cursor });
      return { outcome: 'rate_limited', chunks: chunksDone, records, cursor };
    }
    if (isAccessRevoked(error)) {
      await markError(job.consultantId, 'polar', REVOKED_MESSAGE);
      await saveBackfillProgress(connectionId, { status: 'failed' });
      return { outcome: 'failed', chunks: chunksDone, records, cursor };
    }
    // Erreur passagère (réseau, 5xx après nouvelles tentatives, base) : reprise au prochain cron.
    await saveBackfillProgress(connectionId, { status: 'pending' }).catch(() => undefined);
    console.error(LOG, 'import en erreur, reprise au prochain passage', {
      connectionId,
      cursor,
      error: sanitizeErrorMessage((error as Error)?.message ?? 'erreur'),
    });
    return { outcome: 'error', chunks: chunksDone, records, cursor };
  }
}

async function importChunk(
  job: BackfillJob,
  chunk: Chunk,
  token: string,
  today: string,
  checkTime: () => void
): Promise<number> {
  let records = 0;
  const ingest = (type: WearableDataType, json: unknown, date: string | null) =>
    ingestPolarResource(type, json, job.consultantId, { providerUserId: job.providerUserId, date, sourceEventId: null });

  // Activité : une requête par tranche (plage ≤ 28 jours).
  const activity = clipToDepth(chunk, 'daily_activity', today);
  if (activity) {
    const json = await polarFetch('/v3/users/activities', { token, query: { from: activity.from, to: activity.to } });
    if (json !== null) records += await ingest('daily_activity', json, null);
  }

  // Sommeil et Nightly Recharge : listes des 28 derniers jours, une fois (tranche la plus récente).
  for (const [type, path] of [
    ['sleep', '/v3/users/sleep'],
    ['nightly_recharge', '/v3/users/nightly-recharge'],
  ] as const) {
    const span = clipToDepth(chunk, type, today);
    if (!span || chunk.to !== today) continue;
    checkTime();
    const json = await polarFetch(path, { token });
    if (json !== null) records += await ingest(type, json, null);
  }

  // FC continue : une requête par jour couvert.
  const hr = clipToDepth(chunk, 'continuous_hr', today);
  if (hr) {
    for (let d = hr.to; d >= hr.from; d = addDays(d, -1)) {
      checkTime();
      const json = await polarFetch(`/v3/users/continuous-heart-rate/${d}`, { token });
      if (json !== null) records += await ingest('continuous_hr', json, d);
    }
  }
  return records;
}

