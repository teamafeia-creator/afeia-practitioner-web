// Pennylane — API v2 « Company » (https://pennylane.readme.io).
// Clé : Paramètres › Connectivité › Développeurs › Générer un jeton API.
// Droits requis : customers:all, customer_invoices:all.
// Pas d'idempotence côté Pennylane : l'anti-doublon est géré par Afeia (appointments.external_invoice_id).

import { errorDetail, errorFromStatus, type BillingConnector, type VatMode } from './types';

export const PENNYLANE_BASE = 'https://app.pennylane.com/api/external/v2';

const VAT: Record<VatMode, string> = { franchise: 'exempt', tva_20: 'FR_200' };

async function call<T>(apiKey: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${PENNYLANE_BASE}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw errorFromStatus(res.status, await errorDetail(res));
  return (await res.json()) as T;
}

/** Prix TTC (franchise) ou HT (TVA 20 %) au format attendu par Pennylane : chaîne « 70.00 ». */
export function pennylaneUnitPrice(amountCents: number, vatMode: VatMode): string {
  // Le tarif Afeia est le prix payé par le consultant : en TVA 20 %, on en déduit le HT.
  const ht = vatMode === 'tva_20' ? Math.round(amountCents / 1.2) : amountCents;
  return (ht / 100).toFixed(2);
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const pennylane: BillingConnector = {
  async verify(apiKey) {
    const me = await call<{ company?: { name?: string } }>(apiKey, '/me');
    return { accountLabel: me.company?.name ?? null };
  },

  async createCustomer(apiKey, c) {
    const created = await call<{ id: number }>(apiKey, '/individual_customers', {
      method: 'POST',
      body: {
        first_name: c.firstName || '—',
        last_name: c.lastName || '—',
        emails: c.email ? [c.email] : [],
        // billing_address est obligatoire chez Pennylane, même pour un particulier.
        billing_address: {
          address: c.address || '',
          postal_code: c.postalCode || '',
          city: c.city || '',
          country_alpha2: 'FR',
        },
      },
    });
    return String(created.id);
  },

  async createDraftInvoice(apiKey, { customerId, session, vatMode }) {
    const inv = await call<{ id: number; public_file_url?: string | null }>(apiKey, '/customer_invoices', {
      method: 'POST',
      body: {
        customer_id: Number(customerId),
        date: session.date,
        deadline: addDays(session.date, 30),
        draft: true,
        external_reference: `afeia-${session.appointmentId}`,
        invoice_lines: [
          {
            label: session.label,
            quantity: 1,
            unit: 'séance',
            raw_currency_unit_price: pennylaneUnitPrice(session.amountCents, vatMode),
            vat_rate: VAT[vatMode],
          },
        ],
      },
    });
    return { externalId: String(inv.id), url: 'https://app.pennylane.com/' };
  },
};
