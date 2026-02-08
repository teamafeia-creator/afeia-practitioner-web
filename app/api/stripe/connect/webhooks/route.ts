import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { constructConnectWebhookEvent } from '@/lib/invoicing/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verifier la signature
    let event: Stripe.Event;
    try {
      event = constructConnectWebhookEvent(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Logger l'evenement
    const { data: loggedEvent } = await supabase
      .from('stripe_webhook_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        stripe_account_id: event.account || null,
        payload: event.data.object as Record<string, unknown>,
      })
      .select()
      .single();

    // Traiter selon le type d'evenement
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(
          supabase,
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case 'account.updated':
        await handleAccountUpdated(
          supabase,
          event.data.object as Stripe.Account
        );
        break;

      case 'account.application.deauthorized':
        if (event.account) {
          await handleAccountDeauthorized(supabase, event.account);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Marquer comme traite
    if (loggedEvent) {
      await supabase
        .from('stripe_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', loggedEvent.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  session: Stripe.Checkout.Session
) {
  const invoiceId = session.metadata?.invoice_id;

  if (!invoiceId) {
    console.error('No invoice_id in session metadata');
    return;
  }

  // Recuperer la facture
  const { data: invoice } = await supabase
    .from('consultation_invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    console.error('Invoice not found:', invoiceId);
    return;
  }

  if (invoice.status === 'paid') {
    console.log('Invoice already paid:', invoiceId);
    return;
  }

  // Marquer comme payee
  await supabase
    .from('consultation_invoices')
    .update({
      status: 'paid',
      payment_method: 'stripe',
      payment_date: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent as string,
    })
    .eq('id', invoiceId);

  // Logger l'action
  await supabase.from('invoice_history').insert({
    invoice_id: invoiceId,
    action: 'paid_via_stripe',
    metadata: {
      session_id: session.id,
      payment_intent: session.payment_intent,
    },
  });

  // Envoyer email de confirmation
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  fetch(`${appUrl}/api/invoicing/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoice_id: invoiceId }),
  }).catch(console.error);
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const invoiceId = paymentIntent.metadata?.invoice_id;

  if (invoiceId) {
    await supabase.from('invoice_history').insert({
      invoice_id: invoiceId,
      action: 'payment_failed',
      metadata: {
        payment_intent: paymentIntent.id,
        error: paymentIntent.last_payment_error?.message,
      },
    });
  }
}

async function handleAccountUpdated(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  account: Stripe.Account
) {
  const { data: settings } = await supabase
    .from('practitioner_billing_settings')
    .select('practitioner_id')
    .eq('stripe_account_id', account.id)
    .single();

  if (settings) {
    const isCompleted = account.details_submitted && account.charges_enabled;
    await supabase
      .from('practitioner_billing_settings')
      .update({
        stripe_charges_enabled: account.charges_enabled || false,
        stripe_details_submitted: account.details_submitted || false,
        stripe_onboarding_completed: isCompleted || false,
        ...(isCompleted ? { stripe_connected_at: new Date().toISOString() } : {}),
      })
      .eq('practitioner_id', settings.practitioner_id);
  }
}

async function handleAccountDeauthorized(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  accountId: string
) {
  await supabase
    .from('practitioner_billing_settings')
    .update({
      stripe_account_id: null,
      stripe_onboarding_completed: false,
      stripe_charges_enabled: false,
      stripe_details_submitted: false,
      stripe_connected_at: null,
    })
    .eq('stripe_account_id', accountId);
}
