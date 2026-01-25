// lib/billing/api.ts
// Fonctions API pour la facturation AFEIA

import { supabase } from '@/lib/supabase';
import type {
  Subscription,
  Invoice,
  BillingHistoryEvent,
  SubscriptionPlan,
  PaymentMethod,
  BillingData,
  BillingCycle,
  CheckoutSessionResponse,
} from './types';

/**
 * Récupère toutes les données de facturation d'un praticien
 */
export async function getBillingData(): Promise<BillingData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // Récupérer l'abonnement actif avec le plan
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('practitioner_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (subError) throw subError;

  // Récupérer les factures
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('practitioner_id', user.id)
    .order('invoice_date', { ascending: false })
    .limit(12);

  if (invError) throw invError;

  // Récupérer l'historique
  const { data: history, error: histError } = await supabase
    .from('billing_history')
    .select('*')
    .eq('practitioner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (histError) throw histError;

  // Récupérer les moyens de paiement
  const { data: paymentMethods, error: pmError } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('practitioner_id', user.id)
    .order('is_default', { ascending: false });

  if (pmError) throw pmError;

  return {
    subscription: subscription as Subscription | null,
    invoices: (invoices || []) as Invoice[],
    history: (history || []) as BillingHistoryEvent[],
    paymentMethods: (paymentMethods || []) as PaymentMethod[],
  };
}

/**
 * Récupère l'abonnement actif du praticien
 */
export async function getCurrentSubscription(): Promise<Subscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('practitioner_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data as Subscription | null;
}

/**
 * Récupère tous les plans d'abonnement actifs
 */
export async function getAvailablePlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly');

  if (error) throw error;
  return data as SubscriptionPlan[];
}

/**
 * Récupère les factures du praticien
 */
export async function getInvoices(limit: number = 12): Promise<Invoice[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('practitioner_id', user.id)
    .order('invoice_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Invoice[];
}

/**
 * Récupère les moyens de paiement du praticien
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('practitioner_id', user.id)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return (data || []) as PaymentMethod[];
}

/**
 * Crée une session de paiement Stripe Checkout
 */
export async function createCheckoutSession(
  planId: string,
  billingCycle: BillingCycle
): Promise<CheckoutSessionResponse> {
  const response = await fetch('/api/billing/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, billingCycle }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la création de la session de paiement');
  }

  return response.json();
}

/**
 * Annule un abonnement
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const response = await fetch('/api/billing/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erreur lors de l'annulation de l'abonnement");
  }
}

/**
 * Télécharge une facture en PDF
 */
export async function downloadInvoice(invoiceId: string): Promise<void> {
  const response = await fetch(`/api/billing/invoices/${invoiceId}/download`);

  if (!response.ok) {
    throw new Error('Erreur lors du téléchargement de la facture');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facture-${invoiceId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Ouvre le portail client Stripe pour gérer l'abonnement
 */
export async function openCustomerPortal(): Promise<void> {
  const response = await fetch('/api/billing/manage-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de l\'ouverture du portail de gestion');
  }

  const { url } = await response.json();
  window.location.href = url;
}
