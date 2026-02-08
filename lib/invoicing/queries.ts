import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import type { ConsultationInvoice, InvoiceHistory, InvoiceTemplate, PractitionerBillingSettings } from './types';

export async function getInvoiceById(
  invoiceId: string,
  practitionerId: string
): Promise<ConsultationInvoice | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('consultation_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('practitioner_id', practitionerId)
    .single();

  if (error || !data) return null;
  return data as ConsultationInvoice;
}

export async function listInvoices(
  practitionerId: string,
  filters?: {
    status?: string;
    consultant_id?: string;
    annee_fiscale?: number;
    limit?: number;
    offset?: number;
  }
): Promise<{ invoices: ConsultationInvoice[]; total: number }> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from('consultation_invoices')
    .select('*', { count: 'exact' })
    .eq('practitioner_id', practitionerId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.consultant_id) {
    query = query.eq('consultant_id', filters.consultant_id);
  }
  if (filters?.annee_fiscale) {
    query = query.eq('annee_fiscale', filters.annee_fiscale);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    invoices: (data || []) as ConsultationInvoice[],
    total: count || 0,
  };
}

export async function getInvoiceHistory(
  invoiceId: string
): Promise<InvoiceHistory[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('invoice_history')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as InvoiceHistory[];
}

export async function getBillingSettings(
  practitionerId: string
): Promise<PractitionerBillingSettings | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('practitioner_billing_settings')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .single();

  if (error || !data) return null;
  return data as PractitionerBillingSettings;
}

export async function getInvoiceTemplates(
  practitionerId: string
): Promise<InvoiceTemplate[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('invoice_templates')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .order('ordre', { ascending: true });

  if (error) throw error;
  return (data || []) as InvoiceTemplate[];
}

export async function getInvoiceStats(
  practitionerId: string,
  year: number
) {
  const supabase = createSupabaseAdminClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // CA du mois (factures payees du mois en cours)
  const { data: monthInvoices } = await supabase
    .from('consultation_invoices')
    .select('montant')
    .eq('practitioner_id', practitionerId)
    .eq('status', 'paid')
    .gte('payment_date', startOfMonth)
    .lte('payment_date', endOfMonth);

  const caMois = (monthInvoices || []).reduce(
    (sum, inv) => sum + Number(inv.montant),
    0
  );

  // CA annee (factures payees de l'annee)
  const startOfYear = new Date(year, 0, 1).toISOString();
  const endOfYear = new Date(year, 11, 31, 23, 59, 59).toISOString();

  const { data: yearInvoices } = await supabase
    .from('consultation_invoices')
    .select('montant')
    .eq('practitioner_id', practitionerId)
    .eq('status', 'paid')
    .gte('payment_date', startOfYear)
    .lte('payment_date', endOfYear);

  const caAnnee = (yearInvoices || []).reduce(
    (sum, inv) => sum + Number(inv.montant),
    0
  );

  // Nombre de factures payees de l'annee
  const nbFacturesPayees = (yearInvoices || []).length;

  // Montant en attente
  const { data: pendingInvoices } = await supabase
    .from('consultation_invoices')
    .select('montant')
    .eq('practitioner_id', practitionerId)
    .eq('status', 'issued');

  const montantEnAttente = (pendingInvoices || []).reduce(
    (sum, inv) => sum + Number(inv.montant),
    0
  );

  // Total factures (hors brouillons et annulees)
  const { count: nbFactures } = await supabase
    .from('consultation_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', practitionerId)
    .in('status', ['issued', 'paid'])
    .eq('annee_fiscale', year);

  const ticketMoyen = nbFacturesPayees > 0 ? caAnnee / nbFacturesPayees : 0;

  return {
    ca_mois: caMois,
    ca_annee: caAnnee,
    nb_factures: nbFactures || 0,
    nb_factures_payees: nbFacturesPayees,
    montant_en_attente: montantEnAttente,
    ticket_moyen: ticketMoyen,
  };
}
