import { supabase } from '../lib/supabase';

export function generateInviteToken() {
  if (typeof crypto === 'undefined') {
    throw new Error('Le navigateur ne supporte pas la génération de token sécurisée.');
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createPatientInvite({
  practitionerId,
  patientId,
  token,
  expiresAt,
  email
}: {
  practitionerId: string;
  patientId: string;
  token: string;
  expiresAt: string;
  email?: string;
}) {
  let inviteEmail = email?.trim() ?? '';

  if (!inviteEmail) {
    const { data, error } = await supabase
      .from('patients')
      .select('email')
      .eq('id', patientId)
      .single();

    if (error) {
      throw new Error('Impossible de récupérer l’email du patient.');
    }

    inviteEmail = data?.email?.trim() ?? '';
  }

  if (!inviteEmail) {
    throw new Error('Un email valide est requis pour créer une invitation patient.');
  }

  const { error } = await supabase.from('patient_invites').insert({
    practitioner_id: practitionerId,
    patient_id: patientId,
    token,
    expires_at: expiresAt,
    email: inviteEmail
  });

  if (error) {
    throw new Error('Impossible de créer le lien d\'invitation.');
  }
}

export async function claimPatientInvite(token: string) {
  const { data, error } = await supabase.rpc('claim_patient_invite', { token });

  if (error) {
    throw new Error(error.message ?? 'Impossible de valider le lien d\'invitation.');
  }

  return data as string;
}
