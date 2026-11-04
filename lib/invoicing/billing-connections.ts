import 'server-only';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { CONNECTORS, ConnectorError, type ConnectorProvider, type DraftCustomer, type VatMode } from './connectors';

/**
 * Connexions aux outils de facturation (table billing_connections, migration 20261113).
 * La clé API est chiffrée dans Supabase Vault ; ce module utilise le client admin et ne
 * doit jamais être importé côté client. Règle : aucune clé dans les logs ni les erreurs.
 */

export type ConnectionView = {
  provider: ConnectorProvider;
  status: 'active' | 'error' | 'revoked';
  accountLabel: string | null;
  vatMode: VatMode;
  lastError: string | null;
  connectedAt: string;
};

export async function listConnections(practitionerId: string): Promise<ConnectionView[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('billing_connections')
    .select('provider, status, account_label, vat_mode, last_error, connected_at')
    .eq('practitioner_id', practitionerId)
    .neq('status', 'revoked');
  if (error) throw new Error(`billing_connections.list : ${error.message}`);
  return (data ?? []).map((r) => ({
    provider: r.provider as ConnectorProvider,
    status: r.status as ConnectionView['status'],
    accountLabel: r.account_label,
    vatMode: r.vat_mode as VatMode,
    lastError: r.last_error,
    connectedAt: r.connected_at,
  }));
}

/** Vérifie la clé auprès de l'outil puis l'enregistre (chiffrée). */
export async function connect(practitionerId: string, provider: ConnectorProvider, apiKey: string, vatMode: VatMode) {
  const { accountLabel } = await CONNECTORS[provider].verify(apiKey);
  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('billing_save_connection', {
    p_practitioner_id: practitionerId,
    p_provider: provider,
    p_api_key: apiKey,
    p_account_label: accountLabel,
    p_vat_mode: vatMode,
  });
  if (error) throw new Error(`billing_save_connection : ${error.message}`);
  // Une clé d'une autre connexion devient inutile : on garde une seule intégration active à la fois.
  const others = (['pennylane', 'abby'] as ConnectorProvider[]).filter((p) => p !== provider);
  for (const p of others) await db.rpc('billing_revoke_connection', { p_practitioner_id: practitionerId, p_provider: p });
  return { accountLabel };
}

export async function disconnect(practitionerId: string, provider: ConnectorProvider) {
  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('billing_revoke_connection', { p_practitioner_id: practitionerId, p_provider: provider });
  if (error) throw new Error(`billing_revoke_connection : ${error.message}`);
  await db.from('billing_external_customers').delete().eq('practitioner_id', practitionerId).eq('provider', provider);
}

export type PushResult =
  | { status: 'created'; externalId: string; url: string | null }
  | { status: 'already'; externalId: string }
  | { status: 'not_connected' }
  | { status: 'not_found' }
  | { status: 'no_price' };

