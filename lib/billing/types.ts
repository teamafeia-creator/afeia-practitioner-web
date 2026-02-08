// lib/billing/types.ts
// Types TypeScript pour le système de facturation AFEIA

export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
export type PaymentMethodType = 'card' | 'sepa_debit' | 'paypal';
export type BillingEventType =
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_created';

export interface SubscriptionPlan {
  id: string;
  name: 'free' | 'premium';
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_consultants: number | null;
  bague_connectee_integration: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  practitioner_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  plan?: SubscriptionPlan;
}

export interface Invoice {
  id: string;
  subscription_id: string;
  practitioner_id: string;
  invoice_number: string;
  amount_subtotal: number;
  amount_tax: number;
  amount_total: number;
  currency: string;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  billing_reason: string | null;
  stripe_invoice_id: string | null;
  stripe_invoice_pdf: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  practitioner_id: string;
  type: PaymentMethodType;
  is_default: boolean;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  sepa_last4: string | null;
  stripe_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingHistoryEvent {
  id: string;
  practitioner_id: string;
  subscription_id: string | null;
  invoice_id: string | null;
  event_type: BillingEventType;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Types pour les formulaires et UI
export interface UpgradeModalData {
  targetPlan: SubscriptionPlan;
  billingCycle: BillingCycle;
  currentSubscription?: Subscription;
}

export interface CheckoutSessionData {
  planId: string;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

// Type pour les données de facturation complètes
export interface BillingData {
  subscription: Subscription | null;
  invoices: Invoice[];
  history: BillingHistoryEvent[];
  paymentMethods: PaymentMethod[];
}

// Type pour les réponses API
export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

export interface BillingApiError {
  message: string;
  code?: string;
}
