// lib/wearables/polar/ingest.ts
// Point d'entrée de l'ingestion des ressources Polar dans wearable_raw (table créée en POL-08,
// structure POL-10 : data_type, provider_record_id, data_date, payload).
import 'server-only';

export type PolarDataType = 'sleep' | 'nightly_recharge' | 'continuous_heart_rate' | 'activity';

/** Type d'événement Polar → type de donnée stocké. null = hors périmètre MVP (événement ignoré). */
export function dataTypeForEvent(eventType: string): PolarDataType | null {
  switch (eventType) {
    case 'SLEEP':
      return 'sleep';
    case 'NIGHTLY_RECHARGE':
      return 'nightly_recharge';
    case 'CONTINUOUS_HEART_RATE':
      return 'continuous_heart_rate';
    case 'ACTIVITY_SUMMARY':
      return 'activity';
    default:
      return null;
  }
}

export type IngestContext = {
  consultantId: string;
  providerUserId: string;
  /** Date de la ressource (YYYY-MM-DD) quand le webhook la fournit. */
  date: string | null;
  sourceEventId: string;
};

export class IngestionNotImplementedError extends Error {
  constructor() {
    super('ingestPolarResource non implémentée (POL-10)');
    this.name = 'IngestionNotImplementedError';
  }
}

/**
 * TODO(POL-10) : upsert dans wearable_raw sur (provider, data_type, provider_record_id),
 * avec provider_record_id = `${providerUserId}:${date}` pour les données journalières,
 * data_date, payload et source_event_id. Doit être idempotente.
 *
 * Tant que POL-10 n'est pas livré, la fonction échoue : l'événement passe en `failed`
 * (attempts + 1) et sera rejoué par le cron de rattrapage (POL-09) une fois l'ingestion en place.
 */
export async function ingestPolarResource(
  _dataType: PolarDataType,
  _json: unknown,
  _context: IngestContext
): Promise<void> {
  throw new IngestionNotImplementedError();
}
