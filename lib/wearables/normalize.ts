// lib/wearables/normalize.ts
// Passage des données brutes (wearable_raw) aux tables normalisées.
import 'server-only';
import type { WearableDataType } from './ingest';

export type NormalizeContext = {
  /** Date de l'enregistrement (YYYY-MM-DD). */
  dataDate: string;
  providerRecordId: string;
};

/**
 * TODO(POL-11) : mapper chaque type vers les tables normalisées
 * (sommeil, Nightly Recharge, FC continue, activité quotidienne). Doit être idempotent :
 * il sera rappelé à chaque nouvelle version d'un enregistrement, et pour recalculer
 * les tables à partir de wearable_raw.
 */
export async function normalize(
  _type: WearableDataType,
  _payload: unknown,
  _consultantId: string,
  _context: NormalizeContext
): Promise<void> {
  // Volontairement vide jusqu'à POL-11 : les données brutes sont déjà conservées.
}
