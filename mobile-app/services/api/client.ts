/**
 * API Client for AFEIA Mobile App
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { TokenStorage } from '../storage/secureStore';
import type { ApiError } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/mobile';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Subscribe to token refresh
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers that token has been refreshed
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await TokenStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken,
    });

    const { accessToken } = response.data;
    await TokenStorage.setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    // Clear tokens on refresh failure
    await TokenStorage.clearTokens();
    return null;
  }
}

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Check if this is a 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for auth endpoints
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/verify-otp') ||
        originalRequest.url?.includes('/auth/refresh-token')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the token to be refreshed
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          onTokenRefreshed(newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        } else {
          // Token refresh failed - user needs to login again
          return Promise.reject(error);
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Format API error for display
 */
export function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
    if (error.response?.status === 401) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    if (error.response?.status === 403) {
      return 'Accès non autorisé.';
    }
    if (error.response?.status === 404) {
      return 'Ressource non trouvée.';
    }
    if (error.response?.status === 429) {
      return 'Trop de requêtes. Veuillez réessayer dans quelques instants.';
    }
    if (error.response?.status && error.response.status >= 500) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'La requête a pris trop de temps. Vérifiez votre connexion.';
    }
    if (error.message === 'Network Error') {
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    }
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.message === 'Network Error' || error.code === 'ECONNABORTED';
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401;
  }
  return false;
}

export default apiClient;
