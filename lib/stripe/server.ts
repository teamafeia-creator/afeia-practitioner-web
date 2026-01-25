// lib/stripe/server.ts
// Utilitaires Stripe côté serveur

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Crée un client Stripe pour un praticien
 */
export async function createStripeCustomer(
  email: string,
  name: string,
  userId: string
): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      supabase_user_id: userId,
    },
  });
}

/**
 * Récupère ou crée un client Stripe
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name: string,
  userId: string
): Promise<Stripe.Customer> {
  // Chercher si le client existe déjà
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Créer un nouveau client
  return createStripeCustomer(email, name, userId);
}

/**
 * Crée une session Stripe Checkout pour un abonnement
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
}): Promise<Stripe.Checkout.Session> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    subscription_data: {
      metadata: params.metadata,
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  };

  // Ajouter la période d'essai si spécifiée
  if (params.trialPeriodDays) {
    sessionParams.subscription_data!.trial_period_days = params.trialPeriodDays;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Crée une session du portail client Stripe
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Annule un abonnement Stripe
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    // Annuler à la fin de la période de facturation
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    // Annuler immédiatement
    return stripe.subscriptions.cancel(subscriptionId);
  }
}

/**
 * Récupère un abonnement Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Récupère une facture Stripe
 */
export async function getStripeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  return stripe.invoices.retrieve(invoiceId);
}

/**
 * Récupère le PDF d'une facture Stripe
 */
export async function getStripeInvoicePdf(invoiceId: string): Promise<string | null> {
  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoice.invoice_pdf || null;
}

/**
 * Construit un événement webhook Stripe
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Récupère les moyens de paiement d'un client
 */
export async function getCustomerPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  return paymentMethods.data;
}
