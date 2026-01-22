import { supabase } from '../lib/supabase';

type SendQuestionnaireCodeResponse = {
  ok: boolean;
  expiresAt: string;
  sentToEmail: string;
};

export async function sendQuestionnaireCode(patientId: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Veuillez vous reconnecter pour envoyer le code.');
  }

  const response = await fetch(`/api/patients/${patientId}/questionnaire/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`
    }
  });

  const payload = (await response.json().catch(() => null)) as
    | SendQuestionnaireCodeResponse
    | { error?: string }
    | null;

  if (!response.ok || !payload || 'error' in payload) {
    throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'Erreur lors de l’envoi.');
  }

  return payload;
}
