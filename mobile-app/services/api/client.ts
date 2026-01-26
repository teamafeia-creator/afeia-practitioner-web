import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../../constants/Config';
import { secureStorage } from '../storage/secureStore';

// Client API Axios configuré pour AFEIA

const API_URL = Config.API_URL;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: Config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Intercepteur de requête - Ajoute le token d'authentification
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('✅ API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur de réponse - Gestion des erreurs
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    console.error('❌ API Error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      data: error.response?.data,
      message: error.message,
    });

    // Si erreur 401 (non autorisé), on pourrait tenter un refresh token
    if (error.response?.status === 401) {
      // TODO: Implémenter le refresh token
      // Pour l'instant, on redirige vers la déconnexion
      await secureStorage.clearAuth();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
