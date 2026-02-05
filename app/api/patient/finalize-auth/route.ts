import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type FinalizeAuthRequest = {
  email?: string | null;
  newPassword?: string | null;
  otpCodeOrOtpId?: string | null;
};

type InvitationRecord = {
  id?: string | number | null;
  patient_id?: string | null;
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

  if (otpRecord?.patient_id) {
    const { data: invByPatient } = await supabaseAdmin
      .from('patient_invitations')
      .select('*')
      .eq('patient_id', otpRecord.patient_id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invByPatient) {
      invitation = invByPatient as InvitationRecord;
    }
  }

  if (!invitation && email && otpRecord?.practitioner_id) {
    const { data: invByEmailPractitioner } = await supabaseAdmin
      .from('patient_invitations')
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
      .from('patient_invitations')
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
      .from('patient_invitations')
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

async function resolvePatientId(
  otpRecord: any,
  invitation: InvitationRecord | null,
  email: string | null
) {
  const supabaseAdmin = getSupabaseAdmin();

  if (otpRecord?.patient_id) {
    return otpRecord.patient_id as string;
  }

  if (invitation?.patient_id) {
    return invitation.patient_id;
  }

  if (email) {
    const { data: patientByEmail } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (patientByEmail?.id) {
      return patientByEmail.id as string;
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
      console.error('❌ finalize-auth: OTP introuvable ou invalide', otpError);
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
    const patientId = await resolvePatientId(otpRecord, invitation, email);

    console.log('═══════════════════════════════════════');
    console.log('🔐 FINALIZE AUTH');
    console.log('   Email:', email);
    console.log('   OTP ID:', otpRecord.id);
    console.log('   Patient ID:', patientId);
    console.log('   Invitation ID:', invitation?.id ?? null);

    // Ensure the patient row exists in the patients table.
    // A membership may reference a patient_id that was never inserted (or was deleted).
    if (patientId) {
      const { data: existingPatient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .maybeSingle();

      if (!existingPatient) {
        console.warn('⚠️ finalize-auth: patient row missing for', patientId, '– creating it');

        const patientName =
          invitation?.full_name ||
          [invitation?.first_name, invitation?.last_name].filter(Boolean).join(' ') ||
          email.split('@')[0];

        const practitionerId =
          invitation?.practitioner_id || otpRecord.practitioner_id || null;

        if (practitionerId) {
          const { error: createPatientError } = await supabaseAdmin
            .from('patients')
            .insert({
              id: patientId,
              email,
              name: patientName,
              practitioner_id: practitionerId,
              status: 'standard',
              is_premium: false,
            });

          if (createPatientError) {
            console.error('❌ finalize-auth: failed to create patient row', createPatientError);
          } else {
            console.log('✅ finalize-auth: patient row created for', patientId);
          }
        } else {
          console.error('❌ finalize-auth: cannot create patient row – no practitioner_id available');
        }
      }
    }

    const { user: userLookup, error: userLookupError } =
      await findUserByEmail(email);

    if (userLookupError) {
      console.error('❌ finalize-auth: user lookup error', userLookupError);
      return NextResponse.json(
        { ok: false, message: 'Erreur lors de la recherche utilisateur' },
        { status: 500 }
      );
    }

    let userId = userLookup?.id ?? null;

    if (!userId) {
      console.warn('⚠️ finalize-auth: aucun user trouvé, création optionnelle');
      const { data: createdUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true,
        });

      if (createError) {
        console.error('❌ finalize-auth: create user error', createError);
        return NextResponse.json(
          { ok: false, message: 'Erreur lors de la création du compte' },
          { status: 500 }
        );
      }

      userId = createdUser.user?.id ?? null;
    } else {
      console.log('✅ finalize-auth: user trouvé', userId);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('❌ finalize-auth: update password error', updateError);
        return NextResponse.json(
          { ok: false, message: 'Erreur lors de la mise à jour du mot de passe' },
          { status: 500 }
        );
      }

      console.log('✅ finalize-auth: mot de passe mis à jour');
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: 'Impossible de finaliser le compte' },
        { status: 500 }
      );
    }

    if (patientId) {
      const { data: membership } = await supabaseAdmin
        .from('patient_memberships')
        .select('id, patient_user_id')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (!membership) {
        const { error: membershipError } = await supabaseAdmin
          .from('patient_memberships')
          .insert({
            patient_id: patientId,
            patient_user_id: userId,
          });

        if (membershipError) {
          console.error('❌ finalize-auth: create membership error', membershipError);
          return NextResponse.json(
            { ok: false, message: 'Erreur lors de la création du lien patient' },
            { status: 500 }
          );
        }

        console.log('✅ finalize-auth: membership créé');
      } else if (membership.patient_user_id !== userId) {
        const { error: membershipUpdateError } = await supabaseAdmin
          .from('patient_memberships')
          .update({ patient_user_id: userId })
          .eq('id', membership.id);

        if (membershipUpdateError) {
          console.error('❌ finalize-auth: update membership error', membershipUpdateError);
          return NextResponse.json(
            { ok: false, message: 'Erreur lors de la mise à jour du lien patient' },
            { status: 500 }
          );
        }

        console.log('✅ finalize-auth: membership mis à jour');
      } else {
        console.log('✅ finalize-auth: membership déjà correct');
      }
    }

    if (invitation?.id && !String(invitation.id).startsWith('virtual-')) {
      const { error: inviteUpdateError } = await supabaseAdmin
        .from('patient_invitations')
        .update({ status: 'accepted', accepted_at: now })
        .eq('id', invitation.id);

      if (inviteUpdateError) {
        console.warn('⚠️ finalize-auth: invitation update error', inviteUpdateError);
      }
    }

    if (!otpRecord.used) {
      const { error: otpUpdateError } = await supabaseAdmin
        .from('otp_codes')
        .update({ used: true, used_at: now })
        .eq('id', otpRecord.id);

      if (otpUpdateError) {
        console.warn('⚠️ finalize-auth: otp update error', otpUpdateError);
      }
    }

    console.log('✅ finalize-auth: terminé pour', email, userId);
    console.log('═══════════════════════════════════════');

    return NextResponse.json({
      ok: true,
      userId,
      patientId,
      email,
      otpId: otpRecord.id,
    });
  } catch (error) {
    console.error('❌ finalize-auth: exception', error);
    return NextResponse.json(
      { ok: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
