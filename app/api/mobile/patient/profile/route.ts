/**
 * GET/PUT /api/mobile/patient/profile
 * Get or update patient profile
 *
 * Supports two auth methods:
 *  1. Custom JWT (patientId embedded in token)
 *  2. Supabase access token (resolved via patient_memberships)
 *
 * Includes auto-fix logic for missing membership, patient activation,
 * and practitioner assignment.
 */

import { NextRequest, NextResponse } from 'next/server';
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
async function resolvePatientId(
  request: NextRequest
): Promise<{ patientId: string | null; userId: string | null; userEmail: string | null }> {
  const authHeader = request.headers.get('authorization');
  console.log('[MOBILE API] Auth header present:', !!authHeader);

  const token = getBearerToken(authHeader);

  if (!token) {
    console.log('[MOBILE API] No bearer token found');
    return { patientId: null, userId: null, userEmail: null };
  }

  console.log('[MOBILE API] Token length:', token.length);

  // --- Strategy 1: Custom JWT ---
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    console.log('[MOBILE API] JWT verified, patientId:', payload.patientId);
    return {
      patientId: payload.patientId as string,
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
      return { patientId: null, userId: null, userEmail: null };
    }

    console.log('[MOBILE API] Supabase user resolved:', user.id, user.email);

    // Look up membership
    const { data: membership } = await supabase
      .from('patient_memberships')
      .select('patient_id')
      .eq('patient_user_id', user.id)
      .maybeSingle();

    if (membership?.patient_id) {
      console.log('[MOBILE API] Membership found, patient_id:', membership.patient_id);
      return { patientId: membership.patient_id, userId: user.id, userEmail: user.email ?? null };
    }

    // Auto-fix: create membership when a patient with matching email exists
    if (user.email) {
      console.log('[MOBILE API] No membership found, searching patient by email:', user.email);

      const { data: patientByEmail } = await supabase
        .from('patients')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (patientByEmail) {
        console.log('[MOBILE API] Patient found by email, creating membership...');

        const { error: createError } = await supabase
          .from('patient_memberships')
          .insert({ patient_id: patientByEmail.id, patient_user_id: user.id });

        if (!createError) {
          console.log('[MOBILE API] Membership auto-created for patient:', patientByEmail.id);
          return { patientId: patientByEmail.id, userId: user.id, userEmail: user.email };
        }
        console.log('[MOBILE API] Error creating membership:', createError.message);
      } else {
        console.log('[MOBILE API] No patient found with email:', user.email);
      }
    }

    return { patientId: null, userId: user.id, userEmail: user.email ?? null };
  } catch (err) {
    console.log('[MOBILE API] Supabase auth exception:', err);
    return { patientId: null, userId: null, userEmail: null };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n[MOBILE API] GET /api/mobile/patient/profile');

  try {
    const { patientId, userId, userEmail } = await resolvePatientId(request);

    if (!patientId) {
      if (!userId) {
        console.log('[MOBILE API] Unauthorized - no valid token');
        return NextResponse.json({ message: 'Non autorise' }, { status: 401 });
      }
      console.log('[MOBILE API] Patient profile not found for user:', userId, userEmail);
      return NextResponse.json({ message: 'Patient profile not found' }, { status: 404 });
    }

    console.log('[MOBILE API] Looking up patient:', patientId);

    const supabase = getSupabaseAdmin();

    // Get patient (without JOIN - practitioner fetched separately)
    let { data: patient, error } = await supabase
      .from('patients')
      .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
      .eq('id', patientId)
      .maybeSingle();

    if (error) {
      console.log('[MOBILE API] DB error fetching patient:', error.message);
    }

    // --- Auto-fix: create patient row if missing ---
    if (!patient && userEmail) {
      console.log('[MOBILE API] Patient row missing, attempting auto-creation...');

      // Find practitioner from invitation or OTP context
      let practitionerId: string | null = null;

      const { data: invitation } = await supabase
        .from('patient_invitations')
        .select('practitioner_id, full_name')
        .eq('patient_id', patientId)
        .order('invited_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      practitionerId = invitation?.practitioner_id ?? null;

      if (!practitionerId) {
        const { data: otp } = await supabase
          .from('otp_codes')
          .select('practitioner_id')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        practitionerId = otp?.practitioner_id ?? null;
      }

      if (!practitionerId) {
        const { data: practitioners } = await supabase
          .from('practitioners')
          .select('id')
          .limit(1);

        practitionerId = practitioners?.[0]?.id ?? null;
      }

      if (practitionerId) {
        const name = invitation?.full_name || userEmail.split('@')[0];

        const { data: newPatient, error: createError } = await supabase
          .from('patients')
          .insert({
            id: patientId,
            email: userEmail,
            name,
            practitioner_id: practitionerId,
            status: 'standard',
            is_premium: false,
            activated: true,
            activated_at: new Date().toISOString(),
          })
          .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
          .single();

        if (!createError && newPatient) {
          console.log('[MOBILE API] Patient auto-created:', newPatient.name);
          patient = newPatient;
        } else {
          console.log('[MOBILE API] Error auto-creating patient:', createError?.message);
        }
      } else {
        console.log('[MOBILE API] No practitioner available for patient creation');
      }
    }

    if (!patient) {
      console.error('[MOBILE API] Patient introuvable après auto-fix');
      console.error('[MOBILE API] Patient ID:', patientId);
      console.error('[MOBILE API] User email:', userEmail);

      // Diagnostic: check membership integrity
      const { data: membership } = await supabase
        .from('patient_memberships')
        .select('patient_id, patient_user_id')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (membership) {
        console.log('[MOBILE API] Membership exists but patient row missing:', membership);
      } else {
        console.log('[MOBILE API] No membership found for patientId:', patientId);
      }

      // Forced creation fallback: try to create patient with any available practitioner
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
        .from('patients')
        .insert({
          id: patientId,
          email: userEmail || `patient-${patientId.slice(0, 8)}@unknown.local`,
          name: userEmail?.split('@')[0] || 'Patient',
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
          { message: 'Impossible de créer le patient: ' + forceError.message },
          { status: 500 }
        );
      }

      console.log('[MOBILE API] Patient créé manuellement:', forceCreated.email);
      patient = forceCreated;
    }

    // --- Auto-fix: activate patient if not activated ---
    if (!patient.activated) {
      console.log('[MOBILE API] Patient not activated, auto-activating...');

      const { data: activated } = await supabase
        .from('patients')
        .update({ activated: true, activated_at: new Date().toISOString() })
        .eq('id', patientId)
        .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
        .single();

      if (activated) {
        console.log('[MOBILE API] Patient auto-activated');
        patient = activated;
      }
    }

    // --- Auto-fix: assign practitioner if missing ---
    if (!patient.practitioner_id) {
      console.log('[MOBILE API] No practitioner assigned, auto-assigning...');

      const { data: practitioners } = await supabase
        .from('practitioners')
        .select('id')
        .limit(1);

      if (practitioners?.[0]) {
        const { data: updated } = await supabase
          .from('patients')
          .update({ practitioner_id: practitioners[0].id })
          .eq('id', patientId)
          .select('id, name, email, phone, status, is_premium, activated, practitioner_id')
          .single();

        if (updated) {
          console.log('[MOBILE API] Practitioner auto-assigned:', practitioners[0].id);
          patient = updated;
        }
      }
    }

    console.log('[MOBILE API] Patient found:', patient.name, patient.email);

    // Get subscription info if premium
    let subscription = null;
    if (patient.is_premium) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, plan, status, current_period_end, cancel_at')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .maybeSingle();
      subscription = sub;
    }

    const duration = Date.now() - startTime;
    console.log(`[MOBILE API] Profile loaded in ${duration}ms`);

    const nameParts = patient.name?.split(' ') || ['', ''];

    // Fetch practitioner separately to avoid silent JOIN failures
    let practitioner = null;
    if (patient.practitioner_id) {
      const { data: prac, error: pracError } = await supabase
        .from('practitioners')
        .select('id, full_name, email, phone')
        .eq('id', patient.practitioner_id)
        .single();

      if (!pracError && prac) {
        practitioner = prac;
        console.log('[MOBILE API] Practitioner found:', prac.full_name);
      } else {
        console.log('[MOBILE API] Practitioner fetch error:', pracError?.message);
      }
    } else {
      console.log('[MOBILE API] No practitioner_id on patient');
    }

    return NextResponse.json({
      id: patient.id,
      email: patient.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phone: patient.phone,
      isPremium: patient.is_premium || false,
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
  console.log('\n[MOBILE API] PUT /api/mobile/patient/profile');

  try {
    const { patientId } = await resolvePatientId(request);

    if (!patientId) {
      console.log('[MOBILE API] PUT unauthorized - no patientId from token');
      return NextResponse.json({ message: 'Non autorise' }, { status: 401 });
    }

    console.log('[MOBILE API] PUT patient:', patientId);

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

    const { data: patient, error } = await getSupabaseAdmin()
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .select('id, name, email, phone, is_premium')
      .single();

    if (error || !patient) {
      console.log('[MOBILE API] PUT error:', error?.message);
      return NextResponse.json(
        { message: 'Erreur lors de la mise a jour' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[MOBILE API] Profile updated in ${duration}ms`);

    const nameParts = patient.name?.split(' ') || ['', ''];

    return NextResponse.json({
      id: patient.id,
      email: patient.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phone: patient.phone,
      isPremium: patient.is_premium || false,
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
