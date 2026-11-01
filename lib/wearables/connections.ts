// lib/wearables/connections.ts
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

/**
 * Connexions aux objets connectés (table wearable_connections, migration 20261101).
 *
 * Le jeton OAuth est chiffré dans Supabase Vault ; seules les fonctions SQL
 * SECURITY DEFINER, exécutables par service_role uniquement, le lisent ou l'écrivent.
 * Ce module utilise donc le client admin et ne doit jamais être importé côté client.
 *
 * Règle : aucun jeton dans les logs ni dans les messages d'erreur.
 */

export type WearableProvider = 'polar';
export type WearableConnectionStatus = 'active' | 'revoked' | 'error';

const MAX_ERROR_LENGTH = 500;

export class WearableConnectionError extends Error {
  constructor(operation: string, cause: { message?: string; code?: string } | null) {
    super(`wearable_connections.${operation} a échoué${cause?.code ? ` (${cause.code})` : ''}: ${cause?.message ?? 'erreur inconnue'}`);
    this.name = 'WearableConnectionError';
  }
}

export type SaveConnectionInput = {
  consultantId: string;
  provider: WearableProvider;
  providerUserId: string;
  accessToken: string;
  /** `expires_in` de la réponse token (secondes). Absent ou nul → pas d'expiration connue. */
  expiresIn?: number | null;
  /** Injectable pour les tests. */
  now?: Date;
};

export function computeTokenExpiresAt(expiresIn: number | null | undefined, now: Date = new Date()): string | null {
  if (!expiresIn || !Number.isFinite(expiresIn) || expiresIn <= 0) return null;
  return new Date(now.getTime() + expiresIn * 1000).toISOString();
}

/** Crée ou met à jour la connexion (statut `active`) et chiffre le jeton. Renvoie l'id de la connexion. */
export async function saveConnection(input: SaveConnectionInput): Promise<string> {
  if (!input.accessToken) throw new Error('saveConnection : accessToken manquant');

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('wearable_save_connection', {
    p_consultant_id: input.consultantId,
    p_provider: input.provider,
    p_provider_user_id: input.providerUserId,
    p_access_token: input.accessToken,
    p_token_expires_at: computeTokenExpiresAt(input.expiresIn, input.now),
  });
  if (error) throw new WearableConnectionError('saveConnection', error);
  return data as string;
}

/** Jeton déchiffré, ou `null` si la connexion n'existe pas ou a été révoquée. */
export async function getAccessToken(consultantId: string, provider: WearableProvider): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('wearable_get_access_token', {
    p_consultant_id: consultantId,
    p_provider: provider,
  });
  if (error) throw new WearableConnectionError('getAccessToken', error);
  return (data as string | null) ?? null;
}

/** Passe la connexion en `revoked` et supprime le jeton de Vault. */
export async function markRevoked(consultantId: string, provider: WearableProvider): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('wearable_revoke_connection', {
    p_consultant_id: consultantId,
    p_provider: provider,
  });
  if (error) throw new WearableConnectionError('markRevoked', error);
}

