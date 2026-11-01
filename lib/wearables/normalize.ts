// lib/wearables/normalize.ts
// Passage d'un enregistrement brut (wearable_raw) aux tables normalisées (POL-11).
// Idempotent : rappelé à chaque nouvelle version d'un enregistrement.
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import type { WearableDataType } from './ingest-types';
import { writeNormalized, type NormalizeResult } from './normalized';

export type NormalizeContext = {
  /** Date de l'enregistrement brut (YYYY-MM-DD). */
  dataDate: string;
  providerRecordId: string;
  /** Identifiant de la ligne wearable_raw (source_raw_id). */
  rawId: string;
  /** Fuseau du consultant, s'il est déjà connu de l'appelant. */
  timezone?: string | null;
};

async function consultantTimezone(consultantId: string): Promise<string | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from('consultants')
    .select('timezone')
    .eq('id', consultantId)
    .maybeSingle();
  if (error) {
    console.warn('[wearables/normalize] fuseau du consultant illisible, Europe/Paris utilisé', { consultantId, code: error.code });
    return null;
  }
  return (data?.timezone as string | null) ?? null;
}

export async function normalize(
  type: WearableDataType,
  payload: unknown,
  consultantId: string,
  context: NormalizeContext
): Promise<NormalizeResult> {
  const result = await writeNormalized(createSupabaseAdminClient(), {
    type,
    provider: 'polar',
    payload,
    consultantId,
    sourceRawId: context.rawId,
    timezone: context.timezone !== undefined ? context.timezone : await consultantTimezone(consultantId),
    requestedDate: context.dataDate,
  });
  for (const w of result.warnings) console.warn('[wearables/normalize]', w, { consultantId, record: context.providerRecordId });
  return result;
}
