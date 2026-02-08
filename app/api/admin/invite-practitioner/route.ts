import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const fullName = String(body.full_name ?? '').trim();
  const subscriptionStatus = body.subscription_status ? String(body.subscription_status) : null;

  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 });
  }

  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAdmin = createAdminClient();
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo ?? undefined
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  const userId = inviteData.user?.id;

  if (userId) {
    const { error: upsertError } = await supabaseAdmin.from('practitioners_public').upsert({
      id: userId,
      email,
      full_name: fullName,
      status: 'active',
      subscription_status: subscriptionStatus,
      updated_at: new Date().toISOString()
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, userId });
}
