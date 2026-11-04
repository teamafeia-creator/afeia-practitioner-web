import { afterEach, describe, expect, it, vi } from 'vitest';
import { pennylane, pennylaneUnitPrice } from '@/lib/invoicing/connectors/pennylane';
import { abby, abbyUnitPrice } from '@/lib/invoicing/connectors/abby';
import { ConnectorError } from '@/lib/invoicing/connectors/types';

type Call = { url: string; init: RequestInit };

function mockFetch(responses: { status?: number; body?: unknown }[]) {
  const calls: Call[] = [];
  let i = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const r = responses[i++] ?? { status: 200, body: {} };
      return new Response(r.body === undefined ? '' : JSON.stringify(r.body), { status: r.status ?? 200 });
    })
  );
  return calls;
}

const body = (c: Call) => JSON.parse(String(c.init.body));
const session = { appointmentId: '11111111-1111-1111-1111-111111111111', label: 'Bilan de vitalité', amountCents: 7000, date: '2026-11-03' };
const customer = { firstName: 'Léa', lastName: 'Martin', email: 'lea@example.com', address: '3 rue Victor Hugo', postalCode: '69002', city: 'Lyon' };

afterEach(() => vi.unstubAllGlobals());

describe('prix unitaires', () => {
  it('franchise : le tarif est repris tel quel', () => {
    expect(pennylaneUnitPrice(7000, 'franchise')).toBe('70.00');
    expect(abbyUnitPrice(7000, 'franchise')).toBe(7000);
  });
  it('TVA 20 % : le tarif Afeia est TTC, on envoie le HT', () => {
    expect(pennylaneUnitPrice(7200, 'tva_20')).toBe('60.00');
    expect(abbyUnitPrice(7200, 'tva_20')).toBe(6000);
  });
});

describe('Pennylane', () => {
  it('vérifie la clé via /me avec un jeton Bearer', async () => {
    const calls = mockFetch([{ body: { company: { name: 'Cabinet Léa' } } }]);
    await expect(pennylane.verify('pk_test_123456')).resolves.toEqual({ accountLabel: 'Cabinet Léa' });
    expect(calls[0].url).toBe('https://app.pennylane.com/api/external/v2/me');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer pk_test_123456');
  });

  it('crée un client particulier avec adresse de facturation', async () => {
    const calls = mockFetch([{ status: 201, body: { id: 42 } }]);
    await expect(pennylane.createCustomer('k'.repeat(12), customer)).resolves.toBe('42');
    expect(calls[0].url).toMatch(/\/individual_customers$/);
    expect(body(calls[0])).toMatchObject({ first_name: 'Léa', last_name: 'Martin', emails: ['lea@example.com'], billing_address: { city: 'Lyon', country_alpha2: 'FR' } });
  });

  it('crée un brouillon (draft: true), exonéré en franchise, avec référence anti-doublon', async () => {
    const calls = mockFetch([{ status: 201, body: { id: 9876 } }]);
    const r = await pennylane.createDraftInvoice('k'.repeat(12), { customerId: '42', session, vatMode: 'franchise' });
    expect(r.externalId).toBe('9876');
    const b = body(calls[0]);
    expect(b).toMatchObject({ customer_id: 42, draft: true, date: '2026-11-03', deadline: '2026-12-03', external_reference: `afeia-${session.appointmentId}` });
    expect(b.invoice_lines[0]).toMatchObject({ label: 'Bilan de vitalité', quantity: 1, raw_currency_unit_price: '70.00', vat_rate: 'exempt' });
  });

  it('traduit un 401 en clé invalide', async () => {
    mockFetch([{ status: 401, body: { error: 'unauthorized' } }]);
    await expect(pennylane.verify('bad_key_123')).rejects.toMatchObject({ code: 'invalid_key' });
  });
});

describe('Abby', () => {
  it('vérifie la clé via /v2/company/me', async () => {
    const calls = mockFetch([{ body: { company: { commercialName: 'Léa Martin Naturo' } } }]);
    await expect(abby.verify('abby_key_123')).resolves.toEqual({ accountLabel: 'Léa Martin Naturo' });
    expect(calls[0].url).toBe('https://api.app-abby.com/v2/company/me');
  });

  it('crée le contact puis le brouillon et sa ligne (montant en centimes)', async () => {
    const calls = mockFetch([{ status: 201, body: { id: 'c_1' } }, { status: 201, body: { id: 'inv_1' } }, { status: 200, body: {} }]);
    await expect(abby.createCustomer('abby_key_123', customer)).resolves.toBe('c_1');
    expect(body(calls[0])).toMatchObject({ firstname: 'Léa', lastname: 'Martin', emails: ['lea@example.com'], billingAddress: { zipCode: '69002', country: 'FR' } });

    const r = await abby.createDraftInvoice('abby_key_123', { customerId: 'c_1', session, vatMode: 'tva_20' });
    expect(r.externalId).toBe('inv_1');
    expect(calls[1].url).toBe('https://api.app-abby.com/v2/billing/invoice/c_1');
    expect(calls[1].init.method).toBe('POST');
    expect(calls[2].url).toBe('https://api.app-abby.com/v2/billing/invoice/inv_1/lines');
    expect(calls[2].init.method).toBe('PATCH');
    expect(body(calls[2]).lines[0]).toMatchObject({ designation: 'Bilan de vitalité', quantity: 1, unitPrice: 5833, vatCode: 'FR_2000', type: 'service_delivery' });
  });

  it('traduit un 429 en limite de débit', async () => {
    mockFetch([{ status: 429 }]);
    const err = await abby.verify('abby_key_123').catch((e) => e);
    expect(err).toBeInstanceOf(ConnectorError);
    expect(err.code).toBe('rate_limited');
  });
});
