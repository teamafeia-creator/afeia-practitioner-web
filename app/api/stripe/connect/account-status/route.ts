import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { getAccountStatus } from '@/lib/invoicing/stripe';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Non authentifie' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
    }
    const userId = authData.user.id;

    const supabase = createSupabaseAdminClient();

    const { data: settings } = await supabase
      .from('practitioner_billing_settings')
      .select('stripe_account_id')
      .eq('practitioner_id', userId)
      .single();

    if (!settings?.stripe_account_id) {
      return NextResponse.json({ connected: false });
    }

    // Recuperer le statut du compte Stripe
    const account = await getAccountStatus(settings.stripe_account_id);

    // Mettre a jour le statut dans Supabase
    const isCompleted = account.details_submitted && account.charges_enabled;
    await supabase
      .from('practitioner_billing_settings')
      .update({
        stripe_charges_enabled: account.charges_enabled || false,
        stripe_details_submitted: account.details_submitted || false,
        stripe_onboarding_completed: isCompleted || false,
        ...(isCompleted && !settings.stripe_account_id
          ? { stripe_connected_at: new Date().toISOString() }
          : {}),
      })
      .eq('practitioner_id', userId);

    return NextResponse.json({
      connected: true,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      email: account.email,
    });
  } catch (error) {
    console.error('Erreur statut Stripe:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la recuperation du statut' },
      { status: 500 }
    );
  }
}
