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

export async function createConsultantInvite({
  practitionerId,
  consultantId,
  token,
  expiresAt,
  email
}: {
  practitionerId?: string;
  consultantId: string;
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
      .from('consultants')
      .select('email')
      .eq('id', consultantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error('Impossible de récupérer l’email du consultant.');
    }

    inviteEmail = data?.email?.trim() ?? '';
  }

  if (!inviteEmail) {
    throw new Error('Un email valide est requis pour créer une invitation consultant.');
  }

  const payload: Record<string, string> = {
    practitioner_id: resolvedPractitionerId,
    consultant_id: consultantId,
    token,
    email: inviteEmail
  };

  if (expiresAt) {
    payload.expires_at = expiresAt;
  }

  const { error } = await supabase.from('consultant_invites').insert(payload);

  if (error) {
    throw new Error(error.message ?? 'Impossible de créer le lien d\'invitation.');
  }
}

export async function claimConsultantInvite(token: string) {
  const { data, error } = await supabase.rpc('claim_consultant_invite', { token });

  if (error) {
    throw new Error(error.message ?? 'Impossible de valider le lien d\'invitation.');
  }

  return data as string;
}
