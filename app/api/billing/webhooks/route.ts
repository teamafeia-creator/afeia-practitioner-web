// app/api/billing/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { constructWebhookEvent } from '@/lib/stripe/server';
import {
  createOrUpdateSubscription,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
  createInvoice,
  updateInvoiceStatus,
  getInvoiceByStripeId,
  addBillingHistoryEvent,
  getPlanByName,
} from '@/services/billing-service';
import type { BillingCycle, SubscriptionStatus } from '@/lib/billing/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { message: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { message: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Gérer les différents types d'événements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        await handlePaymentMethodAttached(paymentMethod);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { message: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const planId = session.metadata?.plan_id;
  const billingCycle = session.metadata?.billing_cycle as BillingCycle;

  if (!userId || !planId || !billingCycle) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // L'abonnement sera créé par l'événement customer.subscription.created
  // Mais on peut ajouter un événement d'historique ici
  await addBillingHistoryEvent({
    practitionerId: userId,
    eventType: 'subscription_created',
    description: 'Abonnement Premium activé',
    metadata: {
      checkout_session_id: session.id,
      billing_cycle: billingCycle,
    },
  });
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const userId = stripeSubscription.metadata?.user_id;
  if (!userId) {
    console.error('Missing user_id in subscription metadata');
    return;
  }

  const planName = stripeSubscription.metadata?.plan_name || 'premium';
  const plan = await getPlanByName(planName as 'free' | 'premium');
  if (!plan) {
    console.error('Plan not found:', planName);
    return;
  }

  const billingCycle = stripeSubscription.items.data[0]?.price?.recurring?.interval === 'year'
    ? 'yearly'
    : 'monthly';

  // Cast to access period properties (available in the raw object)
  const subscriptionAny = stripeSubscription as unknown as Record<string, unknown>;
  const currentPeriodStart = subscriptionAny.current_period_start as number;
  const currentPeriodEnd = subscriptionAny.current_period_end as number;
  const trialEnd = subscriptionAny.trial_end as number | null;

  // Créer ou mettre à jour l'abonnement
  await createOrUpdateSubscription({
    practitionerId: userId,
    planId: plan.id,
    billingCycle,
    status: mapStripeStatus(stripeSubscription.status),
    stripeCustomerId: typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: stripeSubscription.items.data[0]?.price?.id,
    currentPeriodStart: new Date(currentPeriodStart * 1000),
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    trialEnd: trialEnd ? new Date(trialEnd * 1000) : undefined,
  });
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const existingSubscription = await getSubscriptionByStripeId(stripeSubscription.id);
  if (!existingSubscription) {
    console.log('Subscription not found in database');
    return;
  }

  await updateSubscriptionStatus(existingSubscription.id, 'canceled');

  await addBillingHistoryEvent({
    practitionerId: existingSubscription.practitioner_id,
    subscriptionId: existingSubscription.id,
    eventType: 'subscription_canceled',
    description: 'Abonnement définitivement annulé',
  });
}

async function handleInvoicePaid(stripeInvoice: Stripe.Invoice) {
  // Cast pour accéder aux propriétés du raw object
  const invoiceAny = stripeInvoice as unknown as Record<string, unknown>;

  // Récupérer l'abonnement associé - subscription peut être string ou objet
  const subscriptionRaw = invoiceAny.subscription;
  const subscriptionId = typeof subscriptionRaw === 'string'
    ? subscriptionRaw
    : (subscriptionRaw as { id?: string })?.id;

  if (!subscriptionId) return;

  const subscription = await getSubscriptionByStripeId(subscriptionId);
  if (!subscription) {
    console.log('Subscription not found for invoice');
    return;
  }

  // Calculer la taxe totale
  const totalTaxAmounts = invoiceAny.total_tax_amounts as Array<{ amount: number }> | undefined;
  const totalTax = totalTaxAmounts?.reduce(
    (sum: number, t: { amount: number }) => sum + t.amount, 0
  ) || 0;

  // Vérifier si la facture existe déjà
  let invoice = await getInvoiceByStripeId(stripeInvoice.id);

  if (invoice) {
    // Mettre à jour le statut
    await updateInvoiceStatus(invoice.id, 'paid', new Date());
  } else {
    // Créer la facture
    invoice = await createInvoice({
      subscriptionId: subscription.id,
      practitionerId: subscription.practitioner_id,
      amountSubtotal: (stripeInvoice.subtotal || 0) / 100,
      amountTax: totalTax / 100,
      amountTotal: (stripeInvoice.total || 0) / 100,
      currency: stripeInvoice.currency?.toUpperCase() || 'EUR',
      status: 'paid',
      invoiceDate: new Date(stripeInvoice.created * 1000),
      dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : undefined,
      description: stripeInvoice.description || 'Abonnement Premium AFEIA',
      billingReason: stripeInvoice.billing_reason || 'subscription_cycle',
      stripeInvoiceId: stripeInvoice.id,
      stripeInvoicePdf: stripeInvoice.invoice_pdf || undefined,
    });
  }

  // Ajouter à l'historique
  await addBillingHistoryEvent({
    practitionerId: subscription.practitioner_id,
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
    eventType: 'payment_succeeded',
    description: `Paiement de ${(stripeInvoice.total || 0) / 100} EUR reçu`,
    metadata: {
      amount: (stripeInvoice.total || 0) / 100,
      invoice_number: invoice.invoice_number,
    },
  });
}

async function handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice) {
  // Cast pour accéder aux propriétés du raw object
  const invoiceAny = stripeInvoice as unknown as Record<string, unknown>;
  const subscriptionRaw = invoiceAny.subscription;
  const subscriptionId = typeof subscriptionRaw === 'string'
    ? subscriptionRaw
    : (subscriptionRaw as { id?: string })?.id;

  if (!subscriptionId) return;

  const subscription = await getSubscriptionByStripeId(subscriptionId);
  if (!subscription) return;

  // Mettre à jour le statut de l'abonnement
  await updateSubscriptionStatus(subscription.id, 'past_due');

  // Ajouter à l'historique
  await addBillingHistoryEvent({
    practitionerId: subscription.practitioner_id,
    subscriptionId: subscription.id,
    eventType: 'payment_failed',
    description: 'Le paiement a échoué',
    metadata: {
      amount: (stripeInvoice.total || 0) / 100,
      attempt_count: stripeInvoice.attempt_count,
    },
  });
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  const customerId = typeof paymentMethod.customer === 'string'
    ? paymentMethod.customer
    : paymentMethod.customer?.id;

  if (!customerId) return;

  // Trouver l'utilisateur par son customer ID Stripe
  // Note: Cette implémentation pourrait nécessiter une table de mapping
  // Pour l'instant, on ne fait rien car la relation n'est pas directe
  console.log('Payment method attached:', paymentMethod.id);
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete',
    unpaid: 'past_due',
    paused: 'active',
  };
  return statusMap[stripeStatus] || 'active';
}
