// lib/wearables/ingest.ts
// Ingestion des ressources d'objets connectés : tout ce que le fournisseur renvoie est gardé
// tel quel dans wearable_raw (une ligne par enregistrement, nouvelle version = upsert),
// puis normalisé (POL-11). On peut ainsi recalculer les tables normalisées à tout moment.
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { normalize } from './normalize';

export type WearableDataType = 'sleep' | 'nightly_recharge' | 'continuous_hr' | 'daily_activity';

/** Type d'événement Polar → type de donnée. null = hors périmètre MVP (événement ignoré). */
export function dataTypeForEvent(eventType: string): WearableDataType | null {
  switch (eventType) {
    case 'SLEEP':
      return 'sleep';
    case 'NIGHTLY_RECHARGE':
      return 'nightly_recharge';
    case 'CONTINUOUS_HEART_RATE':
      return 'continuous_hr';
    case 'ACTIVITY_SUMMARY':
      return 'daily_activity';
    default:
      return null;
  }
}

export type IngestOptions = {
  /** Identifiant utilisateur Polar (x_user_id). Nécessaire pour l'activité, qui ne le contient pas. */
  providerUserId?: string | null;
  /** Date demandée (YYYY-MM-DD), utilisée si la ressource ne la porte pas. */
  date?: string | null;
  /** Événement webhook d'origine ; null pour le rattrapage du cron. */
  sourceEventId?: string | null;
  /** Injectable pour les tests. */
  now?: Date;
};

export type RawRecord = { providerRecordId: string; dataDate: string; payload: Record<string, unknown> };

export class IngestError extends Error {
  constructor(message: string) {
    super(`ingestPolarResource : ${message}`);
    this.name = 'IngestError';
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const asDate = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const d = v.slice(0, 10);
  return ISO_DATE.test(d) ? d : null;
};

/** « https://www.polaraccesslink.com/v3/users/627139 » → « 627139 ». */
export function polarUserIdFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const m = url.match(/\/v3\/users\/(\d+)(?:[/?#]|$)/);
  return m ? m[1] : null;
}

/** Une réponse unitaire, une liste (`nights`, `recharges`) ou un tableau → enregistrements. */
function items(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    for (const key of ['nights', 'recharges']) if (Array.isArray(o[key])) return items(o[key]);
    return [o];
  }
  return [];
}

/**
 * Règles par type (déduites des réponses AccessLink, voir __fixtures__) :
 *  - sleep, nightly_recharge, continuous_hr : un enregistrement par utilisateur et par jour.
 *    date = `date` de la ressource ; utilisateur = fin de l'URL `polar_user`.
 *  - daily_activity : la ressource ne porte ni utilisateur ni champ `date`. date = jour de
 *    `start_time` (heure de l'appareil). Plusieurs enregistrements peuvent exister pour un
 *    même jour (résumés partiels) : on garde le plus récent (plus grand `end_time`).
 *  provider_record_id = `<polar_user_id>:<YYYY-MM-DD>`.
 */
export function extractPolarRecords(type: WearableDataType, json: unknown, options: IngestOptions = {}): RawRecord[] {
  const byRecordId = new Map<string, RawRecord>();

  for (const item of items(json)) {
    const userId = polarUserIdFromUrl(item.polar_user) ?? options.providerUserId ?? null;
    const dataDate =
      type === 'daily_activity'
        ? asDate(item.start_time) ?? asDate((item.samples as Record<string, unknown> | undefined)?.date) ?? asDate(options.date)
        : asDate(item.date) ?? asDate(options.date);

    if (!userId) throw new IngestError(`identifiant utilisateur introuvable (${type})`);
    if (!dataDate) throw new IngestError(`date introuvable (${type})`);

    const record: RawRecord = { providerRecordId: `${userId}:${dataDate}`, dataDate, payload: item };
    const existing = byRecordId.get(record.providerRecordId);
    if (
      !existing ||
      (type === 'daily_activity' && String(item.end_time ?? '') >= String(existing.payload.end_time ?? ''))
    ) {
      byRecordId.set(record.providerRecordId, record);
    }
  }
  return [...byRecordId.values()];
}

/**
 * Écrit les enregistrements dans wearable_raw (upsert sur provider, data_type,
 * provider_record_id : une nouvelle version remplace l'ancienne et met à jour fetched_at),
 * puis appelle le mapper normalisé. Renvoie le nombre d'enregistrements ingérés.
 */
export async function ingestPolarResource(
  type: WearableDataType,
  json: unknown,
  consultantId: string,
  options: IngestOptions = {}
): Promise<number> {
  const records = extractPolarRecords(type, json, options);
  if (!records.length) return 0;

  const fetchedAt = (options.now ?? new Date()).toISOString();
  const { error } = await createSupabaseAdminClient()
    .from('wearable_raw')
    .upsert(
      records.map((r) => ({
        consultant_id: consultantId,
        provider: 'polar',
        data_type: type,
        provider_record_id: r.providerRecordId,
        data_date: r.dataDate,
        payload: r.payload,
        source_event_id: options.sourceEventId ?? null,
        fetched_at: fetchedAt,
        updated_at: fetchedAt,
      })),
      { onConflict: 'provider,data_type,provider_record_id' }
    );
  if (error) throw new IngestError(`écriture wearable_raw impossible (${error.code ?? 'inconnu'})`);

  for (const r of records) {
    await normalize(type, r.payload, consultantId, { dataDate: r.dataDate, providerRecordId: r.providerRecordId });
  }
  return records.length;
}
