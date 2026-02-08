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
  };
  return labels[status];
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