/** Retire d'un message tout ce qui ressemble à un jeton, puis le tronque. */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/(bearer|basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]')
    .replace(/(access_token|token|secret|code)(["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi, '$1$2[redacted]')
    .slice(0, MAX_ERROR_LENGTH);
}

/** Passe la connexion en `error`. Le jeton est conservé pour que la prochaine synchro réessaie. */
export async function markError(consultantId: string, provider: WearableProvider, message: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('wearable_connections')
    .update({ status: 'error', last_error: sanitizeErrorMessage(message), updated_at: new Date().toISOString() })
    .eq('consultant_id', consultantId)
    .eq('provider', provider)
    .neq('status', 'revoked');
  if (error) throw new WearableConnectionError('markError', error);
}

export type ConnectionRef = {
  consultantId: string;
  status: WearableConnectionStatus;
};

/** Connexion associée à un identifiant utilisateur du fournisseur (ex. x_user_id Polar), ou null. */
export async function findConnectionByProviderUserId(
  provider: WearableProvider,
  providerUserId: string
): Promise<ConnectionRef | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('wearable_connections')
    .select('consultant_id, status')
    .eq('provider', provider)
    .eq('provider_user_id', providerUserId)
    .maybeSingle();
  if (error) throw new WearableConnectionError('findConnectionByProviderUserId', error);
  return data ? { consultantId: data.consultant_id as string, status: data.status as WearableConnectionStatus } : null;
}

/**
 * Note une synchronisation réussie : last_sync_at = maintenant. Une connexion en `error`
 * redevient `active` (l'accès fonctionne de nouveau). Une connexion révoquée n'est pas touchée.
 */
export async function markSynced(consultantId: string, provider: WearableProvider): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('wearable_connections')
    .update({ last_sync_at: now, status: 'active', last_error: null, updated_at: now })
    .eq('consultant_id', consultantId)
    .eq('provider', provider)
    .neq('status', 'revoked');
  if (error) throw new WearableConnectionError('markSynced', error);
}

export type ActiveConnection = { consultantId: string; providerUserId: string; lastSyncAt: string | null };

/** Connexions `active` d'un fournisseur, les moins récemment synchronisées d'abord. */
export async function listActiveConnections(provider: WearableProvider): Promise<ActiveConnection[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('wearable_connections')
    .select('consultant_id, provider_user_id, last_sync_at')
    .eq('provider', provider)
    .eq('status', 'active')
    .order('last_sync_at', { ascending: true, nullsFirst: true });
  if (error) throw new WearableConnectionError('listActiveConnections', error);
  return (data ?? []).map((r) => ({
    consultantId: r.consultant_id as string,
    providerUserId: r.provider_user_id as string,
    lastSyncAt: (r.last_sync_at as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Import de l'historique (POL-14)
// ---------------------------------------------------------------------------
export type BackfillStatus = 'pending' | 'running' | 'done' | 'failed';

export type BackfillJob = {
  connectionId: string;
  consultantId: string;
  providerUserId: string;
  /** Date la plus ancienne déjà importée (YYYY-MM-DD), null si rien. */
  cursor: string | null;
  days: number;
};

/** pending → running (ou reprise d'un running figé). null si déjà pris, terminé ou connexion inactive. */
export async function claimBackfill(connectionId: string): Promise<BackfillJob | null> {
  const { data, error } = await createSupabaseAdminClient().rpc('wearable_claim_backfill', {
    p_connection_id: connectionId,
    p_stale_after: '10 minutes',
  });
  if (error) throw new WearableConnectionError('claimBackfill', error);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) return null;
  return {
    connectionId: row.id as string,
    consultantId: row.consultant_id as string,
    providerUserId: row.provider_user_id as string,
    cursor: (row.backfill_cursor as string | null) ?? null,
    days: row.backfill_days as number,
  };
}

/** Enregistre l'avancement (statut et date la plus ancienne importée). */
export async function saveBackfillProgress(
  connectionId: string,
  progress: { status: BackfillStatus; cursor?: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await createSupabaseAdminClient()
    .from('wearable_connections')
    .update({
      backfill_status: progress.status,
      ...(progress.cursor !== undefined ? { backfill_cursor: progress.cursor } : {}),
      backfill_updated_at: now,
      updated_at: now,
    })
    .eq('id', connectionId);
  if (error) throw new WearableConnectionError('saveBackfillProgress', error);
}

/** Connexions actives dont l'import n'est pas terminé (pending, ou running interrompu). */
export async function listBackfillsToResume(provider: WearableProvider): Promise<string[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from('wearable_connections')
    .select('id')
    .eq('provider', provider)
    .eq('status', 'active')
    .in('backfill_status', ['pending', 'running'])
    .order('connected_at', { ascending: true });
  if (error) throw new WearableConnectionError('listBackfillsToResume', error);
  return (data ?? []).map((r) => r.id as string);
}
