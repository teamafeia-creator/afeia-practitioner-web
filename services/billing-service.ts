// services/billing-service.ts
// Service métier pour la facturation AFEIA

import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import type {
  Subscription,
  Invoice,
  BillingHistoryEvent,
  SubscriptionPlan,
  PaymentMethod,
  BillingCycle,
  SubscriptionStatus,
  InvoiceStatus,
  BillingEventType,
} from '@/lib/billing/types';
import { generateInvoiceNumber } from '@/lib/billing/utils';

/**
 * Crée ou met à jour un abonnement pour un praticien
 */
export async function createOrUpdateSubscription(params: {
  practitionerId: string;
  planId: string;
  billingCycle: BillingCycle;
  status?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
}): Promise<Subscription> {
  const supabase = createSupabaseAdminClient();

  // Vérifier s'il existe déjà un abonnement actif
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('practitioner_id', params.practitionerId)
    .eq('status', 'active')
    .maybeSingle();

  const subscriptionData = {
    practitioner_id: params.practitionerId,
    plan_id: params.planId,
    billing_cycle: params.billingCycle,
    status: params.status || 'active',
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    stripe_price_id: params.stripePriceId,
    current_period_start: params.currentPeriodStart.toISOString(),
    current_period_end: params.currentPeriodEnd.toISOString(),
    trial_end: params.trialEnd?.toISOString() || null,
  };

  if (existingSubscription) {
    // Mettre à jour l'abonnement existant
    const { data, error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id)
      .select('*, plan:subscription_plans(*)')
      .single();

    if (error) throw error;
    return data as Subscription;
  } else {
    // Créer un nouvel abonnement
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select('*, plan:subscription_plans(*)')
      .single();

    if (error) throw error;
    return data as Subscription;
  }
}

/**
 * Annule un abonnement (à la fin de la période)
 */
export async function cancelSubscription(
  subscriptionId: string,
  canceledAt: Date = new Date()
): Promise<Subscription> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: canceledAt.toISOString(),
    })
    .eq('id', subscriptionId)
    .select('*, plan:subscription_plans(*)')
    .single();

  if (error) throw error;
  return data as Subscription;
}

/**
 * Met à jour le statut d'un abonnement
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
): Promise<Subscription> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('id', subscriptionId)
    .select('*, plan:subscription_plans(*)')
    .single();

  if (error) throw error;
  return data as Subscription;
}

/**
 * Récupère l'abonnement d'un praticien par son Stripe subscription ID
 */
export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();

  if (error) throw error;
  return data as Subscription | null;
}

/**
 * Crée une facture
 */
export async function createInvoice(params: {
  subscriptionId: string;
  practitionerId: string;
  amountSubtotal: number;
  amountTax?: number;
  amountTotal: number;
  currency?: string;
  status?: InvoiceStatus;
  invoiceDate: Date;
  dueDate?: Date;
  description?: string;
  billingReason?: string;
  stripeInvoiceId?: string;
  stripeInvoicePdf?: string;
  metadata?: Record<string, unknown>;
}): Promise<Invoice> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      subscription_id: params.subscriptionId,
      practitioner_id: params.practitionerId,
      invoice_number: generateInvoiceNumber(),
      amount_subtotal: params.amountSubtotal,
      amount_tax: params.amountTax || 0,
      amount_total: params.amountTotal,
      currency: params.currency || 'EUR',
      status: params.status || 'open',
      invoice_date: params.invoiceDate.toISOString().split('T')[0],
      due_date: params.dueDate?.toISOString().split('T')[0] || null,
      description: params.description || null,
      billing_reason: params.billingReason || null,
      stripe_invoice_id: params.stripeInvoiceId || null,
      stripe_invoice_pdf: params.stripeInvoicePdf || null,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

/**
 * Met à jour le statut d'une facture
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  paidAt?: Date
): Promise<Invoice> {
  const supabase = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = { status };
  if (paidAt) {
    updateData.paid_at = paidAt.toISOString();
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

/**
 * Récupère une facture par son Stripe invoice ID
 */
export async function getInvoiceByStripeId(
  stripeInvoiceId: string
): Promise<Invoice | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle();

  if (error) throw error;
  return data as Invoice | null;
}

/**
 * Crée ou met à jour un moyen de paiement
 */
export async function savePaymentMethod(params: {
  practitionerId: string;
  type: 'card' | 'sepa_debit' | 'paypal';
  isDefault?: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  sepaLast4?: string;
  stripePaymentMethodId?: string;
}): Promise<PaymentMethod> {
  const supabase = createSupabaseAdminClient();

  // Si c'est le moyen de paiement par défaut, désactiver les autres
  if (params.isDefault) {
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('practitioner_id', params.practitionerId);
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .upsert(
      {
        practitioner_id: params.practitionerId,
        type: params.type,
        is_default: params.isDefault || false,
        card_brand: params.cardBrand || null,
        card_last4: params.cardLast4 || null,
        card_exp_month: params.cardExpMonth || null,
        card_exp_year: params.cardExpYear || null,
        sepa_last4: params.sepaLast4 || null,
        stripe_payment_method_id: params.stripePaymentMethodId || null,
      },
      {
        onConflict: 'stripe_payment_method_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethod;
}

/**
 * Ajoute un événement à l'historique de facturation
 */
export async function addBillingHistoryEvent(params: {
  practitionerId: string;
  subscriptionId?: string;
  invoiceId?: string;
  eventType: BillingEventType;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<BillingHistoryEvent> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('billing_history')
    .insert({
      practitioner_id: params.practitionerId,
      subscription_id: params.subscriptionId || null,
      invoice_id: params.invoiceId || null,
      event_type: params.eventType,
      description: params.description || null,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as BillingHistoryEvent;
}

/**
 * Récupère un plan par son nom
 */
export async function getPlanByName(name: 'free' | 'premium'): Promise<SubscriptionPlan | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as SubscriptionPlan | null;
}

/**
 * Récupère un plan par son ID
 */
export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (error) throw error;
  return data as SubscriptionPlan | null;
}

/**
 * Récupère l'abonnement actif d'un praticien
 */
export async function getActiveSubscription(
  practitionerId: string
): Promise<Subscription | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('practitioner_id', practitionerId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data as Subscription | null;
}

/**
 * Initialise un abonnement gratuit pour un nouveau praticien
 */
export async function initializeFreePlan(practitionerId: string): Promise<Subscription> {
  const freePlan = await getPlanByName('free');
  if (!freePlan) {
    throw new Error('Plan gratuit non trouvé');
  }

  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  const subscription = await createOrUpdateSubscription({
    practitionerId,
    planId: freePlan.id,
    billingCycle: 'monthly',
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: oneYearLater,
  });

  await addBillingHistoryEvent({
    practitionerId,
    subscriptionId: subscription.id,
    eventType: 'subscription_created',
    description: 'Inscription au plan gratuit',
  });

  return subscription;
}
