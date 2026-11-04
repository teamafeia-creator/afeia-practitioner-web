// Abby — API publique (https://docs.abby.fr, SDK officiel @abby-inc/node v2.9).
// Clé : Paramètres › Intégrations › Créer une clé API. Envoyée en « Authorization: Bearer ».
// Flux : POST /contact → POST /v2/billing/invoice/{contactId} (brouillon vide) → PATCH …/lines.
// Montants en centimes.

import { errorDetail, errorFromStatus, type BillingConnector, type VatMode } from './types';

export const ABBY_BASE = 'https://api.app-abby.com';

// FR_00HT : 0 % (franchise en base) ; FR_2000 : 20 %.
const VAT: Record<VatMode, string> = { franchise: 'FR_00HT', tva_20: 'FR_2000' };

async function call<T>(apiKey: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${ABBY_BASE}${path}`, {
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
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Prix unitaire en centimes, HT si TVA 20 % (le tarif Afeia est le prix payé). */
export function abbyUnitPrice(amountCents: number, vatMode: VatMode): number {
  return vatMode === 'tva_20' ? Math.round(amountCents / 1.2) : amountCents;
}

export const abby: BillingConnector = {
  async verify(apiKey) {
    const me = await call<{ company?: { name?: string; commercialName?: string } }>(apiKey, '/v2/company/me');
    return { accountLabel: me.company?.commercialName || me.company?.name || null };
  },

  async createCustomer(apiKey, c) {
    const created = await call<{ id: string }>(apiKey, '/contact', {
      method: 'POST',
      body: {
        firstname: c.firstName || '—',
        lastname: c.lastName || '—',
        ...(c.email ? { emails: [c.email] } : {}),
        ...(c.address || c.postalCode || c.city
          ? { billingAddress: { address: c.address ?? '', zipCode: c.postalCode ?? '', city: c.city ?? '', country: 'FR' } }
          : {}),
      },
    });
    return created.id;
  },

  async createDraftInvoice(apiKey, { customerId, session, vatMode }) {
    const inv = await call<{ id: string }>(apiKey, `/v2/billing/invoice/${encodeURIComponent(customerId)}`, { method: 'POST' });
    await call(apiKey, `/v2/billing/invoice/${encodeURIComponent(inv.id)}/lines`, {
      method: 'PATCH',
      body: {
        lines: [
          {
            designation: session.label,
            description: `Séance du ${session.date.split('-').reverse().join('/')}`,
            quantity: 1,
            quantityUnit: 'unit',
            unitPrice: abbyUnitPrice(session.amountCents, vatMode),
            type: 'service_delivery',
            vatCode: VAT[vatMode],
          },
        ],
      },
    });
    return { externalId: inv.id, url: 'https://app.abby.fr/' };
  },
};
