import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '../types';

const TOKENS_KEY = 'afeia_tokens';
const CONSULTANT_KEY = 'afeia_consultant';

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
  await SecureStore.deleteItemAsync(CONSULTANT_KEY);
}

export async function getStoredConsultant(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await SecureStore.getItemAsync(CONSULTANT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredConsultant(consultant: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(CONSULTANT_KEY, JSON.stringify(consultant));
}
