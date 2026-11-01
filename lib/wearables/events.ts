// lib/wearables/events.ts
// File d'événements des objets connectés (table wearable_events, migration 20261103).
// Toutes les transitions passent par des fonctions SQL atomiques (service_role).
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import type { WearableProvider } from './connections';

export type WearableEventStatus = 'pending' | 'processing' | 'done' | 'failed' | 'ignored';

export type WearableEvent = {
  id: string;
  provider: WearableProvider;
  event_type: string;
  provider_user_id: string;
  consultant_id: string | null;
  event_date: string | null;
  resource_url: string | null;
  payload: Record<string, unknown>;
  status: WearableEventStatus;
  attempts: number;
  last_error: string | null;
  last_notified_at: string;
  processing_started_at: string | null;
};

export type RecordEventInput = {
  provider: WearableProvider;
  eventType: string;
  providerUserId: string;
  eventDate: string | null;
  resourceUrl: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  /** Pour un événement différé (ex. Nightly Recharge à réessayer plus tard). */
  notBefore?: Date;
};

function fail(op: string, error: { message?: string; code?: string }): never {
  throw new Error(`wearable_events.${op} a échoué${error.code ? ` (${error.code})` : ''}: ${error.message ?? 'erreur inconnue'}`);
}

/** Enregistre (ou re-notifie) un événement. shouldProcess = il est pending et dû. */
export async function recordEvent(input: RecordEventInput): Promise<{ id: string; status: WearableEventStatus; shouldProcess: boolean }> {
  const { data, error } = await createSupabaseAdminClient().rpc('wearable_record_event', {
    p_provider: input.provider,
    p_event_type: input.eventType,
    p_provider_user_id: input.providerUserId,
    p_event_date: input.eventDate,
    p_resource_url: input.resourceUrl,
    p_payload: input.payload,
    p_idempotency_key: input.idempotencyKey,
    p_next_attempt_at: (input.notBefore ?? new Date()).toISOString(),
  });
  if (error) fail('recordEvent', error);
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; status: WearableEventStatus; should_process: boolean };
  return { id: row.id, status: row.status, shouldProcess: row.should_process };
}

/** pending → processing. Renvoie null si l'événement n'est pas (ou plus) disponible. */
export async function claimEvent(id: string): Promise<WearableEvent | null> {
  const { data, error } = await createSupabaseAdminClient().rpc('wearable_claim_event', { p_id: id });
  if (error) fail('claimEvent', error);
  const rows = (data ?? []) as WearableEvent[];
  return rows[0] ?? null;
}

/** Termine le traitement. requeued = une notification est arrivée pendant le traitement. */
export async function finishEvent(
  id: string,
  outcome: { status: 'done' | 'failed' | 'ignored'; error?: string | null; retryAt?: Date | null; consultantId?: string | null }
): Promise<{ requeued: boolean; status: WearableEventStatus; attempts: number }> {
  const { data, error } = await createSupabaseAdminClient().rpc('wearable_finish_event', {
    p_id: id,
    p_status: outcome.status,
    p_error: outcome.error ?? null,
    p_retry_at: outcome.retryAt ? outcome.retryAt.toISOString() : null,
    p_consultant_id: outcome.consultantId ?? null,
  });
  if (error) fail('finishEvent', error);
  const row = (Array.isArray(data) ? data[0] : data) as { requeued: boolean; status: WearableEventStatus; attempts: number };
  return row;
}
