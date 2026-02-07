/**
 * Shared authentication helper for mobile API routes.
 *
 * Supports two auth strategies:
 *  1. Custom JWT (consultantId embedded in token)
 *  2. Supabase access token (resolved via consultant_memberships)
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getBearerToken } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Resolve consultant ID from a Bearer token.
 *
 * Strategy:
 *  1. Try custom JWT verification (token contains consultantId directly).
 *  2. Fall back to Supabase auth (getUser) + consultant_memberships lookup,
 *     auto-creating the membership if a consultant with matching email exists.
 */
export async function resolveConsultantId(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = getBearerToken(authHeader);

  if (!token) {
    return null;
  }

  // --- Strategy 1: Custom JWT ---
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    if (payload.consultantId) {
      return payload.consultantId as string;
    }
  } catch {
    // Not a custom JWT, try Supabase auth
  }

  // --- Strategy 2: Supabase auth token ---
  try {
    const supabase = getSupabaseAdmin();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return null;
    }

    // Look up membership
    const { data: membership } = await supabase
      .from('consultant_memberships')
      .select('consultant_id')
      .eq('consultant_user_id', user.id)
      .maybeSingle();

    if (membership?.consultant_id) {
      return membership.consultant_id;
    }

    // Auto-fix: create membership when a consultant with matching email exists
    if (user.email) {
      const { data: consultantByEmail } = await supabase
        .from('consultants')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (consultantByEmail) {
        const { error: createError } = await supabase
          .from('consultant_memberships')
          .insert({ consultant_id: consultantByEmail.id, consultant_user_id: user.id });

        if (!createError) {
          return consultantByEmail.id;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
