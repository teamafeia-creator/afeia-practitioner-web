// app/api/billing/manage-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { createCustomerPortalSession } from '@/lib/stripe/server';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification via Supabase
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json(
        { message: 'Non authentifié' },
        { status: 401 }
      );
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json(
        { message: 'Session invalide' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

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