function splitName(raw: { name: string | null; first_name: string | null; last_name: string | null }) {
  if (raw.first_name || raw.last_name) return { firstName: raw.first_name ?? '', lastName: raw.last_name ?? '' };
  const parts = (raw.name ?? '').trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

/** Crée dans l'outil connecté le brouillon de facture d'une séance terminée. */
export async function pushSession(practitionerId: string, provider: ConnectorProvider, appointmentId: string): Promise<PushResult> {
  const db = createSupabaseAdminClient();

  const { data: key, error: keyErr } = await db.rpc('billing_get_api_key', { p_practitioner_id: practitionerId, p_provider: provider });
  if (keyErr) throw new Error(`billing_get_api_key : ${keyErr.message}`);
  if (!key) return { status: 'not_connected' };
  const apiKey = key as string;

  const { data: conn } = await db
    .from('billing_connections')
    .select('vat_mode')
    .eq('practitioner_id', practitionerId)
    .eq('provider', provider)
    .maybeSingle();
  const vatMode = (conn?.vat_mode as VatMode) ?? 'franchise';

  const { data: apt } = await db
    .from('appointments')
    .select('id, consultant_id, starts_at, status, external_invoice_id, consultation_type:consultation_types(name, price_cents)')
    .eq('id', appointmentId)
    .eq('practitioner_id', practitionerId)
    .maybeSingle();
  if (!apt || !apt.consultant_id || apt.status !== 'completed') return { status: 'not_found' };
  if (apt.external_invoice_id) return { status: 'already', externalId: apt.external_invoice_id };

  const ct = apt.consultation_type as unknown as { name: string | null; price_cents: number | null } | null;
  if (ct?.price_cents == null || ct.price_cents <= 0) return { status: 'no_price' };

  // Verrou atomique : Pennylane et Abby n'ont pas d'idempotence, un double clic créerait deux brouillons.
  const { data: claimed } = await db
    .from('appointments')
    .update({ external_invoice_provider: provider })
    .eq('id', apt.id)
    .is('external_invoice_provider', null)
    .is('external_invoice_id', null)
    .select('id');
  if (!claimed?.length) return { status: 'already', externalId: '' };
  const release = () => db.from('appointments').update({ external_invoice_provider: null }).eq('id', apt.id).is('external_invoice_id', null);

  let customerId: string;
  try {
    customerId = await ensureCustomer(db, practitionerId, provider, apiKey, apt.consultant_id);
  } catch (e) {
    await release();
    throw e;
  }

  try {
    const result = await CONNECTORS[provider].createDraftInvoice(apiKey, {
      customerId,
      vatMode,
      session: {
        appointmentId: apt.id,
        label: ct.name || 'Séance',
        amountCents: ct.price_cents,
        date: new Date(apt.starts_at).toISOString().slice(0, 10),
      },
    });
    const now = new Date().toISOString();
    await db
      .from('appointments')
      .update({ external_invoice_provider: provider, external_invoice_id: result.externalId, invoiced_externally_at: now })
      .eq('id', apt.id);
    await db.from('billing_connections').update({ last_used_at: now, status: 'active', last_error: null }).eq('practitioner_id', practitionerId).eq('provider', provider);
    return { status: 'created', ...result };
  } catch (e) {
    await release();
    await recordError(db, practitionerId, provider, e);
    throw e;
  }
}

type Admin = ReturnType<typeof createSupabaseAdminClient>;

async function ensureCustomer(db: Admin, practitionerId: string, provider: ConnectorProvider, apiKey: string, consultantId: string) {
  const { data: link } = await db
    .from('billing_external_customers')
    .select('external_id')
    .eq('practitioner_id', practitionerId)
    .eq('consultant_id', consultantId)
    .eq('provider', provider)
    .maybeSingle();
  if (link?.external_id) return link.external_id as string;

  const full = await db
    .from('consultants')
    .select('name, first_name, last_name, email, address_line1, postal_code, city')
    .eq('id', consultantId)
    .maybeSingle();
  // Colonnes d'adresse absentes sur certaines bases : on relit l'essentiel.
  const row = full.error
    ? (await db.from('consultants').select('name, first_name, last_name, email').eq('id', consultantId).maybeSingle()).data
    : full.data;
  if (!row) throw new ConnectorError('not_found', null, 'consultant');
  const r = row as { name: string | null; first_name: string | null; last_name: string | null; email: string | null; address_line1?: string | null; postal_code?: string | null; city?: string | null };

  const customer: DraftCustomer = {
    ...splitName(r),
    email: r.email,
    address: r.address_line1 ?? null,
    postalCode: r.postal_code ?? null,
    city: r.city ?? null,
  };
  try {
    const externalId = await CONNECTORS[provider].createCustomer(apiKey, customer);
    await db.from('billing_external_customers').upsert({ practitioner_id: practitionerId, consultant_id: consultantId, provider, external_id: externalId });
    return externalId;
  } catch (e) {
    await recordError(db, practitionerId, provider, e);
    throw e;
  }
}

async function recordError(db: Admin, practitionerId: string, provider: ConnectorProvider, e: unknown) {
  if (!(e instanceof ConnectorError)) return;
  // Clé refusée : la connexion passe en erreur pour que l'interface propose de la remplacer.
  const patch = e.code === 'invalid_key' || e.code === 'forbidden' ? { status: 'error', last_error: e.code } : { last_error: e.code };
  await db.from('billing_connections').update(patch).eq('practitioner_id', practitionerId).eq('provider', provider);
}
