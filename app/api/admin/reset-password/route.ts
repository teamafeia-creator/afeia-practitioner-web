import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-log';

export async function POST(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 });
  }

  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo ?? undefined
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminUserId: guard.user.id || undefined,
    adminEmail: guard.user.email,
    action: 'practitioner.password_reset',
    targetType: 'practitioner',
    details: { email },
    ipAddress: getClientIp(request) ?? undefined,
  });

  return NextResponse.json({ success: true });
}
