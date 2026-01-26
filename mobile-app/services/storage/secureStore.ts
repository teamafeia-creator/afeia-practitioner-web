import * as SecureStore from 'expo-secure-store';
import { Config } from '../../constants/Config';

// Service de stockage sécurisé pour tokens et données sensibles

export const secureStorage = {
  // Stocker une valeur
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      console.log('✅ SecureStore: Saved', key);
    } catch (error) {
      console.error('❌ SecureStore setItem error:', error);
      throw error;
    }
  },

  // Récupérer une valeur
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value;
    } catch (error) {
      console.error('❌ SecureStore getItem error:', error);
      return null;
    }
  },

  // Supprimer une valeur
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log('✅ SecureStore: Removed', key);
    } catch (error) {
      console.error('❌ SecureStore removeItem error:', error);
    }
  },

  // Méthodes spécifiques pour les tokens
  async setAccessToken(token: string): Promise<void> {
    await this.setItem(Config.STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  async getAccessToken(): Promise<string | null> {
    return this.getItem(Config.STORAGE_KEYS.ACCESS_TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    await this.setItem(Config.STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return this.getItem(Config.STORAGE_KEYS.REFRESH_TOKEN);
  },

  // Stocker les données utilisateur (JSON)
  async setUserData(data: object): Promise<void> {
    await this.setItem(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(data));
  },

  async getUserData<T>(): Promise<T | null> {
    const data = await this.getItem(Config.STORAGE_KEYS.USER_DATA);
    if (data) {
      try {
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    }
    return null;
  },

  // Nettoyer tout le stockage auth
  async clearAuth(): Promise<void> {
    await Promise.all([
      this.removeItem(Config.STORAGE_KEYS.ACCESS_TOKEN),
      this.removeItem(Config.STORAGE_KEYS.REFRESH_TOKEN),
      this.removeItem(Config.STORAGE_KEYS.USER_DATA),
    ]);
    console.log('✅ SecureStore: Auth data cleared');
  },

  // Vérifier si l'utilisateur est connecté
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  },
};

export default secureStorage;
