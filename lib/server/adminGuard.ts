import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from './supabaseAdmin';

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseAuth = createSupabaseAuthClient();
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !authData.user?.email) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: allowlist, error: allowlistError } = await supabaseAdmin
    .from('admin_allowlist')
    .select('email')
    .eq('email', authData.user.email)
    .maybeSingle();

  if (allowlistError || !allowlist) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: authData.user };
}
