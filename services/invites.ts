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
  expiresAt
}: {
  practitionerId: string;
  patientId: string;
  token: string;
  expiresAt: string;
}) {
  const { error } = await supabase.from('patient_invites').insert({
    practitioner_id: practitionerId,
    patient_id: patientId,
    token,
    expires_at: expiresAt
  });

  if (error) {
    throw new Error(error.message ?? 'Impossible de créer le lien d\'invitation.');
  }
}

export async function claimPatientInvite(token: string) {
  const { data, error } = await supabase.rpc('claim_patient_invite', { token });

  if (error) {
    throw new Error(error.message ?? 'Impossible de valider le lien d\'invitation.');
  }

  return data as string;
}
