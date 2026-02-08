import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type FinalizeAuthRequest = {
  email?: string | null;
  newPassword?: string | null;
  otpCodeOrOtpId?: string | null;
};

type InvitationRecord = {
  id?: string | number | null;
  consultant_id?: string | null;
  practitioner_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() || null;

const isSixDigitCode = (value: string) => /^\d{6}$/.test(value);

async function resolveInvitation(otpRecord: any, email: string | null) {
  const supabaseAdmin = getSupabaseAdmin();
  let invitation: InvitationRecord | null = null;

  if (otpRecord?.consultant_id) {
    const { data: invByConsultant } = await supabaseAdmin
      .from('consultant_invitations')
      .select('*')
      .eq('consultant_id', otpRecord.consultant_id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invByConsultant) {
      invitation = invByConsultant as InvitationRecord;
    }
  }

  if (!invitation && email && otpRecord?.practitioner_id) {
    const { data: invByEmailPractitioner } = await supabaseAdmin
      .from('consultant_invitations')
      .select('*')
      .eq('email', email)
      .eq('practitioner_id', otpRecord.practitioner_id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invByEmailPractitioner) {
      invitation = invByEmailPractitioner as InvitationRecord;
    }
  }

  if (!invitation && email) {
    const { data: invByEmail } = await supabaseAdmin
      .from('consultant_invitations')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invByEmail) {
      invitation = invByEmail as InvitationRecord;
    }
  }

  if (!invitation && otpRecord?.code) {
    const { data: invByCode } = await supabaseAdmin
      .from('consultant_invitations')
      .select('*')
      .eq('invitation_code', otpRecord.code)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invByCode) {
      invitation = invByCode as InvitationRecord;
    }
  }

  return invitation;
}

async function resolveConsultantId(
  otpRecord: any,
  invitation: InvitationRecord | null,
  email: string | null
) {
  const supabaseAdmin = getSupabaseAdmin();

  if (otpRecord?.consultant_id) {
    return otpRecord.consultant_id as string;
  }

  if (invitation?.consultant_id) {
    return invitation.consultant_id;
  }

  if (email) {
    const { data: consultantByEmail } = await supabaseAdmin
      .from('consultants')
      .select('id')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (consultantByEmail?.id) {
      return consultantByEmail.id as string;
    }
  }

  return null;
}

