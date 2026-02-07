/**
 * GET/PUT /api/mobile/consultant/profile
 * Get or update consultant profile
 *
 * Supports two auth methods:
 *  1. Custom JWT (consultantId embedded in token)
 *  2. Supabase access token (resolved via consultant_memberships)
 *
 * Includes auto-fix logic for missing membership, consultant activation,
 * and practitioner assignment.
 */

import { NextRequest, NextResponse } from 'next/server';
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
async function resolveConsultantId(
  request: NextRequest
): Promise<{ consultantId: string | null; userId: string | null; userEmail: string | null }> {
  const authHeader = request.headers.get('authorization');
  console.log('[MOBILE API] Auth header present:', !!authHeader);

  const token = getBearerToken(authHeader);

  if (!token) {
    console.log('[MOBILE API] No bearer token found');
    return { consultantId: null, userId: null, userEmail: null };
  }

  console.log('[MOBILE API] Token length:', token.length);

  // --- Strategy 1: Custom JWT ---
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    console.log('[MOBILE API] JWT verified, consultantId:', payload.consultantId);
    return {
      consultantId: payload.consultantId as string,
      userId: (payload.sub as string) || null,
      userEmail: (payload.email as string) || null,
    };
  } catch {
    console.log('[MOBILE API] JWT verification failed, trying Supabase auth...');
  }

  // --- Strategy 2: Supabase auth token ---
  try {
    const supabase = getSupabaseAdmin();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('[MOBILE API] Supabase auth failed:', authError?.message);
      return { consultantId: null, userId: null, userEmail: null };
    }

    console.log('[MOBILE API] Supabase user resolved:', user.id, user.email);

    // Look up membership
    const { data: membership } = await supabase
      .from('consultant_memberships')
      .select('consultant_id')
      .eq('consultant_user_id', user.id)
      .maybeSingle();

    if (membership?.consultant_id) {
      console.log('[MOBILE API] Membership found, consultant_id:', membership.consultant_id);
      return { consultantId: membership.consultant_id, userId: user.id, userEmail: user.email ?? null };
    }

    // Auto-fix: create membership when a consultant with matching email exists
    if (user.email) {
      console.log('[MOBILE API] No membership found, searching consultant by email:', user.email);

      const { data: consultantByEmail } = await supabase
        .from('consultants')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (consultantByEmail) {
        console.log('[MOBILE API] Consultant found by email, creating membership...');

        const { error: createError } = await supabase
          .from('consultant_memberships')
          .insert({ consultant_id: consultantByEmail.id, consultant_user_id: user.id });

        if (!createError) {
          console.log('[MOBILE API] Membership auto-created for consultant:', consultantByEmail.id);
          return { consultantId: consultantByEmail.id, userId: user.id, userEmail: user.email };
        }
        console.log('[MOBILE API] Error creating membership:', createError.message);
      } else {
        console.log('[MOBILE API] No consultant found with email:', user.email);
      }
    }

    return { consultantId: null, userId: user.id, userEmail: user.email ?? null };
  } catch (err) {
    console.log('[MOBILE API] Supabase auth exception:', err);
    return { consultantId: null, userId: null, userEmail: null };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n[MOBILE API] GET /api/mobile/consultant/profile');

  try {
    const { consultantId, userId, userEmail } = await resolveConsultantId(request);

    if (!consultantId) {
      if (!userId) {
        console.log('[MOBILE API] Unauthorized - no valid token');
        return NextResponse.json({ message: 'Non autorise' }, { status: 401 });
      }
      console.log('[MOBILE API] Consultant profile not found for user:', userId, userEmail);
      return NextResponse.json({ message: 'Consultant profile not found' }, { status: 404 });
    }

    console.log('[MOBILE API] Looking up consultant:', consultantId);

    const supabase = getSupabaseAdmin();

    // Get consultant (without JOIN - practitioner fetched separately)
    let { data: consultant, error } = await supabase
      .from('consultants')
      .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
      .eq('id', consultantId)
      .maybeSingle();

    if (error) {
      console.log('[MOBILE API] DB error fetching consultant:', error.message);
    }

    // --- Auto-fix: create consultant row if missing ---
    if (!consultant && userEmail) {
      console.log('[MOBILE API] Consultant row missing for consultantId:', consultantId);
      console.log('[MOBILE API] Attempting auto-creation...');

      // Chercher practitioner_id (invitation > OTP > fallback)
      let practitionerId: string | null = null;
      let consultantName: string = userEmail.split('@')[0];

      // Essai 1 : Invitation
      const { data: invitation } = await supabase
        .from('consultant_invitations')
        .select('practitioner_id, full_name')
        .eq('consultant_id', consultantId)
        .order('invited_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invitation) {
        practitionerId = invitation.practitioner_id ?? null;
        consultantName = invitation.full_name || consultantName;
        console.log('[MOBILE API] Found invitation with practitioner:', practitionerId);
      }

      // Essai 2 : OTP
      if (!practitionerId) {
        const { data: otp } = await supabase
          .from('otp_codes')
          .select('practitioner_id')
          .eq('consultant_id', consultantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (otp) {
          practitionerId = otp.practitioner_id ?? null;
          console.log('[MOBILE API] Found OTP with practitioner:', practitionerId);
        }
      }

      // FALLBACK : Premier praticien de la base
      if (!practitionerId) {
        console.warn('[MOBILE API] No practitioner in invitation/OTP, using fallback...');

        const { data: practitioners } = await supabase
          .from('practitioners')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1);

        practitionerId = practitioners?.[0]?.id ?? null;

        if (practitionerId) {
          console.log('[MOBILE API] Using fallback practitioner:', practitionerId);
        }
      }

      // BLOQUER si toujours null (erreur critique)
      if (!practitionerId) {
        console.error('[MOBILE API] CRITICAL: No practitioner available in database');
        return NextResponse.json(
          { message: 'Configuration système invalide: aucun praticien disponible' },
          { status: 500 }
        );
      }

      // Créer consultant (on est sûr d'avoir un practitioner_id maintenant)
      const { data: newConsultant, error: createError } = await supabase
        .from('consultants')
        .insert({
          id: consultantId,
          email: userEmail,
          name: consultantName,
          practitioner_id: practitionerId,
          status: 'standard',
          is_premium: false,
          activated: true,
          activated_at: new Date().toISOString(),
        })
        .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
        .single();

      if (createError) {
        console.error('[MOBILE API] Error auto-creating consultant:', createError.message);
        return NextResponse.json(
          { message: 'Impossible de créer le consultant: ' + createError.message },
          { status: 500 }
        );
      }

      if (newConsultant) {
        console.log('[MOBILE API] Consultant auto-created:', newConsultant.name);
        consultant = newConsultant;
      } else {
        console.error('[MOBILE API] Consultant creation returned null');
        return NextResponse.json(
          { message: 'Erreur inconnue lors de la création du consultant' },
          { status: 500 }
        );
      }
    }

    if (!consultant) {
      console.error('[MOBILE API] Consultant introuvable après auto-fix');
      console.error('[MOBILE API] Consultant ID:', consultantId);
      console.error('[MOBILE API] User email:', userEmail);

      // Diagnostic: check membership integrity
      const { data: membership } = await supabase
        .from('consultant_memberships')
        .select('consultant_id, consultant_user_id')
        .eq('consultant_id', consultantId)
        .maybeSingle();

      if (membership) {
        console.log('[MOBILE API] Membership exists but consultant row missing:', membership);
      } else {
        console.log('[MOBILE API] No membership found for consultantId:', consultantId);
      }

      // Forced creation fallback: try to create consultant with any available practitioner
      const { data: practitioners } = await supabase
        .from('practitioners')
        .select('id, full_name')
        .limit(1);

      console.error('[MOBILE API] Praticiens disponibles:', practitioners?.length || 0);

      if (!practitioners?.length) {
        return NextResponse.json(
          { message: 'Configuration invalide: aucun praticien dans la base' },
          { status: 500 }
        );
      }

      console.log('[MOBILE API] Tentative création manuelle forcée...');
      const { data: forceCreated, error: forceError } = await supabase
        .from('consultants')
        .insert({
          id: consultantId,
          email: userEmail || `consultant-${consultantId.slice(0, 8)}@unknown.local`,
          name: userEmail?.split('@')[0] || 'Consultant',
          practitioner_id: practitioners[0].id,
          status: 'standard',
          is_premium: false,
          activated: true,
          activated_at: new Date().toISOString(),
        })
        .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
        .single();

      if (forceError) {
        console.error('[MOBILE API] Échec création forcée:', forceError);
        return NextResponse.json(
          { message: 'Impossible de créer le consultant: ' + forceError.message },
          { status: 500 }
        );
      }

      console.log('[MOBILE API] Consultant créé manuellement:', forceCreated.email);
      consultant = forceCreated;
    }

    // --- Auto-fix: activate consultant if not activated ---
    if (!consultant.activated) {
      console.log('[MOBILE API] Consultant not activated, auto-activating...');

      const { data: activated } = await supabase
        .from('consultants')
        .update({ activated: true, activated_at: new Date().toISOString() })
        .eq('id', consultantId)
        .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
        .single();

      if (activated) {
        console.log('[MOBILE API] Consultant auto-activated');
        consultant = activated;
      }
    }

    // --- Auto-fix: assign practitioner if missing ---
    if (!consultant.practitioner_id) {
      console.log('[MOBILE API] No practitioner assigned, auto-assigning...');

      const { data: practitioners } = await supabase
        .from('practitioners')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1);

      if (practitioners?.[0]) {
        const { data: updated } = await supabase
          .from('consultants')
          .update({ practitioner_id: practitioners[0].id })
          .eq('id', consultantId)
          .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
          .single();

        if (updated) {
          console.log('[MOBILE API] Practitioner auto-assigned:', practitioners[0].id);
          consultant = updated;
        }
      }
    }

    console.log('[MOBILE API] Consultant found:', consultant.name, consultant.email);

    // Get subscription info if premium
    let subscription = null;
    if (consultant.is_premium) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, plan, status, current_period_end, cancel_at')
        .eq('consultant_id', consultantId)
        .eq('status', 'active')
        .maybeSingle();
      subscription = sub;
    }

    const duration = Date.now() - startTime;
    console.log(`[MOBILE API] Profile loaded in ${duration}ms`);

    const nameParts = consultant.name?.split(' ') || ['', ''];

    // Fetch practitioner separately to avoid silent JOIN failures
    let practitioner = null;
    if (consultant.practitioner_id) {
      const { data: prac, error: pracError } = await supabase
        .from('practitioners')
        .select('id, full_name, email, phone')
        .eq('id', consultant.practitioner_id)
        .single();

      if (!pracError && prac) {
        practitioner = prac;
        console.log('[MOBILE API] Practitioner found:', prac.full_name);
      } else {
        console.log('[MOBILE API] Practitioner fetch error:', pracError?.message);
      }
    } else {
      console.log('[MOBILE API] No practitioner_id on consultant');
    }

    return NextResponse.json({
      id: consultant.id,
      email: consultant.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phone: consultant.phone,
      isPremium: consultant.is_premium || false,
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            cancelAt: subscription.cancel_at,
          }
        : null,
      naturopathe: practitioner
        ? {
            id: practitioner.id,
            fullName: practitioner.full_name,
            email: practitioner.email,
            phone: practitioner.phone,
          }
        : null,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[MOBILE API] GET profile exception after ${duration}ms:`, error);
    return NextResponse.json(
      { message: 'Erreur lors de la recuperation du profil' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n[MOBILE API] PUT /api/mobile/consultant/profile');

  try {
    const { consultantId } = await resolveConsultantId(request);

    if (!consultantId) {
      console.log('[MOBILE API] PUT unauthorized - no consultantId from token');
      return NextResponse.json({ message: 'Non autorise' }, { status: 401 });
    }

    console.log('[MOBILE API] PUT consultant:', consultantId);

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    // Build update object
    const updates: Record<string, any> = {};
    if (firstName !== undefined || lastName !== undefined) {
      updates.name = `${firstName || ''} ${lastName || ''}`.trim();
    }
    if (phone !== undefined) {
      updates.phone = phone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'Aucune donnee a mettre a jour' },
        { status: 400 }
      );
    }

    console.log('[MOBILE API] Updating fields:', Object.keys(updates).join(', '));

    const { data: consultant, error } = await getSupabaseAdmin()
      .from('consultants')
      .update(updates)
      .eq('id', consultantId)
      .select('id, name, email, phone, is_premium')
      .single();

    if (error || !consultant) {
      console.log('[MOBILE API] PUT error:', error?.message);
      return NextResponse.json(
        { message: 'Erreur lors de la mise a jour' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[MOBILE API] Profile updated in ${duration}ms`);

    const nameParts = consultant.name?.split(' ') || ['', ''];

    return NextResponse.json({
      id: consultant.id,
      email: consultant.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phone: consultant.phone,
      isPremium: consultant.is_premium || false,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[MOBILE API] PUT profile exception after ${duration}ms:`, error);
    return NextResponse.json(
      { message: 'Erreur lors de la mise a jour du profil' },
      { status: 500 }
    );
  }
}
