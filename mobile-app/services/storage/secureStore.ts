/**
 * Secure Storage Service
 * Uses expo-secure-store for sensitive data (tokens)
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'afeia_access_token',
  REFRESH_TOKEN: 'afeia_refresh_token',
  PATIENT_ID: 'afeia_patient_id',
  ANAMNESE_DRAFT: 'afeia_anamnese_draft',
  JOURNAL_DRAFT: 'afeia_journal_draft',
} as const;

// SecureStore options
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Web fallback using localStorage (less secure but necessary for web/dev)
const webStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  deleteItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

// Helper to determine if we're on web
const isWeb = Platform.OS === 'web';

/**
 * Get a value from secure storage
 */
export async function getSecureValue(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      return webStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key, options);
  } catch (error) {
    console.error(`Error getting secure value for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in secure storage
 */
export async function setSecureValue(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      webStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, options);
  } catch (error) {
    console.error(`Error setting secure value for key ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a value from secure storage
 */
export async function deleteSecureValue(key: string): Promise<void> {
  try {
    if (isWeb) {
      webStorage.deleteItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key, options);
  } catch (error) {
    console.error(`Error deleting secure value for key ${key}:`, error);
  }
}

// Token Management
export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return getSecureValue(KEYS.ACCESS_TOKEN);
  },

  async setAccessToken(token: string): Promise<void> {
    return setSecureValue(KEYS.ACCESS_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return getSecureValue(KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    return setSecureValue(KEYS.REFRESH_TOKEN, token);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      setSecureValue(KEYS.ACCESS_TOKEN, accessToken),
      setSecureValue(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      deleteSecureValue(KEYS.ACCESS_TOKEN),
      deleteSecureValue(KEYS.REFRESH_TOKEN),
    ]);
  },

  async getPatientId(): Promise<string | null> {
    return getSecureValue(KEYS.PATIENT_ID);
  },

  async setPatientId(id: string): Promise<void> {
    return setSecureValue(KEYS.PATIENT_ID, id);
  },

  async clearPatientId(): Promise<void> {
    return deleteSecureValue(KEYS.PATIENT_ID);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      deleteSecureValue(KEYS.ACCESS_TOKEN),
      deleteSecureValue(KEYS.REFRESH_TOKEN),
      deleteSecureValue(KEYS.PATIENT_ID),
      deleteSecureValue(KEYS.ANAMNESE_DRAFT),
      deleteSecureValue(KEYS.JOURNAL_DRAFT),
    ]);
  },
};

// Draft Storage (for anamnese and journal)
export const DraftStorage = {
  async getAnamneseDraft(): Promise<string | null> {
    return getSecureValue(KEYS.ANAMNESE_DRAFT);
  },

  async setAnamneseDraft(data: string): Promise<void> {
    return setSecureValue(KEYS.ANAMNESE_DRAFT, data);
  },

  async clearAnamneseDraft(): Promise<void> {
    return deleteSecureValue(KEYS.ANAMNESE_DRAFT);
  },

  async getJournalDraft(): Promise<string | null> {
    return getSecureValue(KEYS.JOURNAL_DRAFT);
  },

  async setJournalDraft(data: string): Promise<void> {
    return setSecureValue(KEYS.JOURNAL_DRAFT, data);
  },

  async clearJournalDraft(): Promise<void> {
    return deleteSecureValue(KEYS.JOURNAL_DRAFT);
  },
};