async function findUserByEmail(email: string) {
  const supabaseAdmin = getSupabaseAdmin();
  let page = 1;
  const perPage = 1000;

  while (page) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return { user: null, error };
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (match) {
      return { user: match, error: null };
    }

    if (!data.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return { user: null, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FinalizeAuthRequest;
    const otpCodeOrOtpId = String(body.otpCodeOrOtpId || '').trim();
    const newPassword = String(body.newPassword || '');
    const requestedEmail = normalizeEmail(body.email);

    if (!otpCodeOrOtpId || !newPassword) {
      return NextResponse.json(
        { ok: false, message: 'Données manquantes' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();

    let otpQuery = supabaseAdmin
      .from('otp_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (isSixDigitCode(otpCodeOrOtpId)) {
      otpQuery = otpQuery
        .eq('code', otpCodeOrOtpId)
        .eq('used', false)
        .eq('type', 'activation')
        .gt('expires_at', now);
    } else {
      otpQuery = otpQuery.eq('id', otpCodeOrOtpId);
    }

    const { data: otpRecord, error: otpError } = await otpQuery.maybeSingle();

    if (otpError || !otpRecord) {
      console.error('[auth] finalize-auth: OTP introuvable ou invalide', otpError);
      return NextResponse.json(
        { ok: false, message: 'Code OTP invalide ou expiré' },
        { status: 400 }
      );
    }

    const otpEmail = normalizeEmail(otpRecord.email);
    const email = requestedEmail ?? otpEmail;

    if (!email) {
      return NextResponse.json(
        { ok: false, message: 'Email manquant pour finaliser le compte' },
        { status: 400 }
      );
    }

    if (requestedEmail && otpEmail && requestedEmail !== otpEmail) {
      return NextResponse.json(
        { ok: false, message: 'Email ne correspond pas au code OTP' },
        { status: 400 }
      );
    }

    const invitation = await resolveInvitation(otpRecord, email);
    const consultantId = await resolveConsultantId(otpRecord, invitation, email);

    console.log('[auth] FINALIZE AUTH');
    console.log('   Email:', email);
    console.log('   OTP ID:', otpRecord.id);
    console.log('   Consultant ID:', consultantId);
    console.log('   Invitation ID:', invitation?.id ?? null);

    // Ensure the consultant row exists in the consultants table.
    // A membership may reference a consultant_id that was never inserted (or was deleted).
    // Consultant creation is MANDATORY – we must never leave an orphan membership.
    if (consultantId) {
      console.log('[auth] finalize-auth: checking consultant row...');

      const { data: existingConsultant } = await supabaseAdmin
        .from('consultants')
        .select('id, activated, practitioner_id')
        .eq('id', consultantId)
        .maybeSingle();

      if (!existingConsultant) {
        console.warn('[auth] finalize-auth: consultant row missing for', consultantId, '- creating it');

        const consultantName =
          invitation?.full_name ||
          [invitation?.first_name, invitation?.last_name].filter(Boolean).join(' ') ||
          email.split('@')[0];

        // Resolve practitioner_id with fallback to first practitioner in DB
        let practitionerId: string | null =
          invitation?.practitioner_id || otpRecord.practitioner_id || null;

        if (!practitionerId) {
          console.warn('[auth] finalize-auth: no practitioner_id in invitation/OTP, looking up first practitioner...');
          const { data: practitioners } = await supabaseAdmin
            .from('practitioners')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1);

          practitionerId = practitioners?.[0]?.id || null;

          if (!practitionerId) {
            console.error('[auth] finalize-auth: no practitioner exists in database');
            return NextResponse.json(
              { ok: false, message: 'Configuration invalide : aucun praticien disponible' },
              { status: 500 }
            );
          }

          console.log('[auth] finalize-auth: default practitioner assigned:', practitionerId);
        }

        const { data: newConsultant, error: createConsultantError } = await supabaseAdmin
          .from('consultants')
          .insert({
            id: consultantId,
            email,
            name: consultantName,
            practitioner_id: practitionerId,
            status: 'standard',
            is_premium: false,
            activated: true,
            activated_at: now,
          })
          .select()
          .single();

        if (createConsultantError) {
          console.error('[auth] finalize-auth: failed to create consultant row', createConsultantError);
          return NextResponse.json(
            { ok: false, message: 'Erreur lors de la création du profil consultant' },
            { status: 500 }
          );
        }

        console.log('[auth] finalize-auth: consultant created and activated:', newConsultant.name, newConsultant.email);
      } else {
        console.log('[auth] finalize-auth: consultant already exists:', existingConsultant.id);

        // Auto-fix: activate consultant if not activated
        if (!existingConsultant.activated) {
          console.log('[auth] finalize-auth: consultant not activated, activating...');
          await supabaseAdmin
            .from('consultants')
            .update({ activated: true, activated_at: now })
            .eq('id', consultantId);
          console.log('[auth] finalize-auth: consultant activated');
        }

        // Auto-fix: assign practitioner if missing
        if (!existingConsultant.practitioner_id) {
          console.log('[auth] finalize-auth: no practitioner assigned, assigning...');
          let fallbackPractitionerId = invitation?.practitioner_id || otpRecord.practitioner_id || null;

          // FALLBACK: first practitioner in DB
          if (!fallbackPractitionerId) {
            console.warn('[auth] finalize-auth: no practitioner in invitation/OTP for existing consultant, using fallback...');
            const { data: fallbackPractitioners } = await supabaseAdmin
              .from('practitioners')
              .select('id')
              .order('created_at', { ascending: true })
              .limit(1);

            fallbackPractitionerId = fallbackPractitioners?.[0]?.id || null;
          }

          if (fallbackPractitionerId) {
            await supabaseAdmin
              .from('consultants')
              .update({ practitioner_id: fallbackPractitionerId })
              .eq('id', consultantId);
            console.log('[auth] finalize-auth: practitioner assigned:', fallbackPractitionerId);
          } else {
            console.error('[auth] finalize-auth: CRITICAL - No practitioner available for existing consultant');
          }
        }
      }
    }

    const { user: userLookup, error: userLookupError } =
      await findUserByEmail(email);

    if (userLookupError) {
      console.error('[auth] finalize-auth: user lookup error', userLookupError);
      return NextResponse.json(
        { ok: false, message: 'Erreur lors de la recherche utilisateur' },
        { status: 500 }
      );
    }

    let userId = userLookup?.id ?? null;

    if (!userId) {
      console.warn('[auth] finalize-auth: aucun user trouve, creation optionnelle');
      const { data: createdUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true,
        });

      if (createError) {
        console.error('[auth] finalize-auth: create user error', createError);
        return NextResponse.json(
          { ok: false, message: 'Erreur lors de la création du compte' },
          { status: 500 }
        );
      }

      userId = createdUser.user?.id ?? null;
    } else {
      console.log('[auth] finalize-auth: user trouve', userId);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('[auth] finalize-auth: update password error', updateError);
        return NextResponse.json(
          { ok: false, message: 'Erreur lors de la mise à jour du mot de passe' },
          { status: 500 }
        );
      }

      console.log('[auth] finalize-auth: mot de passe mis a jour');
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: 'Impossible de finaliser le compte' },
        { status: 500 }
      );
    }

    if (consultantId) {
      const { data: membership } = await supabaseAdmin
        .from('consultant_memberships')
        .select('id, consultant_user_id')
        .eq('consultant_id', consultantId)
        .maybeSingle();

      if (!membership) {
        const { error: membershipError } = await supabaseAdmin
          .from('consultant_memberships')
          .insert({
            consultant_id: consultantId,
            consultant_user_id: userId,
          });

        if (membershipError) {
          console.error('[auth] finalize-auth: create membership error', membershipError);
          return NextResponse.json(
            { ok: false, message: 'Erreur lors de la création du lien consultant' },
            { status: 500 }
          );
        }

        console.log('[auth] finalize-auth: membership cree');
      } else if (membership.consultant_user_id !== userId) {
        const { error: membershipUpdateError } = await supabaseAdmin
          .from('consultant_memberships')
          .update({ consultant_user_id: userId })
          .eq('id', membership.id);

        if (membershipUpdateError) {
          console.error('[auth] finalize-auth: update membership error', membershipUpdateError);
          return NextResponse.json(
            { ok: false, message: 'Erreur lors de la mise à jour du lien consultant' },
            { status: 500 }
          );
        }

        console.log('[auth] finalize-auth: membership mis a jour');
      } else {
        console.log('[auth] finalize-auth: membership deja correct');
      }
    }

    if (invitation?.id && !String(invitation.id).startsWith('virtual-')) {
      const { error: inviteUpdateError } = await supabaseAdmin
        .from('consultant_invitations')
        .update({ status: 'accepted', accepted_at: now })
        .eq('id', invitation.id);

      if (inviteUpdateError) {
        console.warn('[auth] finalize-auth: invitation update error', inviteUpdateError);
      }
    }

    if (!otpRecord.used) {
      const { error: otpUpdateError } = await supabaseAdmin
        .from('otp_codes')
        .update({ used: true, used_at: now })
        .eq('id', otpRecord.id);

      if (otpUpdateError) {
        console.warn('[auth] finalize-auth: otp update error', otpUpdateError);
      }
    }

    console.log('[auth] finalize-auth: termine pour', email, userId);

    return NextResponse.json({
      ok: true,
      userId,
      consultantId,
      email,
      otpId: otpRecord.id,
    });
  } catch (error) {
    console.error('[auth] finalize-auth: exception', error);
    return NextResponse.json(
      { ok: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
