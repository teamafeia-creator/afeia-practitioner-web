import { supabase } from '../lib/supabase';

export type SendQuestionnaireCodeResponse = {
  ok: boolean;
  expiresAt: string;
  sentToEmail: string;
};

export async function sendQuestionnaireCode(
  patientId: string
): Promise<SendQuestionnaireCodeResponse> {
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

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Erreur lors de l’envoi.';
    throw new Error(message);
  }

  if (!isSendQuestionnaireCodeResponse(payload)) {
    throw new Error('Erreur lors de l’envoi.');
  }

  return payload;
}

function isSendQuestionnaireCodeResponse(
  payload: unknown
): payload is SendQuestionnaireCodeResponse {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'ok' in payload &&
      (payload as SendQuestionnaireCodeResponse).ok === true &&
      'expiresAt' in payload &&
      typeof (payload as SendQuestionnaireCodeResponse).expiresAt === 'string' &&
      'sentToEmail' in payload &&
      typeof (payload as SendQuestionnaireCodeResponse).sentToEmail === 'string'
  );
}
