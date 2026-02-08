import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

/**
 * Cree un compte Stripe Connect Standard pour un naturopathe
 */
export async function createConnectAccount(
  email: string,
  practitionerId: string
): Promise<Stripe.Account> {
  return getStripe().accounts.create({
    type: 'standard',
    country: 'FR',
    email,
    metadata: {
      afeia_practitioner_id: practitionerId,
    },
  });
}

/**
 * Genere un lien d'onboarding Stripe Connect
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

/**
 * Recupere le statut d'un compte Stripe Connect
 */
export async function getAccountStatus(
  accountId: string
): Promise<Stripe.Account> {
  return getStripe().accounts.retrieve(accountId);
}

/**
 * Cree un Payment Link Stripe pour une facture
 */
export async function createPaymentLink(params: {
  stripeAccountId: string;
  description: string;
  practitionerName: string;
  invoiceNumero: string;
  amountCents: number;
  invoiceId: string;
  practitionerId: string;
  consultantId: string;
  successUrl: string;
}): Promise<Stripe.PaymentLink> {
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  return getStripe().paymentLinks.create(
    {
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: params.description,
              description: `Facture ${params.invoiceNumero} — ${params.practitionerName}`,
            },
            unit_amount: params.amountCents,
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: params.successUrl,
        },
      },
      metadata: {
        invoice_id: params.invoiceId,
        practitioner_id: params.practitionerId,
        consultant_id: params.consultantId,
      },
      expires_at: expiresAt,
    },
    {
      stripeAccount: params.stripeAccountId,
    }
  );
}

/**
 * Verifie la signature d'un webhook Stripe Connect
 */
export function constructConnectWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET is not set');
  }
  return getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
}
