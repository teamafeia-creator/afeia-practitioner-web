import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

export type AdminUser = {
  id: string;
  email: string;
  role?: string;
};

/**
 * Verifies that the request comes from an authenticated admin user.
 * Supports both:
 * - Supabase Auth bearer token (new system)
 * - Legacy cookie-based auth (for backward compatibility during migration)
 */
export async function requireAdminAuth(request: NextRequest): Promise<
  { user: AdminUser } | { response: NextResponse }
> {
  const supabase = createAdminClient();

  // 1. Try Supabase Auth bearer token first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !authData.user?.email) {
      return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const isAdmin = await checkIsAdmin(authData.user.email);
    if (!isAdmin) {
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    // Get role from admin_profiles
    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile?.role ?? 'admin',
      },
    };
  }

  // 2. Fall back to legacy cookie-based auth
  const cookieEmail = request.cookies.get('afeia_admin_email')?.value;
  if (!cookieEmail) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const isAdmin = await checkIsAdmin(cookieEmail);
  if (!isAdmin) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    user: {
      id: '',
      email: cookieEmail,
    },
  };
}

export async function checkIsAdmin(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();

  // Check env variable first
  const envEmails = process.env.ADMIN_EMAILS;
  if (envEmails) {
    const allowlist = envEmails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (allowlist.includes(normalized)) return true;
  }

  // Check admin_profiles table
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('admin_profiles')
    .select('user_id')
    .eq('email', normalized)
    .maybeSingle();

  if (data) return true;

  // Fallback: check legacy admin_allowlist
  const { data: legacyData } = await supabase
    .from('admin_allowlist')
    .select('email')
    .eq('email', normalized)
    .maybeSingle();

  return Boolean(legacyData);
}
