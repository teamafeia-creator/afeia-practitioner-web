/**
 * Shared authentication helper for mobile API routes.
 *
 * Supports two auth strategies:
 *  1. Custom JWT (patientId embedded in token)
 *  2. Supabase access token (resolved via patient_memberships)
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getBearerToken } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Resolve patient ID from a Bearer token.
 *
 * Strategy:
 *  1. Try custom JWT verification (token contains patientId directly).
 *  2. Fall back to Supabase auth (getUser) + patient_memberships lookup,
 *     auto-creating the membership if a patient with matching email exists.
 */
export async function resolvePatientId(
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
    if (payload.patientId) {
      return payload.patientId as string;
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
      .from('patient_memberships')
      .select('patient_id')
      .eq('patient_user_id', user.id)
      .maybeSingle();

    if (membership?.patient_id) {
      return membership.patient_id;
    }

    // Auto-fix: create membership when a patient with matching email exists
    if (user.email) {
      const { data: patientByEmail } = await supabase
        .from('patients')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (patientByEmail) {
        const { error: createError } = await supabase
          .from('patient_memberships')
          .insert({ patient_id: patientByEmail.id, patient_user_id: user.id });

        if (!createError) {
          return patientByEmail.id;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
