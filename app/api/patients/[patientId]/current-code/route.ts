import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';

/**
 * API Route pour recuperer le code d'activation actuel d'un patient
 *
 * GET /api/patients/[patientId]/current-code
 *
 * Retourne le code OTP actuel (non expire, non utilise) pour ce patient.
 * Verifie que le praticien connecte est bien le proprietaire du patient.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // 1. Verifier l'authentification
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    // 2. Verifier que le patient appartient a ce praticien
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, email, practitioner_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient non trouve.' }, { status: 404 });
    }

    if (patient.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 });
    }

    if (!patient.email) {
      return NextResponse.json({ code: null, message: 'Patient sans email.' });
    }

    // 3. Recuperer le code OTP actuel
    const { data: otpCode } = await supabase
      .from('otp_codes')
      .select('code, expires_at, created_at')
      .eq('email', patient.email.toLowerCase())
      .eq('used', false)
      .eq('type', 'activation')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpCode) {
      return NextResponse.json({
        code: otpCode.code,
        expiresAt: otpCode.expires_at,
        createdAt: otpCode.created_at
      });
    }

    // 4. Fallback: chercher dans patient_invitations
    const { data: invitation } = await supabase
      .from('patient_invitations')
      .select('invitation_code, code_expires_at, invited_at')
      .eq('email', patient.email.toLowerCase())
      .eq('practitioner_id', practitionerId)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invitation?.invitation_code) {
      // Verifier si le code n'est pas expire
      const expiresAt = invitation.code_expires_at
        ? new Date(invitation.code_expires_at)
        : null;

      if (!expiresAt || expiresAt > new Date()) {
        return NextResponse.json({
          code: invitation.invitation_code,
          expiresAt: invitation.code_expires_at,
          createdAt: invitation.invited_at
        });
      }
    }

    // Aucun code valide trouve
    return NextResponse.json({ code: null });
  } catch (err) {
    console.error('Erreur current-code:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
