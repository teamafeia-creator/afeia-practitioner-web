// lib/wearables/polar/process-event.ts
// Traitement différé d'une notification Polar : récupère la ressource avec le jeton de
// l'utilisateur, l'ingère, et met à jour l'événement et la connexion.
// Jamais de jeton ni de corps de réponse dans les logs.
import 'server-only';
import { findConnectionByProviderUserId, getAccessToken, markError, markSynced, sanitizeErrorMessage } from '@/lib/wearables/connections';
import { claimEvent, finishEvent, recordEvent, type WearableEvent } from '@/lib/wearables/events';
import { dataTypeForEvent, ingestPolarResource } from './ingest';
import { POLAR_API_ORIGIN, isPolarApiUrl } from './webhook';

const LOG = '[wearables/polar/process-event]';
export const REVOKED_MESSAGE = 'Accès révoqué côté Polar, reconnexion nécessaire';
/** Nightly Recharge pas encore disponible après un SLEEP : nouvel essai dans 6 h. */
export const NIGHTLY_RECHARGE_RETRY_MS = 6 * 3600_000;
/** Garde-fou : nombre maximal de retraitements enchaînés après des notifications pendant le traitement. */
const MAX_RUNS = 3;

export class PolarHttpError extends Error {
  constructor(readonly status: number, path: string) {
    super(`Polar ${path} : HTTP ${status}`);
    this.name = 'PolarHttpError';
  }
}

type Fetched = { status: 'ok'; json: unknown } | { status: 'empty' };

async function fetchPolar(url: string, token: string): Promise<Fetched> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  const path = new URL(url).pathname;
  if (res.status === 204 || res.status === 404) return { status: 'empty' };
  if (!res.ok) throw new PolarHttpError(res.status, path);
  const text = await res.text();
  if (!text.trim()) return { status: 'empty' };
  try {
    return { status: 'ok', json: JSON.parse(text) };
  } catch {
    throw new Error(`Polar ${path} : réponse JSON invalide`);
  }
}

function resourceUrlFor(event: WearableEvent): string | null {
  if (event.event_type === 'NIGHTLY_RECHARGE' && event.event_date) {
    return `${POLAR_API_ORIGIN}/v3/users/nightly-recharge/${event.event_date}`;
  }
  return event.resource_url;
}

/** Après un SLEEP, va chercher le Nightly Recharge du même jour (pas de webhook pour lui). */
async function followNightlyRecharge(event: WearableEvent, consultantId: string, token: string) {
  if (!event.event_date) return;
  const url = `${POLAR_API_ORIGIN}/v3/users/nightly-recharge/${event.event_date}`;
  const nr = await fetchPolar(url, token);
  if (nr.status === 'ok') {
    await ingestPolarResource('nightly_recharge', nr.json, {
      consultantId,
      providerUserId: event.provider_user_id,
      date: event.event_date,
      sourceEventId: event.id,
    });
    return;
  }
  // Pas encore calculé : événement interne à rejouer plus tard (cron POL-09).
  await recordEvent({
    provider: 'polar',
    eventType: 'NIGHTLY_RECHARGE',
    providerUserId: event.provider_user_id,
    eventDate: event.event_date,
    resourceUrl: url,
    payload: { source: 'sleep', source_event_id: event.id },
    idempotencyKey: `polar:NIGHTLY_RECHARGE:${event.provider_user_id}:${event.event_date}`,
    notBefore: new Date(Date.now() + NIGHTLY_RECHARGE_RETRY_MS),
  });
  console.info(LOG, 'Nightly Recharge pas encore disponible, rattrapage programmé', { eventId: event.id });
}

type RunResult = { outcome: 'done' | 'failed' | 'ignored' | 'skipped'; requeued: boolean };

async function runOnce(eventId: string): Promise<RunResult> {
  const event = await claimEvent(eventId);
  if (!event) return { outcome: 'skipped', requeued: false }; // déjà pris, terminé ou pas encore dû

  const finish = async (
    status: 'done' | 'failed' | 'ignored',
    extra: { error?: string; consultantId?: string; retryAt?: Date } = {}
  ): Promise<RunResult> => {
    const res = await finishEvent(event.id, { status, ...extra });
    return { outcome: status, requeued: res.requeued };
  };

  const dataType = dataTypeForEvent(event.event_type);
  if (!dataType) {
    console.info(LOG, 'type hors périmètre, ignoré', { eventId: event.id, type: event.event_type });
    return finish('ignored', { error: undefined });
  }

  let consultantId: string | undefined;
  try {
    const connection = await findConnectionByProviderUserId('polar', event.provider_user_id);
    if (!connection || connection.status === 'revoked') {
      console.info(LOG, 'utilisateur Polar inconnu ou révoqué, ignoré', { eventId: event.id });
      return finish('ignored');
    }
    consultantId = connection.consultantId;

    const url = resourceUrlFor(event);
    if (!isPolarApiUrl(url)) throw new Error('URL de ressource absente ou hors API Polar');

    const token = await getAccessToken(consultantId, 'polar');
    if (!token) {
      console.info(LOG, 'aucun jeton pour la connexion, ignoré', { eventId: event.id, consultantId });
      return finish('ignored', { consultantId });
    }

    const fetched = await fetchPolar(url, token);
    if (fetched.status === 'empty') {
      if (event.event_type === 'NIGHTLY_RECHARGE') {
        return finish('failed', {
          consultantId,
          error: 'Nightly Recharge pas encore disponible',
          retryAt: new Date(Date.now() + NIGHTLY_RECHARGE_RETRY_MS),
        });
      }
      throw new Error(`Polar ${new URL(url).pathname} : ressource vide`);
    }

    await ingestPolarResource(dataType, fetched.json, {
      consultantId,
      providerUserId: event.provider_user_id,
      date: event.event_date,
      sourceEventId: event.id,
    });
    if (event.event_type === 'SLEEP') await followNightlyRecharge(event, consultantId, token);

    await markSynced(consultantId, 'polar');
    return finish('done', { consultantId });
  } catch (error) {
    const message = sanitizeErrorMessage((error as Error)?.message ?? 'erreur inconnue');
    if (consultantId && error instanceof PolarHttpError && (error.status === 401 || error.status === 403)) {
      try {
        await markError(consultantId, 'polar', REVOKED_MESSAGE);
      } catch (markErr) {
        console.error(LOG, 'markError impossible', { consultantId, message: (markErr as Error).message });
      }
    }
    console.warn(LOG, 'traitement échoué', { eventId: event.id, consultantId, error: message });
    return finish('failed', { consultantId, error: message });
  }
}

/**
 * Traite un événement. Si une notification arrive pendant le traitement, l'événement
 * repasse en pending (wearable_finish_event) et il est retraité ici, une fois de plus.
 */
export async function processPolarEvent(eventId: string): Promise<RunResult['outcome']> {
  let last: RunResult['outcome'] = 'skipped';
  for (let run = 0; run < MAX_RUNS; run++) {
    const result = await runOnce(eventId);
    if (result.outcome !== 'skipped') last = result.outcome;
    if (!result.requeued) return last;
    console.info(LOG, 'notification reçue pendant le traitement, retraitement', { eventId });
  }
  // Au-delà, l'événement reste pending : le cron (POL-09) le reprendra.
  return last;
}
