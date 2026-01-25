// app/api/billing/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
} from '@/lib/stripe/server';
import { getPlanById } from '@/services/billing-service';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';
import type { BillingCycle } from '@/lib/billing/types';

// Mapping des prix Stripe pour chaque plan et cycle
// Ces IDs doivent être configurés dans Stripe Dashboard
const STRIPE_PRICE_IDS: Record<string, Record<BillingCycle, string>> = {
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
  },
};

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    const token = getBearerToken(authHeader);
    if (!token) {
      return NextResponse.json(
        { message: 'Non authentifié' },
        { status: 401 }
      );
    }

    const payload = await verifyApiJwt(token);
    if (!payload) {
      return NextResponse.json(
        { message: 'Token invalide' },
        { status: 401 }
      );
    }

    const userId = payload.sub as string;

    // Parser la requête
    const body = await request.json();
    const { planId, billingCycle } = body as {
      planId: string;
      billingCycle: BillingCycle;
    };

    if (!planId || !billingCycle) {
      return NextResponse.json(
        { message: 'planId et billingCycle sont requis' },
        { status: 400 }
      );
    }

    // Récupérer le plan
    const plan = await getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { message: 'Plan non trouvé' },
        { status: 404 }
      );
    }

    if (plan.name === 'free') {
      return NextResponse.json(
        { message: 'Le plan gratuit ne nécessite pas de paiement' },
        { status: 400 }
      );
    }

    // Récupérer les informations du praticien
    const supabase = createSupabaseAdminClient();
    const { data: practitioner, error: practitionerError } = await supabase
      .from('practitioners')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (practitionerError || !practitioner) {
      return NextResponse.json(
        { message: 'Praticien non trouvé' },
        { status: 404 }
      );
    }

    // Créer ou récupérer le client Stripe
    const stripeCustomer = await getOrCreateStripeCustomer(
      practitioner.email,
      practitioner.full_name,
      userId
    );

    // Récupérer le prix Stripe
    const priceId = STRIPE_PRICE_IDS[plan.name]?.[billingCycle];
    if (!priceId) {
      return NextResponse.json(
        { message: 'Prix Stripe non configuré pour ce plan' },
        { status: 500 }
      );
    }

    // Créer la session de checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createCheckoutSession({
      customerId: stripeCustomer.id,
      priceId,
      successUrl: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/billing`,
      metadata: {
        user_id: userId,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
}
