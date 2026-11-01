// lib/wearables/normalized.ts
// Écriture des tables normalisées à partir d'un enregistrement brut. Module pur : le client
// Supabase (service_role) est passé en paramètre, pour être partagé entre normalize()
// (app) et scripts/wearables-rebuild.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WearableDataType, WearableProviderName } from './ingest-types';
import { POLAR_ADAPTER } from './polar/mappers';
import { resolveTimezone } from './time';

export type NormalizeInput = {
  type: WearableDataType;
  provider: WearableProviderName;
  payload: unknown;
  consultantId: string;
  sourceRawId: string;
  /** consultants.timezone ; Europe/Paris si absent ou invalide. */
  timezone?: string | null;
  /** Date de l'enregistrement brut (data_date), repli quand la réponse n'en porte pas. */
  requestedDate?: string | null;
};

export type NormalizeResult = { table: string; rows: number; warnings: string[] };

const ADAPTERS = { polar: POLAR_ADAPTER } as const;

export async function writeNormalized(client: SupabaseClient, input: NormalizeInput): Promise<NormalizeResult> {
  const adapter = ADAPTERS[input.provider][input.type];
  const { rows, warnings } = adapter.map(input.payload, {
    timezone: resolveTimezone(input.timezone),
    requestedDate: input.requestedDate ?? null,
  });
  if (!rows.length) return { table: adapter.table, rows: 0, warnings };

  const { error } = await client.from(adapter.table).upsert(
    rows.map((row) => ({
      ...row,
      consultant_id: input.consultantId,
      provider: input.provider,
      source_raw_id: input.sourceRawId,
    })),
    { onConflict: adapter.conflict }
  );
  if (error) throw new Error(`écriture ${adapter.table} impossible (${error.code ?? 'inconnu'}) : ${error.message}`);
  return { table: adapter.table, rows: rows.length, warnings };
}
