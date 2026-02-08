import type { ConsultationInvoice, InvoiceStatus, PaymentMethod } from './types';

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formate une date ISO en format francais long
 */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));
}

/**
 * Formate une date ISO en format court (JJ/MM/AAAA)
 */
export function formatDateShort(isoDate: string | null): string {
  if (!isoDate) return '-';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(isoDate));
}

/**
 * Obtient l'annee fiscale courante
 */
export function getCurrentFiscalYear(): number {
  return new Date().getFullYear();
}

/**
 * Genere un slug unique pour un template a partir de son label
 */
export function generateTemplateId(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Libelle humain pour un statut de facture
 */
export function getStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    draft: 'Brouillon',
    issued: 'En attente',
    paid: 'Payee',
    cancelled: 'Annulee',
    refunded: 'Remboursee',
  };
  return labels[status];
}

/**
 * Libelle humain pour un motif de remboursement
 */
export function getMotifRemboursementLabel(motif: string): string {
  const labels: Record<string, string> = {
    consultation_annulee: 'Consultation annulee',
    erreur_facturation: 'Erreur de facturation',
    geste_commercial: 'Geste commercial',
    autre: 'Autre',
  };
  return labels[motif] || motif;
}

/**
 * Genere le contenu CSV a partir d'un tableau de factures
 */
export function generateInvoicesCSV(invoices: ConsultationInvoice[]): string {
  const headers = [
    'numero',
    'date_emission',
    'consultant_nom',
    'consultant_prenom',
    'description',
    'montant_ht',
    'tva',
    'montant_ttc',
    'status',
    'payment_method',
    'payment_date',
    'is_avoir',
  ];

  const rows = invoices.map((inv) => [
    inv.numero || '',
    inv.date_emission
      ? new Date(inv.date_emission).toISOString().split('T')[0]
      : '',
    inv.consultant_snapshot.nom,
    inv.consultant_snapshot.prenom,
    inv.description,
    String(inv.montant),
    String(inv.taux_tva || 0),
    String(inv.montant_ttc || inv.montant),
    inv.status,
    inv.payment_method || '',
    inv.payment_date
      ? new Date(inv.payment_date).toISOString().split('T')[0]
      : '',
    inv.is_avoir ? 'true' : 'false',
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Libelle humain pour un moyen de paiement
 */
export function getPaymentMethodLabel(method: PaymentMethod | null): string {
  if (!method) return '-';
  const labels: Record<PaymentMethod, string> = {
    especes: 'Especes',
    cheque: 'Cheque',
    cb: 'Carte bancaire',
    virement: 'Virement',
    stripe: 'Paiement en ligne',
  };
  return labels[method];
}

/**
 * Calcule les stats d'un ensemble de factures
 */
export function calculateInvoiceStats(invoices: ConsultationInvoice[]) {
  const total = invoices.reduce((sum, inv) => sum + Number(inv.montant), 0);
  const paid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.montant), 0);
  const unpaid = invoices
    .filter((inv) => inv.status === 'issued')
    .reduce((sum, inv) => sum + Number(inv.montant), 0);
  const paidCount = invoices.filter((inv) => inv.status === 'paid').length;

  return {
    total,
    paid,
    unpaid,
    count: invoices.length,
    paidCount,
    unpaidCount: invoices.filter((inv) => inv.status === 'issued').length,
    avgAmount: paidCount > 0 ? paid / paidCount : 0,
  };
}
