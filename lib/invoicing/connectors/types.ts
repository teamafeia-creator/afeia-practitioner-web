// Connecteurs vers les outils de facturation externes.
// Seuls Pennylane et Abby exposent une API publique ; Indy, Tiime et Freebe restent en suivi manuel.

export type ConnectorProvider = 'pennylane' | 'abby';
export type VatMode = 'franchise' | 'tva_20';

export const CONNECTOR_PROVIDERS: ConnectorProvider[] = ['pennylane', 'abby'];

export function isConnectorProvider(v: unknown): v is ConnectorProvider {
  return v === 'pennylane' || v === 'abby';
}

/** Consultant facturé, tel que connu d'Afeia. */
export type DraftCustomer = {
  firstName: string;
  lastName: string;
  email: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
};

/** Séance terminée à transformer en brouillon de facture. */
export type DraftSession = {
  appointmentId: string;
  label: string;
  /** Montant en centimes, tel que le tarif du type de consultation. */
  amountCents: number;
  /** AAAA-MM-JJ */
  date: string;
};

export type DraftResult = { externalId: string; url: string | null };

export interface BillingConnector {
  /** Vérifie la clé et renvoie le nom du compte côté outil. */
  verify(apiKey: string): Promise<{ accountLabel: string | null }>;
  /** Crée le client dans l'outil et renvoie son id. */
  createCustomer(apiKey: string, customer: DraftCustomer): Promise<string>;
  /** Crée un brouillon de facture pour un client existant. */
  createDraftInvoice(apiKey: string, input: { customerId: string; session: DraftSession; vatMode: VatMode }): Promise<DraftResult>;
}

/** Erreur côté outil. `code` sert à choisir le message affiché au praticien. */
export class ConnectorError extends Error {
  constructor(
    public readonly code: 'invalid_key' | 'forbidden' | 'rate_limited' | 'not_found' | 'validation' | 'unavailable',
    public readonly status: number | null,
    detail?: string
  ) {
    super(`${code}${status ? ` (${status})` : ''}${detail ? ` : ${detail}` : ''}`);
    this.name = 'ConnectorError';
  }
}

export function errorFromStatus(status: number, detail?: string): ConnectorError {
  if (status === 401) return new ConnectorError('invalid_key', status, detail);
  if (status === 403) return new ConnectorError('forbidden', status, detail);
  if (status === 404) return new ConnectorError('not_found', status, detail);
  if (status === 429) return new ConnectorError('rate_limited', status, detail);
  if (status === 400 || status === 422) return new ConnectorError('validation', status, detail);
  return new ConnectorError('unavailable', status, detail);
}

/** Lit le corps d'erreur sans jamais y inclure la clé, tronqué pour les logs. */
export async function errorDetail(res: Response): Promise<string | undefined> {
  try {
    const t = await res.text();
    return t ? t.slice(0, 300) : undefined;
  } catch {
    return undefined;
  }
}

export const PRACTITIONER_MESSAGES: Record<ConnectorError['code'], string> = {
  invalid_key: 'La clé API est refusée par l’outil. Vérifiez-la ou générez-en une nouvelle.',
  forbidden: 'La clé API n’a pas les droits nécessaires (clients et factures en écriture).',
  rate_limited: 'L’outil limite le nombre de demandes. Réessayez dans une minute.',
  not_found: 'Le client ou la facture est introuvable dans l’outil.',
  validation: 'L’outil a refusé la facture : vérifiez la fiche du consultant (nom, adresse).',
  unavailable: 'L’outil ne répond pas pour le moment. Réessayez plus tard.',
};
