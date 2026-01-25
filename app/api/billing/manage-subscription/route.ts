// app/api/billing/manage-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { createCustomerPortalSession } from '@/lib/stripe/server';
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

    // Récupérer l'abonnement actif avec le stripe_customer_id
    const supabase = createSupabaseAdminClient();
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('practitioner_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { message: 'Aucun abonnement actif avec un compte Stripe' },
        { status: 404 }
      );
    }

    // Créer la session du portail client
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalSession = await createCustomerPortalSession(
      subscription.stripe_customer_id,
      `${appUrl}/billing`
    );

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { message: 'Erreur lors de l\'ouverture du portail de gestion' },
      { status: 500 }
    );
  }
}
