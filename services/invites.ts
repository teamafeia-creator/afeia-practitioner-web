import { supabase } from '../lib/supabase';

export async function generateInviteToken() {
  const response = await fetch('/api/invites/token', { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Impossible de générer un token sécurisé.');
  }
  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    throw new Error('Token invalide.');
  }
  return data.token;
}

export async function createPatientInvite({
  practitionerId,
  patientId,
  token,
  expiresAt,
  email
}: {
  practitionerId?: string;
  patientId: string;
  token: string;
  expiresAt?: string;
  email?: string;
}) {
  let resolvedPractitionerId = practitionerId;
  if (!resolvedPractitionerId) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error('Veuillez vous reconnecter pour envoyer l’invitation.');
    }
    resolvedPractitionerId = data.user.id;
  }

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

  const payload: Record<string, string> = {
    practitioner_id: resolvedPractitionerId,
    patient_id: patientId,
    token,
    email: inviteEmail
  };

  if (expiresAt) {
    payload.expires_at = expiresAt;
  }

  const { error } = await supabase.from('patient_invites').insert(payload);

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
