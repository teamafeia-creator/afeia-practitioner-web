import { supabase } from '../lib/supabaseClient';
import { getErrorMessage } from '../lib/errors';
import type { NewPatient, Patient } from '../lib/patients/types';

const AUTH_REQUIRED_MESSAGE = 'Vous devez être connecté pour accéder aux patients.';

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data.user) {
    throw new Error(AUTH_REQUIRED_MESSAGE);
  }

  return data.user.id;
}

export async function listMyPatients(): Promise<Patient[]> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('practitioner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data ?? [];
}

export async function createPatient(values: NewPatient): Promise<Patient> {
  const userId = await getAuthenticatedUserId();
  const payload = {
    ...values,
    practitioner_id: userId
  };

  const { data, error } = await supabase
    .from('patients')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    throw new Error('Création du patient impossible.');
  }

  return data;
}
