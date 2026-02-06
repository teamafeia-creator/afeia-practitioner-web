import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '../types';

const TOKENS_KEY = 'afeia_tokens';
const PATIENT_KEY = 'afeia_patient';

export async function getTokens(): Promise<AuthTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
  await SecureStore.deleteItemAsync(PATIENT_KEY);
}

export async function getStoredPatient(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await SecureStore.getItemAsync(PATIENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredPatient(patient: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient));
}
