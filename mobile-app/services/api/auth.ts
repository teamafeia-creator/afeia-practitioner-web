import { apiClient } from './client';
import { secureStorage } from '../storage/secureStore';
import type {
  APIResponse,
  AuthTokens,
  Patient,
  LoginCredentials,
  RegisterPayload,
  OTPVerification
} from '../../types';

// Service d'authentification AFEIA

export const authService = {
  // Vérifier le code OTP d'invitation
  async verifyOTP(code: string): Promise<APIResponse<{ valid: boolean; email?: string }>> {
    try {
      console.log('✅ API Call: verifyOTP', { code });
      const { data } = await apiClient.post('/auth/verify-otp', { code });
      return data;
    } catch (error: any) {
      console.error('❌ verifyOTP Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Créer un compte
  async register(payload: RegisterPayload): Promise<APIResponse<{ tokens: AuthTokens; patient: Patient }>> {
    try {
      console.log('✅ API Call: register', { email: payload.email });
      const { data } = await apiClient.post('/auth/register', payload);

      if (data.success && data.data) {
        // Stocker les tokens
        await secureStorage.setAccessToken(data.data.tokens.accessToken);
        if (data.data.tokens.refreshToken) {
          await secureStorage.setRefreshToken(data.data.tokens.refreshToken);
        }
        // Stocker les données patient
        await secureStorage.setUserData(data.data.patient);
      }

      return data;
    } catch (error: any) {
      console.error('❌ register Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Connexion
  async login(credentials: LoginCredentials): Promise<APIResponse<{ tokens: AuthTokens; patient: Patient }>> {
    try {
      console.log('✅ API Call: login', { email: credentials.email });
      const { data } = await apiClient.post('/auth/login', credentials);

      if (data.success && data.data) {
        // Stocker les tokens
        await secureStorage.setAccessToken(data.data.tokens.accessToken);
        if (data.data.tokens.refreshToken) {
          await secureStorage.setRefreshToken(data.data.tokens.refreshToken);
        }
        // Stocker les données patient
        await secureStorage.setUserData(data.data.patient);
      }

      return data;
    } catch (error: any) {
      console.error('❌ login Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Déconnexion
  async logout(): Promise<void> {
    try {
      console.log('✅ API Call: logout');
      // Appeler l'API de déconnexion si nécessaire
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.log('⚠️ Logout API call failed, clearing local data anyway');
    } finally {
      // Toujours nettoyer les données locales
      await secureStorage.clearAuth();
    }
  },

  // Récupérer le profil utilisateur
  async getProfile(): Promise<APIResponse<Patient>> {
    try {
      console.log('✅ API Call: getProfile');
      const { data } = await apiClient.get('/auth/profile');

      if (data.success && data.data) {
        await secureStorage.setUserData(data.data);
      }

      return data;
    } catch (error: any) {
      console.error('❌ getProfile Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Vérifier si l'utilisateur est authentifié
  async checkAuth(): Promise<boolean> {
    return secureStorage.isAuthenticated();
  },

  // Récupérer les données utilisateur stockées localement
  async getStoredUser(): Promise<Patient | null> {
    return secureStorage.getUserData<Patient>();
  },
};

export default authService;
