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

    // Look up membership (limit(1) : une ligne en double ne doit pas tout bloquer)
    const { data: memberships, error: membershipError } = await supabase
      .from('consultant_memberships')
      .select('consultant_id')
      .eq('consultant_user_id', user.id)
      .limit(1);

    if (membershipError) {
      console.warn('[mobile-auth] lecture membership impossible', { userId: user.id, code: membershipError.code });
    }
    if (memberships?.[0]?.consultant_id) {
      return memberships[0].consultant_id as string;
    }

    // Auto-fix: create membership when a consultant with matching email exists
    if (user.email) {
      const { data: consultantsByEmail, error: emailError } = await supabase
        .from('consultants')
        .select('id')
        .eq('email', user.email.trim().toLowerCase())
        .limit(2);

      if (emailError) {
        console.warn('[mobile-auth] recherche par e-mail impossible', { userId: user.id, code: emailError.code });
      } else if ((consultantsByEmail?.length ?? 0) > 1) {
        // Plusieurs fiches pour le même e-mail : on ne devine pas laquelle relier.
        console.warn('[mobile-auth] plusieurs fiches consultant pour cet e-mail', { userId: user.id });
      } else if (consultantsByEmail?.[0]) {
        const consultantId = consultantsByEmail[0].id as string;
        const { error: createError } = await supabase
          .from('consultant_memberships')
          .insert({ consultant_id: consultantId, consultant_user_id: user.id });

        if (!createError) {
          return consultantId;
        }
        console.warn('[mobile-auth] création membership impossible', { userId: user.id, consultantId, code: createError.code });
      } else {
        console.warn('[mobile-auth] aucune fiche consultant pour cet utilisateur', { userId: user.id });
      }
    }

    return null;
  } catch (error) {
    console.warn('[mobile-auth] résolution du consultant impossible', { message: (error as Error).message });
    return null;
  }
}
