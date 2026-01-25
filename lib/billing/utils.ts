// lib/billing/utils.ts
// Utilitaires pour la facturation AFEIA

import type { BillingCycle, InvoiceStatus, SubscriptionStatus, BillingEventType } from './types';

/**
 * Formate un prix en euros
 */
export function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate une date au format français
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formate une date courte (DD/MM/YYYY)
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formate une date relative (il y a X jours, etc.)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Aujourd'hui";
  } else if (diffDays === 1) {
    return 'Hier';
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  } else {
    return formatShortDate(dateString);
  }
}

/**
 * Retourne le libellé français du cycle de facturation
 */
export function getBillingCycleLabel(cycle: BillingCycle): string {
  const labels: Record<BillingCycle, string> = {
    monthly: 'Mensuel',
    yearly: 'Annuel',
  };
  return labels[cycle];
}

/**
 * Retourne le libellé français du statut d'abonnement
 */
export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    active: 'Actif',
    canceled: 'Annulé',
    past_due: 'Paiement en retard',
    trialing: 'Période d\'essai',
    incomplete: 'Incomplet',
  };
  return labels[status];
}

/**
 * Retourne le libellé français du statut de facture
 */
export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    draft: 'Brouillon',
    open: 'En attente',
    paid: 'Payée',
    void: 'Annulée',
    uncollectible: 'Irrécouvrable',
  };
  return labels[status];
}

/**
 * Retourne la couleur du badge pour le statut de facture
 */
export function getInvoiceStatusVariant(status: InvoiceStatus): 'info' | 'success' | 'attention' | 'premium' {
  const variants: Record<InvoiceStatus, 'info' | 'success' | 'attention' | 'premium'> = {
    draft: 'info',
    open: 'attention',
    paid: 'success',
    void: 'premium',
    uncollectible: 'premium',
  };
  return variants[status];
}

/**
 * Retourne le libellé français du type d'événement de facturation
 */
export function getBillingEventLabel(eventType: BillingEventType): string {
  const labels: Record<BillingEventType, string> = {
    subscription_created: 'Abonnement créé',
    subscription_updated: 'Abonnement mis à jour',
    subscription_canceled: 'Abonnement annulé',
    payment_succeeded: 'Paiement réussi',
    payment_failed: 'Paiement échoué',
    invoice_created: 'Facture créée',
  };
  return labels[eventType];
}

/**
 * Retourne l'icône pour le type d'événement de facturation
 */
export function getBillingEventIcon(eventType: BillingEventType): string {
  const icons: Record<BillingEventType, string> = {
    subscription_created: 'plus-circle',
    subscription_updated: 'refresh-cw',
    subscription_canceled: 'x-circle',
    payment_succeeded: 'check-circle',
    payment_failed: 'alert-circle',
    invoice_created: 'file-text',
  };
  return icons[eventType];
}

/**
 * Calcule les économies pour un abonnement annuel
 */
export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const yearlyFromMonthly = monthlyPrice * 12;
  return yearlyFromMonthly - yearlyPrice;
}

/**
 * Retourne le pourcentage d'économies pour un abonnement annuel
 */
export function calculateYearlySavingsPercent(monthlyPrice: number, yearlyPrice: number): number {
  const yearlyFromMonthly = monthlyPrice * 12;
  if (yearlyFromMonthly === 0) return 0;
  return Math.round(((yearlyFromMonthly - yearlyPrice) / yearlyFromMonthly) * 100);
}

/**
 * Génère un numéro de facture
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

/**
 * Vérifie si un abonnement est actif
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Retourne le nom de la marque de carte formaté
 */
export function formatCardBrand(brand: string | null): string {
  if (!brand) return 'Carte';
  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };
  return brands[brand.toLowerCase()] || brand;
}

/**
 * Formate l'expiration d'une carte
 */
export function formatCardExpiry(month: number | null, year: number | null): string {
  if (!month || !year) return '';
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}
