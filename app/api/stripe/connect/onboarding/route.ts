import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { createConnectAccount, createAccountLink } from '@/lib/invoicing/stripe';

export async function POST(request: NextRequest) {
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

    // Verifier si le praticien a deja un compte Stripe
    const { data: settings } = await supabase
      .from('practitioner_billing_settings')
      .select('stripe_account_id')
      .eq('practitioner_id', userId)
      .single();

    let accountId = settings?.stripe_account_id;

    // Si pas de compte, en creer un
    if (!accountId) {
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('email')
        .eq('id', userId)
        .single();

      const account = await createConnectAccount(
        practitioner?.email || authData.user.email || '',
        userId
      );

      accountId = account.id;

      // Sauvegarder l'ID
      await supabase
        .from('practitioner_billing_settings')
        .update({ stripe_account_id: accountId })
        .eq('practitioner_id', userId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Creer un lien d'onboarding
    const accountLink = await createAccountLink(
      accountId,
      `${appUrl}/settings/facturation/stripe?refresh=true`,
      `${appUrl}/settings/facturation/stripe?success=true`
    );

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Erreur onboarding Stripe:', error);
    return NextResponse.json(
      { message: "Erreur lors de la creation du lien d'onboarding" },
      { status: 500 }
    );
  }
}
