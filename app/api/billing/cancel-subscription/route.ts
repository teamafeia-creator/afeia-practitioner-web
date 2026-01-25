// app/api/billing/cancel-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { cancelStripeSubscription } from '@/lib/stripe/server';
import { cancelSubscription, addBillingHistoryEvent } from '@/services/billing-service';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';

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
    const { subscriptionId } = body as { subscriptionId: string };

    if (!subscriptionId) {
      return NextResponse.json(
        { message: 'subscriptionId est requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'abonnement appartient à l'utilisateur
    const supabase = createSupabaseAdminClient();
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('id', subscriptionId)
      .eq('practitioner_id', userId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { message: 'Abonnement non trouvé' },
        { status: 404 }
      );
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { message: 'Cet abonnement n\'est pas actif' },
        { status: 400 }
      );
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json(
        { message: 'Cet abonnement est déjà annulé' },
        { status: 400 }
      );
    }

    // Annuler l'abonnement Stripe si présent
    if (subscription.stripe_subscription_id) {
      await cancelStripeSubscription(subscription.stripe_subscription_id, true);
    }

    // Mettre à jour l'abonnement dans Supabase
    const updatedSubscription = await cancelSubscription(subscriptionId);

    // Ajouter à l'historique
    await addBillingHistoryEvent({
      practitionerId: userId,
      subscriptionId,
      eventType: 'subscription_canceled',
      description: `Abonnement ${subscription.plan?.display_name} annulé`,
      metadata: {
        plan_name: subscription.plan?.name,
        cancel_at_period_end: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { message: 'Erreur lors de l\'annulation de l\'abonnement' },
      { status: 500 }
    );
  }
}
