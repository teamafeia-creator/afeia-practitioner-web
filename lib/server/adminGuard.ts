import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAuthClient } from './supabaseAdmin';
import { getAdminEmailFromRequest, isAdminEmail } from './adminAuth';

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !authData.user?.email) {
      return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const allowed = await isAdminEmail(authData.user.email);

    if (!allowed) {
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { user: authData.user };
  }

  const cookieEmail = getAdminEmailFromRequest(request);
  if (!cookieEmail) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const allowed = await isAdminEmail(cookieEmail);

  if (!allowed) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: { email: cookieEmail } };
}
